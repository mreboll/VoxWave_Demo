# DECISIONS.md

Registro de decisiones tomadas donde `VOXWAVE-MVP.md` deja margen o es ambiguo.
Formato: fecha · decisión · motivo · estado.

## 2026-11-03 — Propuesta inicial (pendiente de OK)

| # | Decisión | Motivo | Estado |
|---|---|---|---|
| D1 | Stack exacto del brief §3: Vite + React 18 + TS strict, React Router, Tailwind, Framer Motion, Zustand + persist, `idb-keyval`, BroadcastChannel, Web Audio + MediaRecorder, SVG a mano, `lucide-react`, Sora/Inter, File System Access API. | El brief manda. | Propuesta |
| D2 | **Tailwind v4** (`@tailwindcss/vite`) con los tokens de §4.1 en un bloque `@theme` de `src/design/tokens.css`, para que CSS variables y clases Tailwind salgan de una sola fuente. | Evita duplicar tokens entre `tailwind.config` y CSS. | Propuesta |
| D3 | Framer Motion vía el paquete actual `motion` (`import { motion } from 'motion/react'`). | Es el nombre vigente de Framer Motion; el brief ya lo cita como `motion`. | Propuesta |
| D4 | React Router v7 en modo librería (SPA, `createBrowserRouter`), sin modo framework/SSR. | No hay backend; SPA con rewrite en Vercel. | Propuesta |
| D5 | npm como gestor de paquetes; Vitest solo para la capa de datos (validación de `deviceImport`, determinismo del seed, `scriptedResult`). | Lo que más puede romper en silencio es el parseo del USB y el seed. | Propuesta |
| D6 | Seed de 24 pacientes literales: los 8 del §9.1 + 16 "otros" estables y ligeros. | "24 patients monitored" debe ser cierto en la UI. | Propuesta |
| D7 | Las fechas del seed se calculan **relativas a hoy** (p. ej. "Today 09:12", "3 days ago") con PRNG con semilla fija, para que la demo parezca actual el día que sea. | El brief pide datos deterministas pero la UI habla de "today". | Propuesta |
| D8 | `public/sample-device/` respeta el contrato §8.2 con fechas fijas; si el día de la demo no coinciden con "today", la UI muestra la fecha real del fichero. | El Pi real escribirá fechas reales; no se manipulan datos importados. | Abierta (ver preguntas) |
| D9 | Audio: detectar `mimeType` soportado por `MediaRecorder` (webm/opus en Chrome, mp4/aac en Safari iOS) y guardar el tipo junto al blob. | Safari iOS no graba webm. | Propuesta |
| D10 | Clips de muestra (`sample-audio/`, `sample-device/audio/*.wav`): se generan WAV sintéticos placeholder por script hasta tener grabaciones reales del equipo. | No hay audio real en el repo todavía. | Abierta |
| D11 | Logo: se toma el SVG de `MarcoGarLop/voxwave-video-pitch` (`src/brand/logo.ts`) en el milestone 1; si no es accesible, placeholder de tres trazos hasta tenerlo. | El brief lo referencia en un repo externo. | Propuesta |
| D12 | El despliegue en Vercel lo conecta el equipo (cuenta propia); yo dejo `vercel.json` con el rewrite SPA. | Requiere credenciales del equipo. | Propuesta |
| D13 | Orden de construcción = §14 del brief (clinic con datos estáticos antes que el flujo de paciente). | Ver respuesta en chat; el brief manda. | Propuesta |

## 2026-11-03 — Respuesta del equipo

- D1–D7, D9, D11–D13 **aprobadas** ("adelante con ese plan y ese orden").
- **D8 → cambia:** `public/sample-device/` llevará las fechas del **día de la final** (pendiente de que Martin confirme el día), con la última sesión a las 08:05 de ese día, para que "last one today 08:05" sea literal. Hasta entonces, fechas del contrato §8.2.
- **D10 → aprobada:** WAV sintéticos para el seed.
- **D11 → precisada:** el equipo copiará el logo en `public/` y dará la ruta; mientras, placeholder de tres trazos (`src/components/Logo.tsx`), con la misma API para sustituirlo sin tocar a los consumidores.
- **D14 (nueva):** commit al cerrar cada hito; tras el hito 1 se para para que el equipo conecte Vercel.

## 2026-11-03 — Hito 1 (scaffold + design system)

- **D15:** Vite **8** (no 6): `@vitejs/plugin-react` actual exige Vite 8 como peer. TypeScript resuelve a 7.x. React se mantiene en **18.3** como pide el brief.
- **D16:** Los tokens de color usan nombres kebab en Tailwind (`navy-deep`, `teal-bright`, `coral-soft`, `paper-shade`, `ink-soft`, `ink-faint`) ↔ los nombres camelCase del brief §4.1. Los estados son `stable`, `watch` y `alert`.
- **D17:** Las rutas de hitos no construidos muestran un `Placeholder` para que todas las URLs del §5 respondan desde ya (útil al conectar Vercel).
- **D18:** Grano de papel = ruido SVG `feTurbulence` en un pseudo-elemento fijo (`.grain`), `pointer-events: none`, opacidad 0.07.

## 2026-11-03 — Fechas de la final

- **D8 → cerrada:** la final es el **20 de noviembre de 2026**. `public/sample-device/VOXWAVE/` tiene **7 sesiones, una al día del 14 al 20 de noviembre**. La última empieza el 20 a las **08:05 hora de Vilnius (06:05Z)**. `exportedAt` es `2026-11-20T07:30:00Z` (09:30 en Vilnius, después de la sesión de la mañana). Las demás sesiones tienen horas de mañana realistas entre 07:40 y 08:35 locales. Vilnius en noviembre = EET, UTC+2.
- **D19 (regla de fechas en la UI):** se muestra "Today HH:MM" **solo si la fecha de la sesión es hoy** en la zona horaria del navegador; si no, se muestra la fecha real (p. ej. "14 Nov · 08:20"). Nunca se reescriben las fechas de los datos importados. Se aplica a todos los textos relativos ("Today", "last one today 08:05"…).
- **D7 confirmada:** el seed sigue siendo relativo a hoy.
- **D20:** `sessions.json` ya referencia `audio/*.wav` (3 por sesión). Los WAV sintéticos se generan en el hito 6; mientras tanto la app debe tolerar que falten (§8.2).

## 2026-11-03 — Logo oficial

