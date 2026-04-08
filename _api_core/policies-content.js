/**
 * Contenido versionado de políticas legales (RD).
 * Inmutable por versión. Al cambiar contenido, incrementar version y actualizar EFFECTIVE_DATE.
 * No modificar desde frontend; solo lectura vía API.
 */

const EFFECTIVE_DATE = '2026-02-15';

const POLICIES = {
    terms: {
        version: 1,
        title: 'Términos y Condiciones de Uso',
        slug: 'terms',
        effectiveAt: EFFECTIVE_DATE,
        content: `
## 1. Aceptación de los Términos

Al acceder y utilizar la plataforma **Trinalyze Billing** ("el Servicio"), usted declara ser mayor de edad y poseer la capacidad legal necesaria para contratar. Su acceso y uso del Servicio constituye su aceptación total y sin reservas de estos Términos y Condiciones, los cuales se rigen por las leyes de la República Dominicana, específicamente la Ley 07-23 sobre Facturación Electrónica y el Código de Comercio.

## 2. Descripción del Servicio

Trinalyze Billing es una solución de Software como Servicio (SaaS) diseñada para facilitar la gestión comercial, incluyendo:
- Emisión de facturas y comprobantes fiscales (tradicionales y electrónicos).
- Gestión de clientes, productos y servicios.
- Generación de reportes fiscales (606, 607, 608) conforme a los requerimientos de la DGII.
- Gestión de cotizaciones y flujo de cobranzas.

**IMPORTANTE:** Trinalyze Billing es una herramienta tecnológica de apoyo. No sustituye la labor de un profesional de la contabilidad ni constituye asesoría legal o tributaria.

## 3. Responsabilidades del Usuario

Como usuario, usted se compromete a:
- Proporcionar información veraz y actualizada (RNC, nombre fiscal, dirección).
- Custodiar sus credenciales de acceso; cualquier acción realizada desde su cuenta se le atribuirá a usted.
- **Validar la exactitud de cada comprobante emitido.** La Plataforma no es responsable por multas, recargos o sanciones fiscales derivadas de errores en la información ingresada por el usuario.
- Cumplir con los plazos de reporte establecidos por la DGII.

## 4. Propiedad Intelectual

Todo el contenido, diseño, logotipos, código fuente y tecnología de Trinalyze Billing son propiedad exclusiva de sus creadores y están protegidos por las leyes de propiedad intelectual en República Dominicana (Ley 65-00). Se prohíbe la reproducción total o parcial, ingeniería inversa o cualquier uso no autorizado del software.

## 5. Limitación de Responsabilidad

En la medida permitida por la ley, la Plataforma no será responsable por:
- Interrupciones del servicio debidas a fallos en la infraestructura de internet o servicios de terceros (incluyendo plataformas de la DGII).
- Pérdida de datos por causas de fuerza mayor.
- Daños derivados de un uso negligente del sistema por parte del usuario.

## 6. Suspensión y Terminación

Nos reservamos el derecho de suspender o cancelar el acceso al Servicio, previo aviso, en caso de detectar:
- Incumplimiento de estos términos.
- Uso del sistema para actividades fraudulentas o ilícitas.
- Falta de pago de la suscripción correspondiente al plan elegido.

## 7. Ley Aplicable y Jurisdicción

Para cualquier controversia derivada de estos términos, las partes se someten a la jurisdicción de los tribunales correspondientes en el Distrito Nacional, República Dominicana.

Última actualización: ${EFFECTIVE_DATE}. Versión 1.
`.trim()
    },
    privacy: {
        version: 1,
        title: 'Política de Privacidad',
        slug: 'privacy',
        effectiveAt: EFFECTIVE_DATE,
        content: `
## 1. Recolección de Información

Recopilamos información necesaria para la prestación del Servicio, que incluye:
- **Datos de Identidad:** Nombre completo, RNC, Cédula de Identidad.
- **Datos de Contacto:** Correo electrónico, número de teléfono, dirección fiscal.
- **Datos de Facturación:** Información de sus clientes y transacciones comerciales.

## 2. Uso de la Información

Sus datos son utilizados exclusivamente para:
- Proveer y mantener las funcionalidades de facturación y reportes.
- Procesar sus suscripciones y pagos.
- Cumplir con requerimientos legales de las autoridades tributarias (DGII).
- Enviar notificaciones críticas sobre su cuenta y actualizaciones del sistema.

## 3. Protección y Almacenamiento

Implementamos medidas de seguridad técnicas y organizativas para proteger su información contra acceso no autorizado, alteración o destrucción. Esto incluye cifrado de datos y protocolos de seguridad en la nube. **Nunca compartimos su información fiscal con terceros para fines publicitarios.**

## 4. Compartición de Datos con Terceros

Solo compartiremos su información en los siguientes casos:
- Con proveedores de servicios tecnológicos necesarios para operar la plataforma (almacenamiento en la nube, pasarelas de pago).
- Con la DGII, cuando usted utilice las funciones de Facturación Electrónica.
- Por requerimiento de una autoridad judicial competente.

## 5. Sus Derechos (ARCO)

Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al tratamiento de sus datos personales. Puede ejercer estos derechos enviando una solicitud a soporte técnico o a través de la configuración de su perfil.

## 6. Uso de Cookies

Utilizamos cookies técnicas y de sesión para garantizar que la plataforma funcione correctamente, recordar sus preferencias y mejorar la seguridad del acceso.

Última actualización: ${EFFECTIVE_DATE}. Versión 1.
`.trim()
    },
    acceptable_use: {
        version: 1,
        title: 'Política de Uso Aceptable',
        slug: 'acceptable_use',
        effectiveAt: EFFECTIVE_DATE,
        content: `
## 1. Uso Permitido

Este Servicio está destinado al uso profesional y empresarial legítimo para la emisión de comprobantes fiscales, gestión de clientes y reportes en el marco de la normativa de la República Dominicana.

## 2. Prohibiciones

No está permitido:

- Utilizar el Servicio para actividades ilegales o fraudulentas.
- Falsificar datos fiscales, RNC, NCF o identidad de terceros.
- Intentar acceder a sistemas, cuentas o datos ajenos sin autorización.
- Sobrecargar la plataforma (scraping, automatización no autorizada) ni interferir con su funcionamiento.
- Emitir comprobantes que no correspondan a operaciones reales o que violen normativa DGII.

## 3. Consecuencias

El incumplimiento de esta política puede dar lugar a la suspensión o baja de la cuenta y, en su caso, a la comunicación a las autoridades competentes.

## 4. Denuncia

Si tiene conocimiento de un uso inadecuado del Servicio, favor reportarlo a soporte técnico.

Última actualización: ${EFFECTIVE_DATE}. Versión 1.
`.trim()
    },
    limitation: {
        version: 1,
        title: 'Limitación de Responsabilidad',
        slug: 'limitation',
        effectiveAt: EFFECTIVE_DATE,
        content: `
## 1. Alcance del Servicio

La Plataforma es una herramienta de apoyo a la facturación y al cumplimiento fiscal. **No sustituye la asesoría de un contador o asesor tributario.** El sistema no garantiza la aprobación automática de documentos ante la DGII ni la validez fiscal de los comprobantes; ello depende de la información que usted proporcione y de la normativa vigente.

## 2. Responsabilidad del Usuario

El usuario es responsable de:

- Verificar la exactitud de los datos antes de emitir facturas, notas de crédito y reportes 606/607.
- Utilizar correctamente los rangos NCF asignados por la DGII.
- Cumplir con sus obligaciones tributarias y declarativas en tiempo y forma.

## 3. Límite de Responsabilidad

En la máxima medida permitida por la ley aplicable, el Servicio y sus proveedores no serán responsables por: daños indirectos, lucro cesante, multas fiscales, ni por consecuencias derivadas de errores en los datos introducidos por el usuario, fallos de conectividad o de servicios externos (incluida la DGII), o por el uso indebido del Servicio.

## 4. Garantía

El Servicio se ofrece "tal cual". Nos esforzamos por mantener la disponibilidad y precisión del software, pero no garantizamos resultados fiscales específicos.

Última actualización: ${EFFECTIVE_DATE}. Versión 1.
`.trim()
    },
    refunds: {
        version: 1,
        title: 'Política de Reembolsos',
        slug: 'refunds',
        effectiveAt: EFFECTIVE_DATE,
        content: `
## 1. Suscripciones y Pagos

Las suscripciones se facturan según el ciclo elegido (mensual o anual). Los pagos se realizan por los medios de pago autorizados en la plataforma.

## 2. Solicitud de Reembolso

- Puede solicitar un reembolso dentro de los **7 días** siguientes a la fecha de pago si no ha utilizado de forma significativa el Servicio (por ejemplo, no ha emitido facturas con NCF ni generado reportes fiscales con la cuenta).
- Las solicitudes deben enviarse a soporte técnico indicando el motivo y la referencia de pago.

## 3. Criterios de Reembolso

Se evaluará cada solicitud. No se garantiza reembolso en casos de: uso extensivo del Servicio, emisión de NCF, reportes 606/607 ya generados, o solicitudes fuera del plazo indicado. En caso de error de facturación o cobro duplicado, se procederá al reembolso o a la compensación en la siguiente facturación.

## 4. Plazo y Forma de Reembolso

Si se aprueba el reembolso, se realizará por el mismo medio de pago utilizado en un plazo razonable, generalmente dentro de 10 días hábiles.

## 5. Período de Prueba (Trial)

El período de prueba gratuito no conlleva cobro; por tanto, no aplica reembolso. Al finalizar el trial, si no desea continuar, puede no renovar sin cargo.

Última actualización: ${EFFECTIVE_DATE}. Versión 1.
`.trim()
    }
};

/** Versiones actuales requeridas para registro y para no mostrar "aceptar políticas" al iniciar sesión */
const REQUIRED_POLICY_SLUGS = ['terms', 'privacy'];

function getCurrentPolicies() {
    return POLICIES;
}

function getPolicy(slug) {
    return POLICIES[slug] || null;
}

function getRequiredVersions() {
    return REQUIRED_POLICY_SLUGS.reduce((acc, slug) => {
        const p = POLICIES[slug];
        if (p) acc[slug] = p.version;
        return acc;
    }, {});
}

module.exports = {
    POLICIES,
    REQUIRED_POLICY_SLUGS,
    getCurrentPolicies,
    getPolicy,
    getRequiredVersions
};
