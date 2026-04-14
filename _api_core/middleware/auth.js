const jwt = require('jsonwebtoken');
const { User, Subscription, getOrCreateSubscription } = require('../models');
const log = require('../logger');

const JWT_SECRET = process.env.JWT_SECRET;

// 🔥 MIDDLEWARE INTELIGENTE CON NIVELES DE ACCESO (Anti-Errores)
// SEGURIDAD: Token solo en cookie HttpOnly (no en URL ni localStorage)
function verifyToken(req, res, next) {
    const token = req.cookies?.trinalyze_auth;
    if (!token) return res.status(403).json({ message: 'Sesión no válida. Inicie sesión.' });

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Unauthorized' });

        try {
            const user = await User.findById(decoded.id);
            if (!user) return res.status(404).json({ message: 'User not found' });
            if (user.blocked) return res.status(403).json({ message: 'Cuenta bloqueada. Contacte a soporte.', code: 'ACCOUNT_BLOCKED' });

            // 🔥 Obtener suscripción desde la fuente de verdad (Subscription)
            let sub = await Subscription.findOne({ userId: user._id });
            if (!sub) {
                // Crear suscripción si no existe (migración automática)
                sub = await getOrCreateSubscription(user._id);
            }

            // Admin: acceso completo siempre
            if (user.role === 'admin') {
                req.userId = decoded.id;
                req.user = user;
                req.subscription = sub;
                req.accessLevel = 'FULL';
                return next();
            }

            // 🔥 NIVELES DE ACCESO (NO redirigir agresivamente)
            const accessLevels = {
                'FULL': ['ACTIVE', 'TRIAL'],
                'LIMITED': ['GRACE_PERIOD', 'UNDER_REVIEW', 'PENDING_PAYMENT'],
                'BLOCKED': ['SUSPENDED', 'CANCELLED', 'PAST_DUE']
            };

            let accessLevel = 'BLOCKED';
            for (const [level, statuses] of Object.entries(accessLevels)) {
                if (statuses.includes(sub.status)) {
                    accessLevel = level;
                    break;
                }
            }

            // Solo bloquear si está realmente suspendido o cancelado
            if (accessLevel === 'BLOCKED' && sub.status === 'SUSPENDED') {
                return res.status(403).json({
                    message: 'Tu suscripción está suspendida. Regulariza tu pago para continuar.',
                    code: 'SUBSCRIPTION_SUSPENDED',
                    accessLevel: 'BLOCKED'
                });
            }

            // LIMITED ACCESS: Permitir acceso pero con restricciones (el frontend manejará qué mostrar)
            req.userId = decoded.id;
            req.user = user;
            req.subscription = sub;
            req.accessLevel = accessLevel; // FULL, LIMITED, BLOCKED
            next();
        } catch (dbErr) {
            log.error({ err: dbErr.message, userId: decoded?.id }, 'Error verificando suscripción');
            res.status(500).json({ error: 'Error verificando suscripción' });
        }
    });
}

// Middleware para verificar acceso completo (solo FULL)
function requireFullAccess(req, res, next) {
    if (req.accessLevel !== 'FULL') {
        return res.status(403).json({
            message: 'Acceso limitado. Regulariza tu suscripción para continuar.',
            code: 'LIMITED_ACCESS',
            accessLevel: req.accessLevel
        });
    }
    next();
}

function verifyAdmin(req, res, next) {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Acceso denegado. Solo administradores.' });
    }
    next();
}

/** Solo cuentas cliente (user/admin). No se puede ser partner y user con el mismo correo: partners no acceden a facturación. */
function verifyClient(req, res, next) {
    if (req.user && req.user.role === 'partner') {
        return res.status(403).json({
            message: 'No puedes usar la facturación con esta cuenta. Es una cuenta partner; inicia sesión para acceder al panel de partners.',
            code: 'ACCOUNT_IS_PARTNER'
        });
    }
    next();
}

module.exports = {
    verifyToken,
    requireFullAccess,
    verifyAdmin,
    verifyClient
};