- **D21 (logo):** se usa el logo oficial `public/Logo oficial.svg`. De él se extraen a `src/components/logoPaths.ts` las formas exactas del símbolo (navy, coral, teal) y de las letras "VoxWave". Se descarta el rectángulo de fondo `#f9f9f9` para que el logo quede sobre el papel. Se usan los colores del propio fichero (`#0a2a3b`, `#fe653c`, `#02527d`), muy próximos a los tokens del §4.1.
  - **Animación:** un relleno no se puede animar con `pathLength`, así que cada forma se revela con una máscara: un trazo ancho (150 u) que recorre su línea central. Se ha medido por píxeles que cada máscara cubre el 100 % de su forma, y la del teal se ajustó con los puntos medios medidos columna a columna.
  - **Disposición:** la landing usa la versión apilada del original (símbolo arriba, letras debajo); el resto de la app usa la versión en línea. El favicon se genera a partir de las mismas formas.
  - (Antes de este cambio hubo una versión intermedia calcada de un JPEG; quedó sustituida.)

## 2026-11-03 — Hito 2 (capa de datos)

- **D22 (push):** `git push` a `MarcoGarLop/VoxWave_MVP` falla con 403: la cuenta `mreboll` no tiene permiso de escritura. Los commits siguen en local hasta que Marco dé acceso (Settings → Collaborators) o se decida otra vía.
- **D23 (qué se persiste):** en localStorage solo se guarda lo que pasa en este navegador: el paciente demo y sus sesiones, las sesiones sincronizadas del dispositivo, las notas, las visitas, el modo del próximo resultado, el login de la clínica y el ajuste de movimiento. El seed **no** se persiste: se regenera a partir de hoy en cada carga (`derive.ts` lo mezcla con lo local). Así el seed nunca se queda viejo y "Reset demo" solo tiene que borrar lo local.
- **D24 (seed por hora):** el seed se cachea por hora local. Una sesión "Today 09:12" no puede estar en el futuro: si aún no son las 09:12, pasa a ser de ayer.
- **D25 (índice de estabilidad):** la tendencia semanal es un índice 0–100 de "estabilidad de voz" (banda personal ≈ centro ± 5–7). Para las semanas nuevas (dispositivo, paciente demo) se calcula con `stabilityScore`, que penaliza la desviación relativa de cada biomarcador respecto a la línea base del paciente. Es guionizado, no es un modelo.
- **D26 (sync del dispositivo en la tendencia):** las sesiones importadas solo añaden semanas **posteriores** a la última semana del seed (Robert tiene 13 semanas; el sync del día de la final añade la semana del 16 de noviembre y llega a 14). No se reescriben semanas existentes. Volver a sincronizar no duplica sesiones (se identifican por id).
- **D27 (paciente demo):** edad "—" (`age: null`). Tiene 3 semanas de historia sembrada más las semanas reales de este navegador, banda discontinua (en construcción) y racha = 46 + días distintos con sesión. Si su última sesión es "attention", pasa a **watch** en la clínica (no a "alert": la alerta del vídeo es la de Margaret).
- **D28 (resolución de audio):** primero la grabación en IndexedDB (`audioKey`), después el clip de muestra incluido (`audioSrc`), y si no hay ninguno, "audio not in demo". Los clips sintéticos del seed (`public/sample-audio/`) salen de `npm run gen:audio`, que es determinista. Solo tienen audio las 3 sesiones más recientes de cada paciente sembrado.
- **D29 (importación robusta):** se acepta que el usuario elija la unidad entera, la carpeta `VOXWAVE` o una carpeta superior, sin distinguir mayúsculas. Se ignoran carpetas del sistema y campos desconocidos. Las sesiones o actividades inválidas se saltan con un aviso, y el audio que falta solo genera un aviso. Si falta el estado de la sesión, `deviceAlertShown: true` cuenta como "attention". El fallback del panel demo descarga `public/sample-device/` con `fetch` y descarta las respuestas HTML que devuelve el rewrite de Vercel para ficheros inexistentes.
- **D30 (tests):** Vitest con `TZ=Europe/Vilnius` fijo para probar la regla de "today" tal como se usará en la final. Los tests se comprueban con su propio `tsconfig.test.json`, así los tipos de Node no entran en la app.

## 2026-11-03 — Hito 3 (clínica: dashboard, detalle, informe)

- **D31 (24 pacientes literales con el paciente demo):** cuando alguien crea el paciente demo, este sustituye al último de los 16 pacientes de relleno, así que el dashboard sigue diciendo "24 patients monitored" como el vídeo.
- **D32 (adherencia):** "92 % adherence this week" es una constante (`WEEK_ADHERENCE_PCT`, brief §10). No se calcula.
- **D33 (orden del grid):** Alert → Watch → New → Device → Stable (el brief no ubicaba Device). Dentro de cada estado, los pacientes principales van antes que los de relleno, y después por última sesión.
- **D34 (barra lateral):**
  - "Patients" lleva al grid del dashboard.
  - "Device sync" abre el modal de sincronización; hasta el hito 6 muestra un aviso.
  - "Reports" abre el informe de P-0187, que es el del guion de la demo.
- **D35 (login):** la sesión de la clínica se guarda en este navegador. "Reset demo" no la cierra (D23).
- **D36 (biomarcadores):**
  - **Título:** "Biomarkers · today" solo si la última sesión es de hoy; si no, "latest session (fecha)" (regla D19).
  - **Colores del delta:** ≤7 % teal, ≤15 % ámbar, más coral. Son umbrales guionizados, no clínicos.
  - **Anillo:** marca la línea base con un tick.
- **D37 (Live check-in):** muestra la sesión más reciente de toda la clínica. La onda es sintética (generada con semilla a partir del id de la sesión) y los botones reproducen el audio real o el clip de muestra. En el hito 5 pasará a mostrar la sesión que llega del paciente.
- **D38 (tendencia):** el eje X son siempre las 14 semanas que terminan en la semana actual. Las tendencias cortas (Susan, paciente demo) quedan a la derecha. A Robert le falta la última semana hasta el sync. La anotación coral se sitúa a la izquierda de los puntos fuera de banda, a su altura, para no tapar el eje.
- **D39 (informe):**
  - **Formato:** página A4 real (210 × 297 mm, blanco puro `#fff`). `@page { size: A4; margin: 0 }`; al imprimir se ocultan la barra, el grano y la sombra.
  - **Contenido:** el título es "Pre-visit voice report" y el periodo son las 14 semanas.
  - **Calidad:** las incidencias se cuentan con las sesiones del periodo.
  - **Sin verificar:** he medido que cabe exactamente en 1123 px de alto, pero no he probado el diálogo de impresión real.
- **D40 (fechas):** meses de tres letras fijos ("Sep", no el "Sept" de en-GB).
- **D41 (detalle técnico):** en Chrome reciente `window.scrollTo` devuelve una Promise. Un `useEffect(() => window.scrollTo(...))` se la pasaba a React como cleanup y rompía la navegación ("destroy is not a function"), así que los efectos usan cuerpo con llaves. `lib` de TypeScript sube a ES2023 (`findLastIndex`; Safari ≥ 15.4).

