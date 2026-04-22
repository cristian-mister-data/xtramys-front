# xtramys-front-web

Aplicación web (React + Vite) migrada desde la app móvil **misterdata** (React Native / Expo).

## Stack

- **Build:** Vite 5
- **UI:** React 18 + styled-components
- **Estado:** Redux Toolkit + react-redux
- **Routing:** React Router 6
- **Pizarra táctica:** konva + react-konva
- **Vídeo:** MediaRecorder + ffmpeg.wasm (`@ffmpeg/ffmpeg`)
- **i18n:** i18next + react-i18next

## Requisitos

- Node 18+
- Backend `misterdata-back` corriendo en local (por defecto en `http://localhost:4000`).

## Variables de entorno

Copia `.env.example` a `.env`:

```
VITE_BACKEND_URL=http://localhost:4000
VITE_AUTH_MODE=cookie       # cookie | bearer
```

- `cookie` (recomendado web): la sesión la mantiene el backend con una cookie httpOnly. El cliente axios envía `withCredentials: true`. El backend ya soporta este modo (ver migración cookie-parser + setAuthCookie).
- `bearer`: usa `Authorization: Bearer <token>` desde `localStorage` (modo legacy / móvil).

> El backend acepta **ambos** simultáneamente, así que la app móvil sigue funcionando.

## Scripts

```bash
npm install
npm run dev        # arranca Vite en http://localhost:5173
npm run build
npm run preview
npm run lint
```

> El servidor de desarrollo emite las cabeceras `Cross-Origin-Embedder-Policy: require-corp` y `Cross-Origin-Opener-Policy: same-origin` que ffmpeg.wasm necesita para `SharedArrayBuffer`.

## Estructura

```
src/
  api/              # Servicios HTTP (axios) — uno por dominio
  auth/             # Persistencia local de token / usuario
  store/            # Redux: store, rootReducer y 13 slices/thunks
    slices/<dominio>/{...Slice.js, ...Thunks.js}
  router/           # AppRouter + ProtectedRoute
  layouts/          # AuthLayout, AppLayout, Header, Sidebar
  pages/            # Páginas auth + páginas app (muchas son stubs)
    auth/           # Welcome, Login, Register, VerifyEmail, ForgotPassword, ResetPassword
    public/         # WellnessForm / PreWellnessForm (sin auth, vía token)
  features/
    tacticalBoard/  # Pizarra táctica (konva)
    video/          # Hook MediaRecorder + ffmpeg.wasm
  ui/               # Primitivos y Stub
  locales/          # es.json / en.json
  config.js theme.js GlobalStyles.js i18n.js main.jsx App.jsx
```

## Estado de la migración

### ✅ Hecho

- Scaffolding Vite + alias `@`
- Cliente axios con interceptores (auth, errores, polling de jobs de vídeo)
- 15 servicios HTTP (auth, user, season, team, player, exercise, strategy, session, injury, matchSheet, rival, anthropometry, nutritionMethodology, wellness, tournament, video)
- Store Redux con 13 slices (todos los nombres y action types portados literalmente):
  `temporada`, `equipo`, `jugador`, `ejercicio`, `entrenamiento`, `injury`, `matchSheet`, `rivalAnalysis`, `anthropometry`, `estrategia`, `rival`, `tournament`, `usuario`
- Router protegido + layouts (Sidebar con las 4 secciones del drawer móvil: Principal / Herramientas / Gestión / Análisis)
- Páginas de autenticación: Welcome, Login, Register, VerifyEmail, ForgotPassword, ResetPassword
- Página Home con tiles
- Pizarra táctica básica (campo FIFA completo, 11 vs 11 arrastrables)
- Módulo de vídeo: hook `useStageRecorder` + panel demo + conversión a MP4 vía ffmpeg.wasm
- Formularios públicos de wellness y pre-wellness
- Backend cookie auth: `/auth/me`, `/auth/logout`, middleware con cookie OR Bearer, `setAuthCookie` en login/verifyEmail/google/apple

### ⏳ TODO

Las siguientes páginas son **stubs** que apuntan al fichero original a portar:

- Season, CreateSeason, Tournaments, Players, PlayerProfile
- Exercises (+ subrutas), Strategies (+ subrutas)
- Training (sesiones), MyVideos
- Statistics, Injuries, InjuryStatistics, InjuryPrevention
- MatchSheets, RivalAnalysis (incl. plantillas), Rivals
- Anthropometry, Nutrition, Methodology, GoalkeeperMethodology
- WellnessTemplates, WellnessManagement, Profile (edición)

Pizarra táctica:

- Vistas (`halfLeft`, `halfRight`, `halfUp`, `halfDown`)
- Iconos de balón / conos / formas (líneas, flechas)
- Color picker por jugador
- Captura del Stage konva a vídeo (integrar `useStageRecorder` con la `Stage` ref)

Vídeo:

- Pipeline completo "pizarra → grabación → upload" (ver `misterdata-source/src/components/tacticalBoard/videoRecorder.js`)
- Subida al backend (endpoint `video/*` ya cubierto por `src/api/video.js`)

## Backend

Cambios aplicados en `misterdata-back` (rama actual):

- Añadida dependencia `cookie-parser` (instalar con `npm install` en el backend).
- `index.js`: `app.use(cookieParser())`, `localhost:5173` añadido a CORS por defecto.
- `middleware/auth.js`: lee token de cookie `token` o `Authorization: Bearer ...`.
- `controllers/auth.js`: helper `setAuthCookie` (httpOnly, `secure` en prod, `sameSite=none` en prod / `lax` en dev, 7 días); usado en login, verifyEmail, googleAuth, appleAuth. Añadidos `me` y `logout`.
- `routes/auth.js`: `GET /auth/me` (protegida) y `POST /auth/logout`.

> En producción asegúrate de servir el frontend bajo HTTPS y configurar `ALLOWED_ORIGINS` en el backend con el dominio real para que la cookie (`SameSite=None; Secure`) viaje en cross-site.
