const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const log = require('../logger');
const { 
    User, Subscription, PasswordReset, EmailVerify, Partner, PartnerReferral, 
    PolicyAcceptance, getOrCreateSubscription 
} = require('../models');
const { sanitizeEmail, sanitizeString } = require('../utils/sanitizers');
const { validatePassword } = require('../utils/validators');
const { safeErrorMessage, getBaseUrl, getUserSubscription } = require('../utils/helpers');
const { getCurrentPolicies, getPolicy, getRequiredVersions, REQUIRED_POLICY_SLUGS } = require('../policies-content');

const JWT_SECRET = process.env.JWT_SECRET;
const PARTNER_EXPIRY_DAYS = 3650;

/**
 * Handle user registration
 */
async function register(req, res) {
    try {
        let { email, password, name, rnc, profession, plan, referralCode, suggestedName, acceptedPolicyVersions, isPartnerRegistration, inviteToken } = req.body;
        email = sanitizeEmail(email);

        log.info({ action: 'register', email }, 'Registrando usuario');

        // === VALIDACIONES ===
        if (process.env.BLOCK_DISPOSABLE_EMAILS !== 'false') {
            const disposableDomains = ['mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'throwaway.email', 'fakeinbox.com', 'trashmail.com', 'yopmail.com', 'getnada.com', 'mailnesia.com', 'temp-mail.org', 'maildrop.cc', 'sharklasers.com', 'guerrillamail.info', 'grr.la', 'discard.email', 'dispostable.com', 'mailinator2.com', 'inboxkitten.com', 'minuteinbox.com'];
            const domain = (email.split('@')[1] || '').toLowerCase();
            if (disposableDomains.some(d => domain === d || domain.endsWith('.' + d))) {
                return res.status(400).json({ message: 'No se permiten correos temporales o desechables. Usa un correo profesional o personal real.' });
            }
        }

        // Un correo = una sola cuenta. No se puede ser partner y user (facturación) con el mismo correo.
        const existingUser = await User.findOne({ email: new RegExp('^' + email + '$', 'i') });
        if (existingUser) {
            if (existingUser.role === 'partner') {
                return res.status(400).json({
                    message: 'Este correo pertenece a una cuenta partner. No se puede usar el mismo correo para facturación. Inicia sesión para acceder al panel de partners.',
                    code: 'EMAIL_IS_PARTNER'
                });
            }
            return res.status(400).json({
                message: 'Este correo ya está registrado. Inicia sesión o usa "¿Olvidó su contraseña?" si no recuerdas tu acceso.',
                code: 'EMAIL_ALREADY_REGISTERED'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const isPartner = !!(isPartnerRegistration || inviteToken);
        const expiryDays = isPartner ? PARTNER_EXPIRY_DAYS : (plan === 'pro' ? 30 : 15);
        const status = isPartner ? 'Activo' : (plan === 'pro' ? 'Activo' : 'Trial');

        const newUser = new User({
            email, password: hashedPassword, name, rnc, profession,
            role: isPartner ? 'partner' : 'user',
            subscriptionStatus: status,
            expiryDate: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
            subscription: {
                plan: isPartner ? 'free' : (plan === 'pro' ? 'pro' : 'free'),
                status: 'active',
                startDate: new Date(),
                endDate: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
            },
            suggestedFiscalName: suggestedName || "",
            onboardingCompleted: false
        });

        await newUser.save();

        // === Políticas legales: registrar aceptación en registro ===
        if (acceptedPolicyVersions && typeof acceptedPolicyVersions === 'object') {
            const requiredVersions = getRequiredVersions();
            const ip = (req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '').toString().split(',')[0].trim().slice(0, 45);
            for (const slug of REQUIRED_POLICY_SLUGS) {
                const version = parseInt(acceptedPolicyVersions[slug], 10);
                if (requiredVersions[slug] != null && version === requiredVersions[slug]) {
                    try {
                        await PolicyAcceptance.create({
                            userId: newUser._id,
                            policySlug: slug,
                            policyVersion: version,
                            ip,
                            acceptedAt: new Date()
                        });
                    } catch (policyErr) {
                        if (policyErr.code !== 11000) log.warn({ err: policyErr.message }, 'Policy acceptance create');
                    }
                }
            }
        }

        // === PROGRAMA PARTNERS: Registrar referido si hay código válido ===
        if (referralCode) {
            try {
                const partner = await Partner.findOne({ referralCode: referralCode.toUpperCase(), status: 'active' });
                if (partner) {
                    await PartnerReferral.create({
                        partnerId: partner._id,
                        userId: newUser._id,
                        status: plan === 'pro' ? 'active' : 'trial',
                        subscribedAt: plan === 'pro' ? new Date() : null
                    });
                    log.info({ action: 'register', referralCode: referralCode.toUpperCase() }, 'Referido vinculado a partner');
                }
            } catch (refErr) {
                log.warn({ err: refErr.message }, 'Error vinculando referido');
            }
        }

        // === Verificación de correo ===
        const crypto = require('crypto');
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 h
        try {
            await EmailVerify.deleteMany({ userId: newUser._id });
            await EmailVerify.create({ userId: newUser._id, token: verificationToken, expiresAt: verifyExpiresAt });
            const baseUrl = getBaseUrl(req);
            const verifyUrl = `${baseUrl}/verificar-correo?token=${verificationToken}`;
            if (process.env.SEND_VERIFICATION_EMAIL !== 'false') {
                const mailer = require('../mailer');
                if (typeof mailer.sendVerificationEmail === 'function') await mailer.sendVerificationEmail(newUser.email, verifyUrl);
                else log.info({ email: newUser.email, verifyUrl }, 'Verificación (mailer.sendVerificationEmail no definido)');
            } else {
                log.info({ email: newUser.email, verifyUrl }, 'Verificación (SEND_VERIFICATION_EMAIL=false, URL en log para dev)');
            }
        } catch (verifyErr) {
            log.warn({ err: verifyErr && verifyErr.message }, 'No se pudo enviar email de verificación; usuario creado.');
        }

        const requiresVerification = process.env.REQUIRE_EMAIL_VERIFICATION === 'true';
        log.info({ action: 'register', success: true, isPartnerRegistration: !!isPartner }, 'Usuario creado');
        res.status(201).json({
            message: requiresVerification
                ? 'Usuario registrado. Revisa tu correo para verificar tu cuenta y poder iniciar sesión. Si no lo recibes, revisa spam o usa "Reenviar verificación" en la pantalla de login.'
                : 'Usuario registrado exitosamente.',
            plan: status,
            requiresEmailVerification: requiresVerification
        });
    } catch (error) {
        log.error({ err: error.message }, 'Error en registro');
        if (error.code === 11000) {
            return res.status(400).json({
                message: 'Este correo ya está registrado. Inicia sesión o usa "¿Olvidó su contraseña?" si no recuerdas tu acceso.',
                code: 'EMAIL_ALREADY_REGISTERED'
            });
        }
        res.status(500).json({ message: 'Error interno al crear el usuario', error: error.message });
    }
}

/**
 * Handle login logic
 */
async function login(req, res) {
    try {
        let { email, password } = req.body;
        email = sanitizeEmail(email);
        log.info({ action: 'login', email }, 'Intento de login');

        const user = await User.findOne({ email: new RegExp('^' + email + '$', 'i') });
        if (!user) {
            log.warn('Login fallido: usuario no encontrado');
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const passwordIsValid = await bcrypt.compare(password, user.password);
        if (!passwordIsValid) {
            log.warn('Login fallido: contraseña inválida');
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }
        if (user.blocked) {
            log.warn('Login fallido: cuenta bloqueada');
            return res.status(403).json({ message: 'Cuenta bloqueada. Contacte a soporte.', code: 'ACCOUNT_BLOCKED' });
        }

        // Requerir correo verificado
        const verificationCutoff = process.env.VERIFICATION_REQUIRED_AFTER ? new Date(process.env.VERIFICATION_REQUIRED_AFTER) : new Date('2030-01-01T00:00:00Z');
        const createdAt = user.createdAt ? new Date(user.createdAt) : new Date(0);
        if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && createdAt >= verificationCutoff && !user.emailVerified) {
            log.warn({ userId: user._id }, 'Login fallido: correo no verificado');
            return res.status(403).json({
                message: 'Debes verificar tu correo antes de iniciar sesión. Revisa tu bandeja (o spam) y haz clic en el enlace que te enviamos. Si no lo recibiste, usa "Reenviar verificación" en esta pantalla.',
                code: 'EMAIL_NOT_VERIFIED'
            });
        }

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: 3600 });

        await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

        const forwardedHost = (req.get('x-forwarded-host') || '').split(',')[0].trim();
        const cookieDomain = process.env.COOKIE_DOMAIN || (forwardedHost || null);
        const cookieOpts = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            maxAge: 3600 * 1000,
            path: '/'
        };
        if (cookieDomain) cookieOpts.domain = cookieDomain;
        res.cookie('trinalyze_auth', token, cookieOpts);

        const sub = getUserSubscription(user);
        let partner = null;
        const p = await Partner.findOne({ userId: user._id }).lean();
        if (p) partner = { referralCode: p.referralCode, status: p.status, tier: p.tier };
        log.info({ action: 'login', success: true }, 'Login exitoso');
        res.status(200).json({
            id: user._id,
            email: user.email,
            name: user.name,
            profession: user.profession,
            rnc: user.rnc,
            role: user.role || 'user',
            subscription: sub,
            fiscalStatus: {
                suggested: user.suggestedFiscalName,
                confirmed: user.confirmedFiscalName
            },
            partner
        });
    } catch (error) {
        log.error({ err: error.message }, 'Error en login');
        res.status(500).json({ message: safeErrorMessage(error) });
    }
}

/**
 * Handle forgot password request
 */
async function forgotPassword(req, res) {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(200).json({ message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.' });
        }
        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
        await PasswordReset.deleteMany({ userId: user._id });
        await PasswordReset.create({ userId: user._id, token, expiresAt });
        const baseUrl = getBaseUrl(req);
        const resetUrl = `${baseUrl}/restablecer-contrasena?token=${token}`;
        try {
            if (process.env.SEND_PASSWORD_RESET_EMAIL === 'true') {
                const mailer = require('../mailer');
                if (typeof mailer.sendPasswordReset === 'function') await mailer.sendPasswordReset(user.email, resetUrl);
                else log.info({ email: user.email, resetUrl }, 'Password reset (mailer.sendPasswordReset no definido)');
            } else {
                log.info({ email: user.email, resetUrl }, 'Password reset (email no enviado; configurar SEND_PASSWORD_RESET_EMAIL en dev usar URL del log)');
            }
        } catch (e) { log.warn({ err: (e && e.message) || 'mailer no disponible' }, 'Email reset no enviado'); }
        res.status(200).json({ message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.' });
    } catch (e) {
        log.error({ err: e.message }, 'Error forgot-password');
        res.status(500).json({ message: 'Error al procesar la solicitud.' });
    }
}

/**
 * Handle reset password with token
 */
async function resetPassword(req, res) {
    try {
        const { token, newPassword } = req.body;
        const reset = await PasswordReset.findOne({ token, usedAt: null });
        if (!reset) return res.status(400).json({ message: 'Enlace inválido o expirado.' });
        if (new Date() > reset.expiresAt) {
            await PasswordReset.deleteOne({ _id: reset._id });
            return res.status(400).json({ message: 'El enlace ha expirado. Solicita uno nuevo.' });
        }
        const user = await User.findById(reset.userId);
        if (!user) return res.status(400).json({ message: 'Usuario no encontrado.' });
        user.password = await bcrypt.hash(newPassword, 12);
        await user.save();
        reset.usedAt = new Date();
        await reset.save();
        log.info({ userId: user._id }, 'Contraseña restablecida');
        res.status(200).json({ message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
    } catch (e) {
        log.error({ err: e.message }, 'Error reset-password');
        res.status(500).json({ message: safeErrorMessage(e) });
    }
}

/**
 * Verify email with token
 */
async function verifyEmail(req, res) {
    try {
        const { token } = req.body;
        const ev = await EmailVerify.findOne({ token });
        if (!ev) return res.status(400).json({ message: 'Enlace inválido o expirado.' });
        if (new Date() > ev.expiresAt) {
            await EmailVerify.deleteOne({ _id: ev._id });
            return res.status(400).json({ message: 'El enlace ha expirado.' });
        }
        const user = await User.findByIdAndUpdate(ev.userId, { emailVerified: true }, { new: true });
        if (!user) return res.status(400).json({ message: 'Usuario no encontrado.' });
        await EmailVerify.deleteOne({ _id: ev._id });
        log.info({ userId: user._id }, 'Email verificado');
        res.status(200).json({ message: 'Correo verificado correctamente.' });
    } catch (e) {
        log.error({ err: e.message }, 'Error verify-email');
        res.status(500).json({ message: 'Error al verificar el correo.' });
    }
}

/**
 * Resend verification email
 */
async function resendVerifyEmail(req, res) {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(200).json({ message: 'Si el correo está registrado y sin verificar, recibirás un nuevo enlace.' });
        }
        if (user.emailVerified) {
            return res.status(200).json({ message: 'Este correo ya está verificado. Puedes iniciar sesión.' });
        }
        const crypto = require('crypto');
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await EmailVerify.deleteMany({ userId: user._id });
        await EmailVerify.create({ userId: user._id, token: verificationToken, expiresAt: verifyExpiresAt });
        const baseUrl = getBaseUrl(req);
        const verifyUrl = `${baseUrl}/verificar-correo?token=${verificationToken}`;
        try {
            if (process.env.SEND_VERIFICATION_EMAIL !== 'false') {
                const mailer = require('../mailer');
                if (typeof mailer.sendVerificationEmail === 'function') await mailer.sendVerificationEmail(user.email, verifyUrl);
            }
        } catch (e) { log.warn({ err: e && e.message }, 'Reenviar verificación: email no enviado'); }
        res.status(200).json({ message: 'Si el correo está registrado y sin verificar, recibirás un nuevo enlace. Revisa también spam.' });
    } catch (e) {
        res.status(500).json({ message: 'Error al procesar la solicitud.' });
    }
}

/**
 * Logout
 */
function logout(req, res) {
    const opts = { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax' };
    const cookieDomain = process.env.COOKIE_DOMAIN || (req.get('x-forwarded-host') || '').split(',')[0].trim() || undefined;
    if (cookieDomain) opts.domain = cookieDomain;
    res.clearCookie('trinalyze_auth', opts);
    res.json({ success: true });
}

/**
 * Get current user profile (me)
 */
async function getMe(req, res) {
    try {
        const user = req.user;
        const now = new Date();
        const lastLogin = user.lastLoginAt ? new Date(user.lastLoginAt) : null;
        const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
        if (!lastLogin || lastLogin < fiveMinAgo) {
            await User.findByIdAndUpdate(user._id, { lastLoginAt: now }, { new: false });
        }
        const sub = getUserSubscription(user);
        let partner = null;
        const p = await Partner.findOne({ userId: user._id });
        if (p) partner = { referralCode: p.referralCode, status: p.status, tier: p.tier };
        const createdBeforeOnboarding = user.createdAt && new Date(user.createdAt) < new Date('2026-02-01');
        const onboardingCompleted = user.onboardingCompleted === true || createdBeforeOnboarding;

        const requiredVersions = getRequiredVersions();
        const acceptances = await PolicyAcceptance.find({ userId: user._id }).lean();
        const acceptedBySlug = (acceptances || []).reduce((acc, a) => {
            if (!acc[a.policySlug] || acc[a.policySlug] < a.policyVersion) acc[a.policySlug] = a.policyVersion;
            return acc;
        }, {});
        let needsPolicyAcceptance = false;
        const policiesToAccept = [];
        for (const slug of REQUIRED_POLICY_SLUGS) {
            const requiredVer = requiredVersions[slug];
            if (requiredVer == null) continue;
            if ((acceptedBySlug[slug] || 0) < requiredVer) {
                needsPolicyAcceptance = true;
                const p = getPolicy(slug);
                if (p) policiesToAccept.push({ slug: p.slug, version: p.version, title: p.title });
            }
        }

        const taxSettings = user.taxSettings && typeof user.taxSettings === 'object'
            ? { isTaxExemptCompany: !!user.taxSettings.isTaxExemptCompany, defaultTaxRate: Math.min(0.18, Math.max(0, Number(user.taxSettings.defaultTaxRate) ?? 0.18)) }
            : { isTaxExemptCompany: false, defaultTaxRate: 0.18 };
        res.json({
            id: user._id,
            email: user.email,
            name: user.name,
            profession: user.profession,
            rnc: user.rnc,
            role: user.role || 'user',
            subscription: sub,
            fiscalStatus: { suggested: user.suggestedFiscalName, confirmed: user.confirmedFiscalName },
            taxSettings,
            partner,
            onboardingCompleted,
            needsPolicyAcceptance: needsPolicyAcceptance || undefined,
            policiesToAccept: policiesToAccept.length ? policiesToAccept : undefined
        });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
}

/**
 * Confirm fiscal name
 */
async function confirmFiscalName(req, res) {
    try {
        const { confirmedName } = req.body;
        if (!confirmedName) return res.status(400).json({ message: 'Nombre confirmado requerido' });

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        user.confirmedFiscalName = confirmedName;
        await user.save();

        res.json({ success: true, confirmedName });
    } catch (error) {
        res.status(500).json({ message: safeErrorMessage(error) });
    }
}

/**
 * Update user profile
 */
async function updateProfile(req, res) {
    try {
        const updates = req.body;
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        const allowedFields = [
            'name', 'profession', 'logo', 'digitalSeal', 'exequatur',
            'address', 'phone', 'hasElectronicBilling'
        ];

        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                user[field] = updates[field];
            }
        });

        if (updates.taxSettings) {
            if (!user.taxSettings) user.taxSettings = {};
            if (updates.taxSettings.isTaxExemptCompany !== undefined) 
                user.taxSettings.isTaxExemptCompany = updates.taxSettings.isTaxExemptCompany;
            if (updates.taxSettings.defaultTaxRate !== undefined) 
                user.taxSettings.defaultTaxRate = Math.min(0.18, Math.max(0, Number(updates.taxSettings.defaultTaxRate) || 0.18));
        }

        await user.save();
        const taxSettings = user.taxSettings && typeof user.taxSettings === 'object'
            ? { isTaxExemptCompany: !!user.taxSettings.isTaxExemptCompany, defaultTaxRate: user.taxSettings.defaultTaxRate ?? 0.18 }
            : { isTaxExemptCompany: false, defaultTaxRate: 0.18 };
        res.json({
            success: true, user: {
                name: user.name,
                email: user.email,
                hasElectronicBilling: user.hasElectronicBilling,
                taxSettings
            }
        });
    } catch (error) {
        res.status(500).json({ message: safeErrorMessage(error) });
    }
}

/**
 * Get current policies
 */
async function getCurrentPoliciesHandler(req, res) {
    try {
        const current = getCurrentPolicies();
        const list = Object.keys(current).map(slug => {
            const p = current[slug];
            return { slug: p.slug, version: p.version, title: p.title, effectiveAt: p.effectiveAt };
        });
        res.json({ policies: list, requiredSlugs: REQUIRED_POLICY_SLUGS });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
}

/**
 * Get specific policy content
 */
async function getPolicyHandler(req, res) {
    try {
        const slug = sanitizeString(req.params.slug, 50);
        const policy = getPolicy(slug);
        if (!policy) return res.status(404).json({ message: 'Política no encontrada' });
        res.json(policy);
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
}

/**
 * Accept policies
 */
async function acceptPolicies(req, res) {
    try {
        const acceptances = req.body.acceptances;
        if (!Array.isArray(acceptances) || acceptances.length === 0) {
            return res.status(400).json({ message: 'Se requiere al menos una aceptación (slug y version).' });
        }
        const requiredVersions = getRequiredVersions();
        const ip = (req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '').toString().split(',')[0].trim().slice(0, 45);
        for (const item of acceptances) {
            const slug = sanitizeString(String(item.slug || ''), 50);
            const version = Math.max(0, parseInt(item.version, 10) || 0);
            const current = getPolicy(slug);
            if (!current || current.version !== version) continue;
            if (REQUIRED_POLICY_SLUGS.includes(slug) && requiredVersions[slug] !== version) continue;
            await PolicyAcceptance.findOneAndUpdate(
                { userId: req.userId, policySlug: slug, policyVersion: version },
                { $setOnInsert: { userId: req.userId, policySlug: slug, policyVersion: version, ip, acceptedAt: new Date() } },
                { upsert: true }
            );
        }
        res.json({ success: true, message: 'Aceptación registrada' });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
}

/**
 * Complete onboarding
 */
async function completeOnboarding(req, res) {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        const { name, rnc, address, phone, confirmedFiscalName, logo } = req.body;
        if (name) user.name = sanitizeString(name, 200);
        if (rnc) user.rnc = String(rnc).replace(/[^0-9]/g, '').slice(0, 20);
        if (address !== undefined) user.address = sanitizeString(address, 300);
        if (phone !== undefined) user.phone = sanitizeString(phone, 20).replace(/[^0-9+\-\s]/g, '');
        if (confirmedFiscalName) user.confirmedFiscalName = sanitizeString(confirmedFiscalName, 200);
        if (logo) user.logo = logo;

        user.onboardingCompleted = true;
        await user.save();

        res.json({ success: true, message: 'Onboarding completado' });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error al completar onboarding' });
    }
}

module.exports = {
    register,
    login,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerifyEmail,
    logout,
    getMe,
    confirmFiscalName,
    updateProfile,
    getCurrentPoliciesHandler,
    getPolicyHandler,
    acceptPolicies,
    completeOnboarding
};