## 2026-11-03 — Hito 4 (portal del paciente)

- **D42 (formato de grabación):** se elige el primer tipo que `MediaRecorder.isTypeSupported` acepte, en este orden: `audio/webm;codecs=opus`, `audio/webm`, `audio/mp4;codecs=mp4a.40.2`, `audio/mp4`, `audio/aac`, `audio/ogg;codecs=opus`.
  - Chrome y Android graban webm/opus; Safari (iOS y macOS) graba mp4/aac.
  - Si no existe `isTypeSupported`, se deja elegir al navegador (`''`) y se guarda `recorder.mimeType`.
  - Con el blob se guarda el tipo sin codecs (`audio/mp4`).
- **D43 (micrófono):**
  - Se pide al pulsar el primer "I'm ready", no al cargar la página.
  - El `AudioContext` se crea y se reanuda dentro del toque, antes de esperar el permiso, porque iOS solo deja arrancar audio desde un gesto.
  - `autoGainControl: false`, para que el RMS refleje la voz; cancelación de eco y supresión de ruido activadas.
  - El micro se libera al terminar o al salir de la sesión.
- **D44 (modo demo):**
  - **Fallo al pedir el micro:** si se deniega, no hay micro o falla, sale una hoja con "Continue in demo mode" y "Try again" ("Try again" no aparece cuando no hay micro).
  - **Fallo a mitad de sesión:** si el micro se pierde (se desconecta o se revoca el permiso), las actividades restantes siguen en modo demo automáticamente.
  - **Aviso:** se muestra la etiqueta "Demo mode · no microphone".
  - **Qué es real:** la onda es sintética y las duraciones son reales; no hay sonoridad.
- **D45 (sesiones en modo demo):** se marcan con `simulated: true`. La clínica reproduce los clips de muestra y muestra un chip "Demo mode". Si hay micro real pero no hay fichero (sin MediaRecorder o IndexedDB falla), esa actividad queda **sin audio**: nunca se hace pasar un clip de muestra por la voz del paciente.
- **D46 (tiempos):**
  - Cuenta atrás de 3-2-1, a 0,75 s por número.
  - "Aah": 5 s.
  - Lectura: 6,5 s. Karaoke: primera palabra a los 0,5 s y una cada 0,78 s.
  - Chat: "Finish" se activa a los 3 s; termina solo a los 30 s.
- **D47 (publicación):**
  - **Cuándo:** la sesión se guarda y se anuncia a la clínica al terminar "Analysing", después de que se completen todos los guardados en IndexedDB.
  - **Identificadores:** el id es `S-DEMO-<marca de tiempo en base36>` y las claves de audio son `sessionId/activityType`.
  - **Resultado:** el "stable"/"attention" sale de `nextResult` (control de la demo).
- **D48 (Analysing):** unos 3 s. Las tres ondas se calman sobre navy y la pantalla "se ilumina" a papel para que el símbolo se dibuje con sus colores reales (el trazo navy no se vería sobre navy). Con movimiento reducido dura ~1,4 s.
- **D49 (calendario del paciente):**
  - **Historia sembrada:** 46 días hechos antes de hoy, fallo el día 47 (el inicio de la racha) y, antes, un 82 % de días hechos con semilla fija.
  - **Rachas:** la mejor racha sembrada es 52. Al terminar la sesión de hoy, la racha pasa de 46 a 47 (igual que en la clínica).
  - **Ensayos:** el home muestra "Practise again" cuando ya está hecho, para poder ensayar varias veces.
- **D50 (pantallas bajas):** si la pantalla de la sesión mide menos de 700 px de alto (iPhone SE o el marco en un portátil pequeño), se reducen márgenes, tipografía y onda, para que "Finish" y "I'm ready" no queden fuera de pantalla. En la lectura, la frase va encima de la onda (brief §6.3).
- **D51 (marco de teléfono):** a partir de 640 px de ancho se muestra un marco de teléfono centrado; en móvil, pantalla completa con márgenes de safe-area y sin barra de scroll visible.
- **D52 (lo que no he podido probar):** el navegador integrado bloquea el micrófono, así que solo he probado el camino "permiso denegado → modo demo" de punta a punta. La grabación real, el mp4 de iOS y la onda con voz real necesitan una prueba en dispositivo (lista en el chat).

## 2026-11-03 — Hito 5 (hand-off paciente → clínica)

- **D53 (dónde se escucha):** el aviso de sesión nueva se escucha en el shell de la clínica, no solo en el dashboard, así que llega en cualquier página de la clínica. Al llegar `session:new`:
  - **Toast:** "New session received · {name} · just now", con enlace a la ficha. El subtítulo dice "Live check-in is replaying it" o, si es modo demo, "Done in demo mode".
  - **Tarjeta:** la del paciente salta arriba del grid (animación `layout`) con un brillo coral y la etiqueta "Just now".
  - **Duración:** el destacado dura hasta que se recarga la página; si no, la tarjeta volvería a su sitio a mitad de la demo.
- **D54 (Live check-in con la voz real):**
  - **Onda:** las barras son la envolvente de la grabación real, decodificada en el navegador con `OfflineAudioContext` (no necesita gesto y no suena). Mientras no hay reproducción, un cabezal la recorre en bucle ("replay"); al reproducir, sigue el progreso del audio.
  - **Qué actividad muestra:** el chat por defecto, o la que se esté reproduciendo.
  - **Respaldo:** si no se puede decodificar, vuelve a la onda sintética.
  - **Llegada:** un anillo coral marca la sesión que llega y la hora pasa a "Just now".
- **D55 (sin reproducción automática):** el audio no suena solo, porque los navegadores bloquean el audio sin un gesto previo. En el escenario se pulsa "Chat" (o "Aah"/"Read") en la propia tarjeta.
- **D56 (pestañas en segundo plano):** `requestAnimationFrame` se detiene en pestañas ocultas, así que el fin automático de cada actividad tiene también un `setTimeout` de respaldo. En el escenario las dos ventanas están visibles y no afecta, pero así una sesión no se queda colgada si el paciente cambia de pestaña.
- **D57 (cómo se verificó):** con dos pestañas reales del mismo navegador.
  - **Sesión en modo demo:** completa, hecha por la interfaz (el micro está bloqueado aquí).
  - **Sesión con blob real:** un WAV guardado en IndexedDB y publicado por el mismo camino. La pestaña de la clínica lee el blob (384 KB) y lo reproduce vía `blob:`.
  - **Pendiente:** la grabación de micrófono real sigue pendiente de probar en dispositivo (D52).

