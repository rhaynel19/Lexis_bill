/**
 * Contenido versionado de políticas legales — Lexis Bill (RD).
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
## 1. Aceptación

Al acceder y utilizar Lexis Bill ("el Servicio"), usted acepta quedar vinculado por estos Términos y Condiciones, en línea con la Ley 07-23 y normativa de la DGII de la República Dominicana.

## 2. Naturaleza del Servicio

Lexis Bill es una **herramienta de apoyo** para la emisión de comprobantes fiscales, gestión de clientes, reportes 606/607 y suscripciones. **No constituye asesoría contable, tributaria ni legal.** El usuario es el único responsable de la veracidad de la información que ingresa y del uso correcto de los NCF asignados por la DGII.

## 3. Responsabilidad del Usuario

- Usted es responsable de **verificar y validar** toda la información fiscal antes de emitir facturas, notas de crédito o reportes.
- El uso indebido de secuencias NCF o el incumplimiento de obligaciones ante la DGII es responsabilidad exclusiva del titular de la cuenta.
- Lexis Bill no garantiza la aprobación automática de documentos ante la DGII; el cumplimiento final depende de sus datos y de la normativa vigente.

## 4. Uso Aceptable

El uso del Servicio debe ser lícito y conforme a la normativa dominicana. No está permitido falsificar datos, suplantar identidad o utilizar el Servicio para actividades fraudulentas. Lexis Bill se reserva el derecho de suspender o dar de baja cuentas que violen estos términos.

## 5. Limitación de Responsabilidad

En la máxima medida permitida por la ley, Lexis Bill no será responsable por daños indirectos, lucro cesante o consecuencias derivadas de errores introducidos por el usuario, fallos de conectividad con la DGII, o uso incorrecto del Servicio. La responsabilidad por el contenido y validez fiscal de los comprobantes emitidos recae en el usuario.

## 6. Modificaciones

Lexis Bill puede actualizar estas políticas. En caso de cambios sustanciales, se le notificará y se le solicitará su nueva aceptación para continuar usando el Servicio. Las versiones anteriores permanecen archivadas para referencia.

## 7. Contacto

Para dudas sobre estos términos: info@lexisbill.do — Lexis Bill Solutions, República Dominicana.

Última actualización: ${EFFECTIVE_DATE}. Versión 1.
`.trim()
    },
    privacy: {
        version: 1,
        title: 'Política de Privacidad',
        slug: 'privacy',
        effectiveAt: EFFECTIVE_DATE,
        content: `
## 1. Responsable del Tratamiento

Lexis Bill Solutions ("Lexis Bill") es el responsable del tratamiento de los datos personales que usted facilita al utilizar el Servicio, en cumplimiento de la normativa aplicable en República Dominicana.

## 2. Datos que Recolectamos

- **Datos de cuenta:** nombre, correo electrónico, contraseña (encriptada), RNC/cédula, profesión, dirección y teléfono.
- **Datos fiscales:** información de clientes (nombre, RNC, contacto) que usted ingresa para facturación.
- **Datos de uso:** actividad en la plataforma (facturas, reportes 606/607, NCF, pagos y suscripciones) necesarios para operar el Servicio y cumplir obligaciones legales.

## 3. Finalidad y Base Legal

Utilizamos sus datos para: (a) prestar el Servicio de facturación y reportes fiscales; (b) gestionar suscripciones y pagos; (c) cumplir obligaciones ante la DGII cuando la ley lo exija; (d) mejorar la seguridad y el producto. La base es la ejecución del contrato y el consentimiento cuando lo requiera la ley.

## 4. Almacenamiento y Seguridad

Los datos se almacenan en infraestructura segura con cifrado en tránsito y en reposo. Las contraseñas se guardan con hash seguro. No compartimos sus datos fiscales ni personales con terceros para fines de marketing sin su consentimiento explícito.

## 5. Compartir Datos

Solo compartimos datos cuando sea necesario: (a) con autoridades (ej. DGII) cuando la ley lo exija; (b) con proveedores de pago (ej. PayPal) para procesar suscripciones; (c) con su consentimiento en otros casos.

## 6. Sus Derechos

Usted puede acceder, rectificar o solicitar la eliminación de sus datos personales, en la medida permitida por la ley y por la necesidad de conservar información fiscal. Contacto: info@lexisbill.do.

## 7. Cambios

Cualquier cambio relevante en esta política será comunicado y, cuando corresponda, se le pedirá su aceptación de la nueva versión.

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

Lexis Bill está destinado al uso profesional y empresarial legítimo para la emisión de comprobantes fiscales, gestión de clientes y reportes en el marco de la normativa de la República Dominicana.

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

Si tiene conocimiento de un uso inadecuado del Servicio, puede reportarlo a info@lexisbill.do.

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

Lexis Bill es una plataforma de apoyo a la facturación y al cumplimiento fiscal. **No sustituye la asesoría de un contador o asesor tributario.** El sistema no garantiza la aprobación automática de documentos ante la DGII ni la validez fiscal de los comprobantes; ello depende de la información que usted proporcione y de la normativa vigente.

## 2. Responsabilidad del Usuario

El usuario es responsable de:

- Verificar la exactitud de los datos antes de emitir facturas, notas de crédito y reportes 606/607.
- Utilizar correctamente los rangos NCF asignados por la DGII.
- Cumplir con sus obligaciones tributarias y declarativas en tiempo y forma.

## 3. Límite de Responsabilidad

En la máxima medida permitida por la ley aplicable, Lexis Bill y sus proveedores no serán responsables por: daños indirectos, lucro cesante, multas fiscales, ni por consecuencias derivadas de errores en los datos introducidos por el usuario, fallos de conectividad o de servicios externos (incluida la DGII), o por el uso indebido del Servicio.

## 4. Garantía

El Servicio se ofrece "tal cual". Lexis Bill se esfuerza por mantener la disponibilidad y precisión del software, pero no garantiza resultados fiscales específicos.

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

Las suscripciones a Lexis Bill (planes Pro, Premium u otros) se facturan según el ciclo elegido (mensual o anual). Los pagos se realizan por transferencia bancaria o PayPal según la opción seleccionada al activar el plan.

## 2. Solicitud de Reembolso

- Puede solicitar un reembolso dentro de los **7 días** siguientes a la fecha de pago si no ha utilizado de forma significativa el Servicio (por ejemplo, no ha emitido facturas con NCF ni generado reportes fiscales con la cuenta).
- Las solicitudes deben enviarse a info@lexisbill.do indicando el motivo y la referencia de pago.

## 3. Criterios de Reembolso

Lexis Bill evaluará cada solicitud. No se garantiza reembolso en casos de: uso extensivo del Servicio, emisión de NCF, reportes 606/607 ya generados, o solicitudes fuera del plazo indicado. En caso de error de facturación o cobro duplicado, se procederá al reembolso o a la compensación en la siguiente facturación.

## 4. Plazo y Forma de Reembolso

Si se aprueba el reembolso, se realizará por el mismo medio de pago utilizado (transferencia o PayPal) en un plazo razonable, generalmente dentro de 10 días hábiles.

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
