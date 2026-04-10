# NFQ ESG Reporting Suite

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

## Descripción

Suite completa de reporting ESG (Environmental, Social, Governance) diseñada para cumplir con estándares como ESRS, GRI, ISSB, TCFD y SASB. La aplicación permite gestionar métricas ESG, evidencias, consolidación de datos y generación automática de narrativas usando IA.

## Características Principales

- 📊 **Gestión de Métricas ESG**: Captura y gestión de datapoints cuantitativos y cualitativos
- 🔍 **Gestión de Evidencias**: Subida y análisis automático de evidencias con IA
- 🔄 **Consolidación de Datos**: Consolidación multi-nivel por región, segmento de negocio, etc.
- 🤖 **Generación de Narrativas**: Generación automática de narrativas ESRS-compliant usando Google Gemini
- 👥 **Control de Acceso**: Sistema de roles (Admin, Data Owner, Auditor) con filtrado de datos
- 📈 **Dashboard**: Visualización de KPIs y estadísticas en tiempo real
- 📄 **Reportes Finales**: Generación y exportación de reportes en múltiples formatos

## Tecnologías

- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS (Tema PALANTIR-inspired)
- **IA**: Google Gemini API (@google/genai)
- **Visualización**: Recharts
- **Build**: Vite
- **Backend del producto (cliente)**: **Supabase** — Postgres (PostgREST), Auth, Storage, Edge Functions. La app usa [`services/apiService.ts`](services/apiService.ts) y [`services/dataPlane.ts`](services/dataPlane.ts); no hay una segunda API paralela para CRUD de datapoints.
- **Carpeta `backend/`**: Express de **referencia** o futuros workers batch; ver [`backend/README.md`](backend/README.md).

## Arquitectura en una frase

En producción, Supabase es la fuente de verdad. El modo demo (sin Supabase) solo aplica en desarrollo local.

## Requisitos Previos

- Node.js (versión 18 o superior)
- Cuenta de Google con acceso a Gemini API
- (Opcional) Cuenta de Supabase para persistencia de datos

## Instalación

