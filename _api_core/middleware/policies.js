const { PolicyAcceptance } = require('../models');
const { REQUIRED_POLICY_SLUGS, getRequiredVersions } = require('../policies-content');

/**
 * Middleware para requerir la aceptación de las últimas versiones de las políticas legales
 * antes de permitir operaciones críticas (emisión/anulación de facturas).
 */
const requirePolicyAcceptance = async (req, res, next) => {
    try {
        const userId = req.userId;
        if (!userId) return res.status(401).json({ message: 'No autorizado' });

        const requiredVersions = getRequiredVersions();
        const userAcceptances = await PolicyAcceptance.find({ userId }).lean();
        
        const acceptedBySlug = userAcceptances.reduce((acc, a) => {
            if (!acc[a.policySlug] || acc[a.policySlug] < a.policyVersion) {
                acc[a.policySlug] = a.policyVersion;
            }
            return acc;
        }, {});

        const missingPolicies = [];
        for (const slug of REQUIRED_POLICY_SLUGS) {
            const requiredVer = requiredVersions[slug];
            if ((acceptedBySlug[slug] || 0) < requiredVer) {
                missingPolicies.push(slug);
            }
        }

        if (missingPolicies.length > 0) {
            return res.status(403).json({
                message: 'Para continuar emitiendo documentos, debes aceptar la última actualización de nuestros Términos y Condiciones y Política de Privacidad.',
                code: 'POLICY_ACCEPTANCE_REQUIRED',
                missingPolicies
            });
        }

        next();
    } catch (error) {
        console.error('Error en requirePolicyAcceptance middleware:', error);
        res.status(500).json({ message: 'Error al verificar cumplimiento legal.' });
    }
};

module.exports = { requirePolicyAcceptance };