## 2026-11-03 — Hito 6 (sync del dispositivo USB)

- **D58 (audio del USB de ejemplo):** `npm run gen:audio` genera los 21 WAV que referencia `sessions.json`. Son sintéticos, a 8 kHz mono (3,6 MB en total) y usan las duraciones del propio JSON. El Raspberry Pi escribirá los suyos. De paso, el generador ahora redondea las muestras (antes truncaba), así que los tres clips del seed cambian ligeramente; siguen siendo deterministas.
- **D59 (cómo se elige la carpeta):**
  - **Chrome y Edge:** `showDirectoryPicker({ mode: 'read' })`. Si el usuario cancela, el modal se queda en el paso de conectar, sin mensaje de error.
  - **Safari y Firefox:** `<input webkitdirectory>` oculto.
  - **Muestra incluida:** `openSync('sample')` importa `public/sample-device/` con la misma animación. Es la puerta que usará el panel demo (hito 7, §8.3 paso 5).
  - Ninguna de las tres vías escribe en la unidad.
- **D60 (animación):** las sesiones van apareciendo una a una cada 420 ms.
  - **Durante el import:** el anillo de progreso y la pantalla del dispositivo cuentan "SYNC n/7", y los paquetes coral/teal recorren el cable.
  - **Al terminar:** se guardan las sesiones y el audio (IndexedDB) y la tarjeta de Robert salta arriba con brillo.
  - **Texto final:** "Synced 7 sessions · last one {today 08:05 | fecha}" (regla D19).
  - **Mientras importa** el modal no se puede cerrar.
- **D61 (re-sincronizar):** se reemplazan las sesiones por id (sin duplicar). Si la nueva lectura no trae audio de una actividad, se conserva el de un sync anterior (`mergeSyncedSessions`).
- **D62 (errores):**
  - **Mensajes al usuario:** carpeta sin VoxWave, formato desconocido, paciente distinto o dispositivo sin sesiones dan un mensaje claro y "Try again".
  - **Avisos internos:** el audio que falta o los campos desconocidos no son errores; se registran en la consola como avisos.
- **D63 (bug encontrado al probar):** en el input de reserva, `e.target.files` es una lista viva; al vaciar `value` (para poder elegir la misma unidad otra vez) se vaciaba también y el import recibía 0 ficheros. Ahora se copian antes. En Safari o Firefox, elegir la unidad no habría hecho nada.
- **D64 (Live check-in y dispositivo):** "Just now" solo aparece si la sesión tiene menos de 10 minutos. Las sesiones que trae un dispositivo son de días anteriores y muestran su fecha.
- **D65 (lo que no he podido probar):** el diálogo nativo de `showDirectoryPicker` y una memoria USB real. Ambos van en la lista de pruebas manuales. La tendencia de Robert solo gana la semana del 16 de noviembre si la fecha es esa semana (D26); está cubierto por tests con la fecha de la final, pero hoy, 3 de noviembre, no se ve en la interfaz.

## 2026-11-03 — Hito 7 (panel demo y reloj de ensayo)

- **D66 (reloj central y zona horaria):** toda la app pregunta la hora a `now()` (`src/data/clock.ts`) y calcula "hoy", semanas y horas en una zona explícita (`src/data/tz.ts`, con `Intl`).
  - **Normal:** la zona es la del navegador.
  - **Modo ensayo:** es "20 de noviembre de 2026 en Vilnius" a la hora actual de Vilnius, y el tiempo sigue corriendo. La zona se fija en `Europe/Vilnius` aunque el portátil esté en otra (p. ej. España), así el USB dice "today 08:05" y no "today 07:05".
  - **Nada se toca:** los datos importados del dispositivo no se modifican; solo cambia "ahora". Lo comprueba un test que corre con el proceso en hora de Madrid.
- **D67 (activar y desactivar el ensayo):** el ajuste `rehearsal` se guarda en el store.
  - **Al arrancar:** se aplica antes del primer render.
  - **Al cambiarlo:** se **recarga** la página (en esta ventana y en la otra, vía el evento `storage`) para recalcular todas las fechas de golpe y no mezclar dos relojes.
  - **Visibilidad:** mientras está activo se ve un aviso discreto abajo a la izquierda ("Rehearsal · 20 Nov 18:29 Vilnius") que abre el panel.
  - **Durante el ensayo:** las sesiones del paciente y la hora de sync usan el reloj de ensayo; Reset las borra.
- **D68 (panel demo):** se abre con Shift + D (salvo si se está escribiendo en un campo: escribir "David" no lo abre) o con `?demo=1`, y se cierra con Esc o Shift + D. Va montado en un layout raíz, así que está en todas las páginas y en ambas ventanas. Controles del §11:
  - **Next result:** Stable / Attention.
  - **Simulate session from patient:** crea a Alex si no existe y publica la sesión. La anuncia a la otra ventana **y a esta** (`dispatchLocal`, porque BroadcastChannel no se envía a sí mismo). Se marca `simulated` (la clínica muestra "Demo mode"), para no hacer pasar audio de muestra por una grabación real.
  - **Load device data:** va al dashboard (iniciando sesión si hace falta) y abre el sync con la muestra incluida, con la misma animación.
  - **Trigger P-0187 alert animation:** va al dashboard y repite la entrada del banner.
  - **Today is 20 Nov 2026:** el reloj de ensayo (D66–D67).
  - **Reduced motion.**
  - **Reset demo.**
- **D69 (Reset = estado inicial):** borra sesiones, syncs, notas, visitas, el paciente demo y las grabaciones en IndexedDB. Además, el próximo resultado vuelve a stable, el movimiento a "system" y el ensayo se apaga. Solo se conserva el login de la clínica (montaje del escenario, D35). Después recarga esta ventana y la otra, que vuelve a "welcome" si estaba en el paciente.
  - **Bug encontrado al probar:** con el ensayo activo, cambiar el estado provocaba la recarga antes de terminar de borrar el audio (quedaban 21 grabaciones). Ahora se borra el audio primero. Verificado: 0 grabaciones después de Reset.

## 2026-11-03 — Hito 8 (pulido final)

- **D70 (división por rutas):** cada página de los portales es un chunk aparte (`lazy` de React Router). La landing va en el bundle principal y los guards viven en `app/guards.tsx` para no arrastrar un portal entero.
  - **Tamaños:** el chunk principal ocupa 165 KB, Motion va en uno propio de 260 KB y cada página entre 1 y 21 KB. Ningún chunk supera 500 KB (antes, uno solo de 546 KB).
  - **Precarga:** `RootLayout` precarga todas las páginas en cuanto el navegador está libre, para que en el escenario ninguna navegación espere a una descarga.
  - **Carga directa:** mientras carga una página aparece un `HydrateFallback` en papel (sin destello blanco y sin el aviso de React Router).