1. **Clonar el repositorio**:
   ```bash
   git clone <tu-repositorio>
   cd nfq-esg-reporting-suite
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Variables de entorno**:
   
   Copia [`.env.example`](./.env.example) a `.env.local` y configura al menos Supabase en entornos reales.
   
   **Gemini en desarrollo**: puedes usar `GEMINI_API_KEY` o `VITE_GEMINI_API_KEY` en `.env.local` (la clave se inyecta en el bundle; solo para entorno local).
   
   **Gemini en producción**: despliega la Edge Function `gemini-proxy` (carpeta `supabase/functions/gemini-proxy`), configura el secreto `GEMINI_API_KEY` en el proyecto Supabase (`supabase secrets set GEMINI_API_KEY=...`) y activa `VITE_GEMINI_USE_PROXY=true` en el front **sin** exponer la clave en Vite.
   
   Obtén una clave en: https://aistudio.google.com/app/apikey

4. **Ejecutar la aplicación**:
   ```bash
   npm run dev
   ```

5. **Abrir en el navegador**:
   ```
   http://localhost:3000
   ```

## Configuración de Base de Datos (Opcional)

Para usar Supabase como backend:

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta el script SQL en `database/schema.sql`
3. Configura las variables de entorno en `.env.local`:
   ```
   VITE_SUPABASE_URL=tu_url_de_supabase
   VITE_SUPABASE_ANON_KEY=tu_clave_anonima
   ```

En **desarrollo**, sin Supabase puedes usar el modo demo (datos locales en el bundle). En **producción** hace falta Supabase: el login demo no está disponible en el build publicado.

Variables útiles: `VITE_ORGANIZATION_ID`, `VITE_REPORTING_CYCLE_ID`, `VITE_USE_REPORTING_PACK_RPC`, `VITE_ENABLE_ORG_FILTER`. Ver `services/dataPlane.ts` y `services/apiService.ts`.

## Estructura del Proyecto

```
nfq-esg-reporting-suite/
├── components/          # Componentes React
│   ├── Dashboard.tsx
│   ├── DataInput.tsx
│   ├── DataConsolidator.tsx
│   ├── EvidenceManager.tsx
│   ├── NarrativeEngine.tsx
│   └── ...
├── contexts/            # Context API para estado global
│   ├── SectionsContext.tsx
│   ├── UsersContext.tsx
│   └── AppViewContext.tsx
├── services/            # Servicios y lógica de negocio
│   ├── geminiService.ts
│   ├── consolidationService.ts
│   ├── evidenceService.ts
│   └── ...
├── database/            # Scripts SQL
│   └── schema.sql
├── types.ts             # Definiciones TypeScript
└── ...
```

## Documentación

### 🏗️ Arquitectura Empresarial (Nuevo)

- **[EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md)** - Resumen ejecutivo para stakeholders
- **[ENTERPRISE_ARCHITECTURE.md](./ENTERPRISE_ARCHITECTURE.md)** - Arquitectura completa enterprise-ready
- **[IMPLEMENTATION_EXAMPLES.md](./IMPLEMENTATION_EXAMPLES.md)** - Ejemplos de código e implementación

### Operación y despliegue

- **[RUNBOOK.md](./RUNBOOK.md)** — Supabase, Edge Function Gemini, Vercel y checklist de release

### 📚 Documentación Técnica Existente

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura Enterprise-Ready (POC)
- [CONSOLIDATION_ARCHITECTURE.md](./CONSOLIDATION_ARCHITECTURE.md) - Arquitectura de Consolidación
- [EVIDENCE_CONSOLIDATION.md](./EVIDENCE_CONSOLIDATION.md) - Gestión de Evidencias
- [CONFIGURACION_API_KEY.md](./CONFIGURACION_API_KEY.md) - Configuración de API Key
- [PALANTIR_THEME.md](./PALANTIR_THEME.md) - Tema Visual

## Uso

### Login

- Con **Supabase** configurado: email/contraseña vía Supabase Auth y tabla `public.users`.
- Sin Supabase **solo en `npm run dev`**: acceso rápido demo (usuarios ficticios). No usar en producción.
- Para forzar demo en builds no productivos: `VITE_ALLOW_DEMO_LOGIN=true` (evitar en despliegues reales).

### Seguridad operativa (resumen)

- **Gemini**: con `VITE_GEMINI_USE_PROXY=true` y la Edge Function `gemini-proxy`, la clave vive solo en secretos Supabase (`GEMINI_API_KEY`). Sin proxy, la clave en `.env.local` se inyecta en el bundle (solo para desarrollo local).
- **Sentry** (opcional): define `VITE_SENTRY_DSN` en `.env.local` para informes de error en el cliente.
- **Supabase**: RLS y migraciones en `supabase/migrations/`; revisar `organization_id` y políticas antes de producción.
- **Carpeta `backend/`**: API Express de referencia; por defecto la autenticación insegura por cabeceras está **desactivada**. Ver `backend/README.md`.

### Gestión de Datos

1. Selecciona una sección estándar (ej: E1 - Climate Change)
2. Ingresa valores para los datapoints
3. Sube evidencias asociadas
4. Usa la consolidación para métricas multi-responsable

### Generación de Narrativas

1. Ve a "Narrative Engine"
2. Selecciona una sección
3. Elige el tono de la narrativa
4. Haz clic en "Generate Narrative"

## Edge Function Gemini (Supabase)

```bash
# Una vez vinculado el proyecto con Supabase CLI:
supabase secrets set GEMINI_API_KEY=tu_clave --project-ref TU_REF
supabase functions deploy gemini-proxy --project-ref TU_REF
```

En local: `supabase functions serve gemini-proxy --env-file ./supabase/.env.local` (definir `GEMINI_API_KEY` en ese archivo).

## Scripts Disponibles

- `npm run dev` - Inicia servidor de desarrollo
- `npm run build` - Construye para producción
- `npm run preview` - Previsualiza build de producción

## Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto es privado y propietario.

## Soporte

Para problemas o preguntas, abre un issue en el repositorio.

---

**Desarrollado con ❤️ para reporting ESG enterprise-ready**
