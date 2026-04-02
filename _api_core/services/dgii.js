const log = require('../logger');
const { NCFSettings, Invoice } = require('../models');
const { validateNcfForClient } = require('../utils/validators');

/** Consulta RNC/Cédula en API externa DGII o proveedor (MegaPlus, etc.). Si DGII_RNC_API_URL está definido, hace GET a ?rnc=XXX. */
async function fetchRncFromExternalApi(cleanNumber) {
    const baseUrl = process.env.DGII_RNC_API_URL;
    if (!baseUrl || typeof cleanNumber !== 'string') return null;
    const url = baseUrl.includes('?') ? `${baseUrl}&rnc=${cleanNumber}` : `${baseUrl}?rnc=${cleanNumber}`;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
        clearTimeout(timeout);
        if (!res.ok) return null;
        const data = await res.json();
        // Formatos comunes: { razonSocial, nombreComercial }, { name }, { nombre }, { RazonSocial }
        const name = data.razonSocial || data.nombreRazonSocial || data.name || data.nombre || data.RazonSocial || data.nombreComercial || null;
        if (!name) return null;
        const type = cleanNumber.length === 9 ? 'JURIDICA' : 'FISICA';
        return { valid: true, rnc: cleanNumber, name: String(name).trim(), type };
    } catch (e) {
        log.warn({ err: e.message, rnc: cleanNumber }, 'RNC external API failed');
        return null;
    }
}

/** Genera el siguiente NCF para un usuario y tipo específico */
async function getNextNcf(userId, type, session, clientRnc) {
    // DGII: Validar tipo de cliente vs tipo de NCF
    const clientCheck = validateNcfForClient(type, clientRnc);
    if (!clientCheck.valid) throw new Error(clientCheck.reason);

    const now = new Date();
    // DGII: Validar fecha de expiración del rango - solo lotes vigentes
    const activeBatch = await NCFSettings.findOneAndUpdate(
        {
            userId,
            type,
            isActive: true,
            expiryDate: { $gte: now },
            $expr: { $lt: ["$currentValue", "$finalNumber"] }
        },
        { $inc: { currentValue: 1 } },
        { new: true, session }
    );

    if (!activeBatch) {
        const expired = await NCFSettings.findOne({ userId, type, isActive: true, expiryDate: { $lt: now } }).session(session);
        if (expired) throw new Error(`El rango de NCF para el tipo ${type} ha vencido. Configure un nuevo lote en Configuración.`);
        throw new Error(`No hay secuencias NCF disponibles para el tipo ${type}. Configure un lote en Configuración.`);
    }

    const isElectronic = activeBatch.series === 'E';
    const padding = isElectronic ? 10 : 8;
    const paddedSeq = activeBatch.currentValue.toString().padStart(padding, '0');
    const fullNcf = `${activeBatch.series}${type}${paddedSeq}`;

    // DGII: Validar unicidad (doble verificación - índice unique en Invoice protege)
    const exists = await Invoice.findOne({ userId, ncfSequence: fullNcf }).session(session);
    if (exists) throw new Error('NCF duplicado detectado. Contacte soporte.');

    return fullNcf;
}

module.exports = {
    fetchRncFromExternalApi,
    getNextNcf
};