- **D71 (fuentes locales):** Sora e Inter se incluyen con `@fontsource-variable` en lugar de Google Fonts. Así no hay ninguna petición a terceros (§15 "nothing is sent to any server") y la demo funciona aunque falle el wifi del recinto. Por `unicode-range`, el navegador solo descarga el subconjunto latino (~82 KB).
- **D72 (movimiento reducido real):** el interruptor "Reduced motion" del panel solo afectaba a las animaciones de Motion. Ahora un hook propio (`design/useReducedMotion`) combina la preferencia del sistema y el interruptor, y lo usan las ondas en canvas, los gráficos que se dibujan, los contadores y el confeti. Una clase `html.reduce-motion` aplica las mismas reglas CSS que `prefers-reduced-motion`. Verificado: con el interruptor activo, los contadores muestran el valor final al instante y los `animate-ping` duran 0,01 ms con una sola iteración.
- **D73 (vista previa al compartir e iconos):** se añaden `og-image.jpg` (1200 × 630, generada con el logo oficial y las fuentes incluidas), `apple-touch-icon.png` (180 × 180; iOS no acepta SVG) y metadatos Open Graph y Twitter. **Pendiente:** los crawlers quieren `og:image` con URL absoluta, así que hay que cambiar `/og-image.jpg` por `https://<dominio de Vercel>/og-image.jpg` cuando exista el dominio.
- **D74 (iOS):** al bloquear la pantalla, recibir una llamada o cambiar de app, iOS suspende el `AudioContext` (`interrupted`). Ahora se reanuda al volver (`visibilitychange`, `pageshow`, `focus`). Se suma a lo ya hecho: contexto creado dentro del toque (D43), mp4/aac (D42), modo demo si se pierde el micro (D44) y fin por temporizador aunque la pestaña quede oculta (D56).
- **D75 (cambios tras ensayar el §13):**
  - **Orden del grid:** un paciente que acaba de llegar sube arriba, pero **nunca por encima de una alerta**. En el ensayo, Alex desplazaba a Margaret y el clic siguiente del guion abría a otro paciente. En el escenario, Margaret se abre con "Open patient" del banner, que no se mueve nunca.
  - **Tiempos de la sesión:** se recortan ~2,6 s de espera muerta. La cuenta atrás pasa de 0,75 a 0,6 s por número (sustituye a D46), el check entre actividades de 1,15 a 0,9 s, y "Analysing" de 3,05 a 2,6 s (sigue dentro de los 2–3 s del brief; sustituye a D48).
  - **Toasts:** pasan a abajo a la derecha (sustituye a la posición de D53), porque tapaban "Sync VoxWave device" durante 7 s.
  - **Aviso de ensayo:** su hora se refresca cada 30 s.
- **D76 (accesibilidad):** el consentimiento de la bienvenida tiene ahora `role="checkbox"`, `aria-checked` y una etiqueta; antes era un botón sin nombre accesible. El pie "Prototype · illustrative data · not a medical device" se añade a la sesión del paciente y a "Analysing", las dos pantallas donde faltaba.

## 2026-11-03 — Correcciones de la revisión (`VOXWAVE-FALLOS.md`)

- **D77 (Live check-in: la sesión que llega gana) · fallo 1:**
  - **Qué muestra:** la sesión anunciada por la ventana del paciente (`liveSessionId`, fijado al recibir `session:new`). El texto del toast y la tarjeta hablan ya de la misma sesión.
  - **Sin anuncio:** la más reciente **que ya haya ocurrido**.
  - **Sesiones con fecha futura:** las de un dispositivo (el USB de muestra está fechado para la final) conservan su fecha real (D66) pero nunca ocupan la tarjeta.
  - **Fuera del modo ensayo:** la ficha de Robert sigue mostrando "latest session (20 Nov)", porque es la fecha real del dispositivo. El modal de sync lo explica cuando pasa: "Dates come from the device, whose clock is ahead of this computer's". Para ensayar como en la final, usar "Today is 20 Nov 2026".
- **D78 (estado de cada sesión = su semana) · fallo 2:** en el seed, una sesión es "attention" exactamente cuando su semana está fuera de la banda. Así la lista, el gráfico, el informe y "2 weeks outside personal baseline" siempre cuadran. Margaret tiene ahora 16 sesiones, para que cualquier día la lista muestre también sesiones anteriores, dentro de la banda. Las sesiones de semanas dentro de la banda llevan métricas cercanas a la línea base. Un test lo comprueba en dos fechas (un martes y el viernes de la final).
- **D79 (vista previa al compartir) · fallo 3:** `og:image`, `twitter:image` y el nuevo `og:url` usan URLs absolutas de `https://vox-wave-mvp.vercel.app`. Sustituye al pendiente de D73.
- **D80 (modo demo sin segundo toque) · fallo 4:** "Continue in demo mode" arranca la cuenta atrás directamente; el paciente ya había pulsado "I'm ready".
- **D81 (modal de sync en pantallas bajas) · fallo 5:** el modal es una columna con cabecera, cuerpo con scroll y pie fijo, así "Done" y "Open Robert's sessions" siempre se ven. Durante el import la ilustración se reduce y las filas son más compactas. Verificado a 1024 × 768: cabe entero sin scroll.
- **D82 (ficha del paciente) · fallos 6 y 7:**
  - **Identificador:** se muestra una sola vez ("Patient 0187"), en la ficha y en el informe.
  - **Canal:** "Home device" con el id del dispositivo en una segunda línea pequeña e icono alineado.
  - **Columnas:** la fila de datos usa 5 columnas solo desde 1280 px (antes, 1024 px, donde se partía en 3 líneas).
- **D83 (hoy hecho en el calendario) · fallo 8:**
  - **Hoy hecho:** teal como cualquier día hecho, con anillo coral y ✓.
  - **Hoy pendiente:** contorno coral. La leyenda "Today" ahora es un contorno.
  - **Antes:** hoy hecho era coral sólido, igual que la leyenda "Today", y no se distinguía.
  - **Lectores de pantalla:** anuncian "Today: done" / "Today: not done yet".
- **D84 (panel demo) · fallo 10:** más compacto (264 px) y **arrastrable** por su cabecera, sin salirse de la ventana y sin seleccionar texto al arrastrar. Recuerda dónde se dejó (solo en ese navegador, `localStorage`; si no está disponible, vuelve a su sitio).
- **D85 (nombres accesibles) · fallo 9 y más:**
  - **Panel:** los radios Stable/Attention, el grupo "Next result" y los interruptores tienen nombre.
  - **Fuera del panel (la revisión solo miró el panel):** por debajo de 1024 px la barra lateral muestra solo iconos, así que sus enlaces, el logo y "Schedule a visit" también tienen nombre ahora.

