const { NCFSettings, User, logAdminAction } = require('../models');
const { isValidObjectId } = require('../utils/validators');
const { safeErrorMessage } = require('../utils/helpers');

/**
 * Listar los lotes de NCF de un usuario (Admin)
 */
exports.getUserNCFSettings = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) return res.status(400).json({ message: 'ID de usuario inválido' });
        
        const settings = await NCFSettings.find({ userId: id }).sort({ isActive: -1, expiryDate: -1 });
        const user = await User.findById(id).select('name email rnc');
        
        res.json({
            user,
            settings
        });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

/**
 * Ajustar el valor actual de un NCF (Acción Crítica de Soporte)
 * Se usa para corregir si un usuario saltó números o necesita resetear.
 */
exports.updateNCFValue = async (req, res) => {
    try {
        const { ncfId } = req.params;
        const { newValue, reason } = req.body;
        
        if (!isValidObjectId(ncfId)) return res.status(400).json({ message: 'ID de NCF inválido' });
        if (typeof newValue !== 'number' || newValue < 0) return res.status(400).json({ message: 'Valor inválido' });
        if (!reason) return res.status(400).json({ message: 'Se requiere una razón para el ajuste' });

        const setting = await NCFSettings.findById(ncfId);
        if (!setting) return res.status(404).json({ message: 'Lote NCF no encontrado' });

        const oldValue = setting.currentValue;
        setting.currentValue = newValue;
        await setting.save();

        await logAdminAction(req.userId, 'ncf_manual_adjust', 'ncf_setting', ncfId, {
            userId: setting.userId,
            type: setting.type,
            oldValue,
            newValue,
            reason
        });

        res.json({
            message: 'Secuencia NCF ajustada correctamente',
            setting
        });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

/**
 * Activar/Desactivar un lote de NCF
 */
exports.toggleNCFStatus = async (req, res) => {
    try {
        const { ncfId } = req.params;
        const setting = await NCFSettings.findById(ncfId);
        if (!setting) return res.status(404).json({ message: 'Lote NCF no encontrado' });

        setting.isActive = !setting.isActive;
        await setting.save();

        await logAdminAction(req.userId, 'ncf_status_toggle', 'ncf_setting', ncfId, {
            userId: setting.userId,
            isActive: setting.isActive
        });

        res.json({ message: `Lote NCF ${setting.isActive ? 'activado' : 'desactivado'}`, setting });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};
