# Auditoría: Onboarding y autoguía para nuevos usuarios

## Estado actual

### 1. Flujos existentes

- **Página `/onboarding`** (obligatoria): Formulario de 2 pasos (RNC, nombre fiscal, dirección → “Configura NCF y finaliza”). Controlada por `user.onboardingCompleted` en backend. Redirect desde layout si no completado. Diseño: página completa, no modal; responsive aceptable (container max-w-2xl, grid).
- **OnboardingWizard** (modal): 4 pasos (Profesión, Tipo de cliente, RNC/Nombre, “Todo listo”). Controlado por `isOnboarded` en PreferencesContext (localStorage `lexis_preferences`). Se muestra en dashboard cuando `!isOnboarded`.
- **SmartTutorial** (“Autotutorial Inteligente”): Card flotante con 5 pasos (perfil, cliente, factura, envío, dashboard). Controlado por `lexis_tutorial_completed` / `lexis_tutorial_progress` en localStorage. Se muestra en dashboard si no completado ni omitido.

### 2. Problemas detectados (responsive y UX)

#### SmartTutorial (principal causa de “se mezcla en móvil”)

- **Posicionamiento**: `fixed z-50` con `top-4 left-4 right-4` en móvil y `md:bottom-6 md:left-6` en desktop. La card queda **encima** del contenido del dashboard sin overlay; en móvil compite con header, FAB y bottom nav.
- **Sin overlay**: No hay fondo oscuro/backdrop; el mensaje convive con el layout → sensación de desorden y pérdida de jerarquía.
- **Ancho**: `w-[calc(100vw-2rem)]` en móvil; en viewports muy pequeños (320px) el contenido puede quedar apretado y los botones no garantizan 44px de altura táctil.
- **Z-index**: `z-50` puede coincidir con otros elementos fijos (header, sheet, FAB); posibles solapamientos.
- **Contenido**: Textos largos (description + keyMessage + microReinforcement); en pantallas pequeñas se acumulan y restan claridad.

#### OnboardingWizard

- **Altura fija**: `h-[500px]` en el contenedor flex; en pantallas cortas (p. ej. 568px) el contenido puede hacer scroll interno y la barra de progreso lateral queda fuera de vista en móvil (está `hidden md:flex`).
- **DialogContent**: Estilos custom `bg-[#0A192F]`, `p-0`, `[&>button]:hidden`; el Dialog base ya tiene overlay, pero el contenido interno no escala bien (grid 2 cols en step 1 en móvil puede ser pequeño).
- **Botones**: Algunos no cumplen claramente 44px de alto para touch.

#### Página `/onboarding`

- Menos crítica: layout de página completa con container; el principal problema reportado es la autoguía en dashboard, no esta ruta.

### 3. Breakpoints y resoluciones

- **Tailwind por defecto**: `sm:640px`, `md:768px`, `lg:1024px`.
- **Resoluciones a validar**: 320px, 375px, 414px, 768px.
- **Problemas**: SmartTutorial usa `md:` para cambiar de top a bottom pero no garantiza espacio seguro en 320–414px; OnboardingWizard no tiene breakpoints específicos para el contenido interno.

### 4. Estado y persistencia

- **Backend**: `user.onboardingCompleted` (API y DB) → obliga a pasar por `/onboarding` una vez.
- **Frontend**: `lexis_preferences.isOnboarded` (OnboardingWizard), `lexis_tutorial_completed` (SmartTutorial). No hay opción en Ayuda para “reactivar guía”.

---

## Cambios implementados (resumen)

1. **Nueva guía de primer uso (modal con overlay)**  
   - Sustitución de la experiencia de SmartTutorial por un **modal centrado con fondo oscuro** (Opción A).
   - **4 pasos** alineados con el requerimiento: Bienvenida → Rangos NCF → Crear primera factura → Dónde ver reportes fiscales.
   - Contenido breve (bullets/frases cortas), indicador de progreso (Paso X de 4), botones “Siguiente” y “Omitir”.
   - **Mobile-first**: modal con ancho máximo y padding seguro, scroll interno si hace falta; botones con altura mínima ~44px; sin altura fija que rompa en 320–375px.
   - Misma clave de persistencia (`lexis_tutorial_completed`) para no mostrar de nuevo tras completar/omitir; solo se muestra en primer uso o al reactivar desde Ayuda.

2. **Eliminación de la card flotante**  
   - Se deja de renderizar la card fija de SmartTutorial que se mezclaba con el layout; toda la guía pasa a ser modal con overlay y `z-index` por encima del contenido.

3. **Reactivación desde Ayuda**  
   - En la página de Ayuda se añade la opción “Ver guía de inicio de nuevo” (o “Reactivar guía de inicio”) que borra `lexis_tutorial_completed` (y opcionalmente progreso) y redirige al dashboard; en la siguiente carga el dashboard muestra de nuevo el modal de la guía.

4. **OnboardingWizard**  
   - Se mantiene; se pueden aplicar ajustes menores de responsive (quitar altura fija, asegurar touch targets) en una iteración posterior si se desea.

5. **Rendimiento**  
   - La guía solo se monta cuando corresponde (no completada / no omitida); no bloquea la app; se evitan re-renders innecesarios usando estado local y localStorage.

---

## Recomendaciones adicionales

- **Unificar “primer uso”**: Valorar mostrar una sola experiencia: o bien solo OnboardingWizard, o bien solo la guía de 4 pasos (y llevar profesión/tipo de cliente a configuración o a un solo paso previo), para reducir fricción.
- **Sincronizar con backend**: Si se desea “no mostrar guía otra vez” en todos los dispositivos, considerar un flag `onboarding_guide_completed` en el usuario (API) además de localStorage.
- **Accesibilidad**: Añadir `aria-label` en botones, `role="dialog"` y focus trap en el modal de la guía.
- **Métricas**: Registrar cuando se completa u omite la guía (analytics) para medir adopción.