## 2026-11-03 — Correcciones de la 2.ª revisión (`VOXWAVE-FALLOS-v2.md`)

- **D86 (avisos arriba en el centro) · fallo 1:** los avisos de ajustes no habituales ("Rehearsal · …" y el nuevo "Next result: Attention") van en una pila arriba en el centro, en el hueco libre entre la fecha y la clínica del encabezado. Antes, abajo a la izquierda, tapaban el pie "Prototype · illustrative data · not a medical device" de la barra lateral. Al pulsarlos se abre el panel.
- **D87 ("Next result" de un solo uso) · fallo 2:** el resultado elegido se aplica a la **siguiente sesión** y luego vuelve solo a "Stable" (en `addPatientSession`, así vale para la sesión real y para "Simulate session"). Mientras está en "Attention" se ve el aviso coral "Next result: Attention". El panel lo indica: "Next result · one session". Ya no hace falta recordar pulsar Reset para que la demo salga estable.
- **D88 (fechas del dispositivo en la ficha) · fallo 3:** la ficha muestra la misma nota que el modal ("Session dates come from the home device, whose clock is ahead of this computer's") cuando el paciente tiene sesiones del dispositivo con fecha posterior a "ahora". El día de la final, o con el reloj de ensayo, no aparece. Las fechas siguen sin reescribirse (D66).
- **D84 (corrección):** la animación de entrada y salida del panel animaba `y` y sobrescribía la posición vertical guardada al arrastrar, así que el panel solo recordaba la horizontal. Ahora solo anima opacidad y escala. Verificado: misma posición tras arrastrar, cerrar, reabrir y recargar.

## 2026-11-03 — Correcciones de la 3.ª revisión (`VOXWAVE-FALLOS-v3.md`)

- **D89 (avisos en móviles estrechos) · fallo 1:** la pila de avisos se ajusta al ancho (`max-w-[calc(100vw-16px)]`, `flex-wrap`) y por debajo de 640 px los textos se acortan ("Rehearsal · 20 Nov", "Attention"), de modo que los dos caben hasta en 320 px.
- **Orden de este fichero · fallo 2:** al añadir secciones nuevas siempre se insertaban encima de la línea de D20, que fue quedando al final; D21 y D22 se habían colado en "Fechas de la final" por la misma razón. D20 vuelve detrás de D7, D21 tiene su propia sección ("Logo oficial") y D22 abre la del hito 2. Hay una línea en blanco antes de cada encabezado. Las secciones nuevas se añaden al final.

## 2026-11-04 — Revisión propia de la web publicada

- **D90 (notas por paciente) · prioridad media:** al pasar de un paciente a otro sin salir de la ficha (enlace del aviso, atrás/adelante), el borrador del primero se guardaba en el segundo. Reproducido en la web publicada: la nota de Margaret acabó en Alex. Ahora el cuadro de notas se reinicia por paciente (`key`). Además, lo escrito en el último medio segundo se guarda al salir de la ficha en lugar de perderse.
- **D91 (teclado en el modal de sync):** al abrirse, el foco entra en el modal. Esc lo cierra, salvo durante la importación. Tab y Shift+Tab no salen del modal y, al cerrar, el foco vuelve a quien lo abrió. Antes el foco se quedaba detrás y el tabulador navegaba el dashboard.
- **D92 (impresión):** el panel demo, sus avisos y los toasts llevan `no-print`. Si el informe se imprimía con el modo ensayo activo, el aviso "Rehearsal" salía en el PDF.
- **D93 ("Just now" con caducidad):** la etiqueta "Just now" de la tarjeta de un paciente recién llegado dura 10 minutos, igual que en el Live check-in (D64); antes duraba hasta recargar. La tarjeta sigue arriba (D75), solo cambia la etiqueta.
- **D94 ("Demo patient"):** el paciente demo se nombra "Demo patient" en la ficha, el informe y el Live check-in, en vez de "Patient DEMO".
- **D95 (pie en "Patient not found" del informe):** el informe de un paciente inexistente también lleva "Prototype · illustrative data · not a medical device".
- **D96 (redirecciones que conservan el destino):** los guards conservan la query (`?demo=1`). El login devuelve a la página a la que se iba, por ejemplo `/clinic/patients/P-0187?demo=1`, y si no, al dashboard con la misma query.
- **D97 (resultado solo de hoy):** abrir `/patient/result` sin venir de una sesión solo muestra el resultado si es de hoy; si no, lleva al home. Antes podía enseñar "Session complete" de una sesión antigua.
- **D98 ("Sign out" en pantallas estrechas):** por debajo de 1024 px la barra lateral es una barra superior sin botón de salir. Ahora tiene uno, solo icono y con nombre accesible.
- **Tests:** los del reloj de ensayo calculaban el desplazamiento con una fecha fija (3-nov) y fallaban otro día. Ahora lo calculan con la hora real, como la app, y valen cualquier día. Se añade un test de `patientNumber`.

## 2026-11-04 — Correcciones de la 4.ª revisión (`VOXWAVE-FALLOS-v4.md`)

- **D99 (barra superior de la clínica en móvil) · fallo 1:** con el botón "Sign out" de D98, la barra (logo + "VoxWave" + 5 iconos) medía ~394 px y desbordaba en móvil. Por debajo de 640 px se muestra solo el símbolo del logo, con huecos y márgenes algo menores. La palabra "VoxWave" se oculta con un envoltorio, porque el `inline-flex` del propio `Logo` anulaba un `hidden` pasado como clase. Verificado en el dashboard y en la ficha de Margaret: sin desbordamiento a 320 y 375 px, y con la palabra visible desde 640 px.
- **D100 (Reset desde las páginas del paciente demo) · fallo 2:** tras "Reset demo", una ventana que estuviera en la ficha o el informe de Alex va al dashboard (conservando la query) en lugar de quedarse en "Patient not found". Vale para la ventana donde se pulsa y para la otra, que se recarga con `demo:reset`. Las páginas del paciente ya volvían a la bienvenida por su guard.

## 2026-11-04 — Frase de la lectura en voz alta

- **D101 (frase de "Read this line out loud"):** la frase que lee el paciente pasa de "The river runs past the old mill." (la del brief) a "Read along at this pace.", a petición del cliente. Las palabras se iluminan a un ritmo fijo (0,78 s cada una) y no siguen la voz; con 5 palabras la última se ilumina a los ~4,4 s, dentro de los 6,5 s de grabación. El subtítulo y el resto de la actividad no cambian. (Un primer intento cambió por error el subtítulo en lugar de la frase; ya está deshecho.)
- **D102 (subtítulo de la lectura):** el subtítulo de "Read this line out loud" queda en "Follow the words as they light up."; se quita "At your normal pace.", a petición del cliente. Las palabras se iluminan a un ritmo fijo, así que pedir "tu ritmo normal" se contradecía con ellas.
- **D103 (frase más larga y ritmo más rápido):** la frase a leer pasa a ser "Read along at this pace and follow the highlighted words.", a petición del cliente, y las palabras se iluminan más rápido: cada 0,55 s en vez de cada 0,78 s. Con 10 palabras la última se ilumina hacia los 6 s, dentro de los 6,5 s que dura la grabación, que no cambia.

## 2026-11-15 — Pulido visual para la final (rama `visual-polish`), bloque A

Mejora solo gráfica: no cambia ningún texto, número, dato, flujo ni comportamiento. Capturas antes/después con Playwright (Chrome del sistema, fuera del repo) con la fecha puesta en el 20-nov 10:30 de Vilnius.

- **D104 (tokens, contraste AA y texto sobre coral):**
  - **Paleta del §4.1 intacta.** Se añaden tonos derivados en `tokens.css`: `ink-muted` (navy al 68 %, 5,2:1 sobre papel) para el texto secundario pequeño, porque `inkSoft` (55 %) se queda en 3,5:1; `coral-ink` (`#ad4729`, 4,7:1) para texto coral pequeño y `coral-strong` (`#d85b35`, 3,2:1) para cifras grandes; `stable-ink` y `watch-ink` para el texto de los chips; `ink-hairline` para filetes dentro de una tarjeta.
  - **Texto sobre coral:** navy en lugar de blanco (5,7:1 frente a 2,6:1), decidido por el equipo. Está en un solo token, `--color-on-coral`; ponerlo en `#f4f8fa` devuelve el blanco en toda la app.
  - **Sombras:** tres niveles neutros (`shadow-card`, `shadow-raised`, `shadow-overlay`) y `shadow-action` bajo los botones coral. Se quitan los resplandores coral sobre papel (§4.1: sin glows).
  - **Foco:** anillo en dos tonos (contorno coral + anillo interior navy), visible sobre papel, navy y coral. El coral solo era 2,4:1 sobre papel.
  - **Botones:** clases `.btn` (capa de tinte que aparece al pasar el ratón y se intensifica al pulsar) y `.btn-press` (escala al pulsar). Solo cambian opacidad y transform.
  - **Lint:** el repo no tiene linter y no se añade ESLint (decisión del equipo); valen el tipado estricto de `npm run build` y `npm test`.
- **D105 (sesión del paciente):**
  - **Temporizador:** el anillo va encima de la onda, con los segundos dentro; antes de grabar muestra el icono de la actividad, así nada salta al empezar.
  - **Onda:** ocupa la altura que queda en pantalla (hasta 230/150/180 px según la actividad) en lugar de alturas fijas; sustituye a los tres tamaños de D50. Dos anillos de línea detrás de la onda crecen con el volumen (opacidad y transform, sin estado de React).
  - **Karaoke:** las palabras sin leer pasan del 35 % al 50 % de blanco (3,0:1 → 4,7:1). Cada palabra son tres copias superpuestas que se funden por opacidad, en vez de animar el color.
  - **Barra de progreso:** se desliza con `translateX` en vez de animar `width`.
  - **Probado:** con una señal de voz en el micrófono simulado de Chrome (`--use-file-for-fake-audio-capture` con `public/sample-audio/chat.wav`): la onda y los anillos siguen el volumen y la sesión termina, a 320×568, 375×667, 375×812 y en el marco de portátil a 1024×768. **Sin verificar:** un micrófono físico con una voz real.
- **D106 (dashboard):**
  - **Cifras del vídeo:** "24 patients monitored" queda solo en el titular; las otras tres (1 · 92 % · 1) van en una tira debajo. Antes el 24 salía dos veces seguidas. Las cuatro están en la primera pantalla a 1440×900 y a 1024×768.
  - **Tarjetas de paciente:** la tendencia ocupa el ancho de la tarjeta; canal, última sesión y racha comparten una fila al pie. El destacado de "recién llegado" pulsa con transform y opacidad en vez de `box-shadow`.
  - **Live check-in:** entre 768 y 1280 px es una sola fila (quién, onda, clips), para que los pacientes no queden fuera de la primera pantalla a 1024×768.
- **D107 (ficha del paciente):**
  - **Primera pantalla a 1024×768:** nombre y acciones en una fila (entre 1024 y 1280 px los botones pierden el icono) y datos más compactos, de modo que el gráfico entero, con los puntos fuera de banda, se ve sin hacer scroll.
  - **Gráfico:** rejilla más ligera, eje X con una marca por semana, etiquetas de 11 px y línea algo más gruesa. Los puntos fuera de banda son coral macizo con borde del color de la tarjeta. Datos, banda y anotación no cambian: en P-0187 los dos últimos puntos siguen en coral.
  - **Biomarcadores:** anillos más grandes (hasta 136 px) con una muesca en la línea base. Las cifras (1,8 % · 124 Hz · 4,2 syl/s · 0,38 s) y los deltas (+38 %, −5 %, −9 %, +31 %) son los mismos.
  - **Sesiones:** tres columnas alineadas según el ancho de la propia lista (container query); los clips que no están en la demo pierden el contorno para que destaquen los reproducibles. Las notas se quedan a la vista mientras la lista se desplaza.

## 2026-11-15 — Pulido visual para la final, bloque B

- **D108 (landing):**
  - **Onda:** ya no pasa por encima del titular. En portátil cruza la página a la altura del símbolo y se desvanece a su alrededor (hueco en píxeles desde el centro, válido a cualquier ancho); en móvil no cabe junto al logo y va de lado a lado justo debajo.
  - **Titular:** más grande y equilibrado; desde 640 px, una línea en tinta y otra en coral. "check-in" y "Parkinson's —" no se parten entre líneas. La frase coral usa `coral-strong` (3,2:1; el coral de marca es 2,4:1 sobre papel).
  - **Entrada:** logo, onda, titular, subtítulo y cada botón entran en secuencia.
- **D109 (home del paciente):** la onda va bajo el saludo en vez de cruzarlo. En la racha manda el número (48 px). "Today's session" muestra las tres actividades como una secuencia (iconos en aros unidos por una línea) y "3 min" como chip. No se añade ni cambia ningún texto (condición del equipo).
- **D110 (analysing y resultado):**
  - **Analysing:** solo anima transform y opacidad. Las ondas se aplanan con `scaleY` (dentro del SVG, para que el trazo no adelgace) en vez de transformar el `path`, y la pantalla "se ilumina" con un disco de papel que crece desde el centro en vez de animar el color de fondo. Los tiempos no cambian (2,6 s; D75).
  - **Resultado stable:** dos aros se abren desde el check una sola vez, la racha va en una tarjeta con la cifra a 44 px y la onda queda en reposo sobre el botón.
  - **Resultado attention:** igual de calmado, sin confeti ni aros, con la onda más tenue.
- **D111 (informe):**
  - **Aspecto de documento clínico:** membrete con filete grueso, línea de paciente, resumen con filete coral lateral, títulos de sección en versalitas sobre un filete y los cuatro biomarcadores en una tabla (medida, valor, línea base, cambio). Mismo contenido y mismas cifras; sigue en blanco puro (D39).
  - **Una página A4, comprobado con PDF:** impreso por la misma vía que `window.print()` para P-0187, P-0142, P-0231 y P-0156, con el panel demo abierto y el aviso de ensayo activo: 1 página cada uno, 210 × 297 mm, sin panel, avisos ni grano. Cierra el "sin verificar" de D39 salvo el diálogo de impresión del sistema, que sigue sin probarse a mano.

## 2026-11-15 — Pulido visual para la final, bloque C

- **D112 (modal de sync):**
  - **Dispositivo más físico:** carcasa con labio inferior, marco del OLED, rejilla de micrófono, botón arcade, LED de estado, puerto USB-C y conectores en los dos extremos del cable; dispositivo y ordenador sobre un "banco" de papel.
  - **Sin glow:** el resplandor coral difuminado (blur) se sustituye por dos contornos coral que se abren y se desvanecen (§4.1).
  - **Paquetes:** cuadrados pequeños que siguen el cable con transformaciones x/y (curva de Bézier muestreada) en vez de `offset-path`; la línea discontinua ya no anima `stroke-dashoffset`.
  - **Igual que antes:** pasos, textos, tiempos de D60 y comportamiento. Sigue cabiendo entero a 1024 × 768 (D81).
- **D113 (progreso del paciente):** el calendario pasa a una fila por semana con el mes escrito donde empieza ("Oct", "Nov"; meses fijos de tres letras, D40) y celdas redondas como la tira semanal del home. Las tarjetas de racha llevan la cifra a 40 px y el icono en un chip. Los estados de D83 (hoy hecho / hoy pendiente) y sus etiquetas para lectores de pantalla no cambian.
- **Pendiente de este pulido (no hecho):**
  - **Bienvenida, login y toasts:** solo reciben los tokens (texto navy sobre coral, texto secundario, sombras); no se han rediseñado.
  - **Panel demo:** no se toca (condición del equipo). Su interruptor sigue animando `left` y sus botones mantienen texto blanco sobre coral.
  - **Animaciones que no son transform/opacity y se mantienen:** los trazos que se dibujan (gráficos, anillos, check, logo) usan `stroke-dash`, que el §4.4 pide expresamente; el temporizador circular de la sesión y el anillo de progreso del sync también. La barra de tiempo de los toasts sigue animando `width` (pantalla no tocada).
  - **Sin verificar a mano:** micrófono físico con voz real (D105), diálogo de impresión del sistema (D111), la preview de Vercel (pide iniciar sesión en Vercel) y el aspecto en iPhone/Android reales.

## 2026-11-19 — Datos compartidos entre dispositivos con Supabase (rama `supabase-sync`)

- **D114 (Supabase, sin cuentas):** a petición del cliente, lo que crea la demo se guarda en Supabase para que todos los dispositivos vean los mismos datos (se graba en el móvil y se escucha en el portátil). Cambia el "sin backend / nada sale del navegador" del brief (§2, §9.3, checklist del §13).
  - **Qué se comparte:** paciente demo (nombre), sus sesiones, sesiones de dispositivos sincronizados, notas del clínico, visitas programadas, "next result" y el reloj de ensayo (para que móvil y portátil estén de acuerdo en qué día es "hoy"). **Por dispositivo:** inicio de sesión del clínico y "reduced motion".
  - **Semilla:** los 24 pacientes iniciales siguen generándose en el navegador a partir de la fecha (D7) y nunca se guardan. Por eso **"Reset demo"** vacía las tablas y el bucket de audio, y vuelve a quedar solo lo inicial en todos los dispositivos (los demás se recargan). Si no puede borrar en Supabase, no resetea y el panel lo dice.
  - **Tablas:** `demo_sessions` (una fila por sesión, el objeto `Session` en `data`) y `demo_kv` (un valor por fila: `demoName`, `nextResult`, `rehearsal`, `note:<id>`, `visit:<id>`, `device:<id>`), para que dos dispositivos que cambian cosas distintas no se pisen. Audio en el bucket privado `demo-audio`, un objeto por actividad. Esquema en `supabase/schema.sql`.
  - **Tiempo real:** canal de broadcast de Supabase Realtime `voxwave-demo` con los mismos mensajes que el BroadcastChannel; el receptor vuelve a leer de Supabase antes de reaccionar (toast, Live check-in). Además se relee al conectar, al volver a la pestaña y cada 30 s.
  - **Local como copia:** localStorage e IndexedDB guardan una copia para pintar al instante y como respaldo. Sin `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` la app funciona exactamente como antes, solo en este navegador (respaldo para el escenario sin red).
  - **Seguridad:** sin cuentas, la clave publicable va en el bundle y RLS permite leer y borrar a cualquiera que la tenga. Aceptable con pacientes ficticios; nunca meter datos reales en este proyecto.
  - **Configurar:** crear un proyecto de Supabase, ejecutar `supabase/schema.sql` en el SQL editor, copiar `.env.example` a `.env.local` con la URL y la clave publicable (Project Settings → API Keys) y poner las mismas dos variables en Vercel (Production y Preview).
  - **Permisos de tabla:** los proyectos nuevos de Supabase no dan permisos de tabla a los roles de la API; `schema.sql` incluye el `grant` para `anon` y `authenticated` (RLS sigue aplicando).
  - **Probado (19-nov, proyecto Supabase "VoxWave"):** una sesión creada en la clínica llega a las tablas; una sesión con audio subida desde otro cliente (script con supabase-js) aparece en directo en la clínica con su toast, y su audio se descarga de Storage para el Live check-in; "Reset demo" deja tablas y bucket vacíos. **Sin verificar:** una grabación real hecha en un móvil físico y el despliegue de Vercel con las variables.
