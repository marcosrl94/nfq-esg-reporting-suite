# Estado de Implementación - Arquitectura Empresarial

**Última actualización**: Abril 2026

---

## Arquitectura de datos (fuente de verdad)

**El cliente web usa solo Supabase** como backend operativo: Postgres (PostgREST), Auth, Storage y Edge Functions. La decisión está codificada en [`services/dataPlane.ts`](services/dataPlane.ts): `PRIMARY_DATA_PLANE = 'supabase'`, `EXPRESS_BACKEND_DEPRECATED_FOR_CLIENT = true`.

| Capa | Rol |
|------|-----|
| **Supabase** | CRUD vía [`services/apiService.ts`](services/apiService.ts), RPC `get_reporting_pack`, RLS por organización, sesión con Supabase Auth |
| **Carpeta `backend/` (Express)** | Referencia y posibles **workers batch** (ETL, jobs); **no** es la API consumida por el front para datapoints. Ver [`backend/src/index.ts`](backend/src/index.ts) |

No planificar “integrar Express con el front” para CRUD sin un cambio de arquitectura explícito. La autenticación real es **Supabase Auth** + perfil en `public.users`, no JWT emitido por Express.

---

## ✅ Fase 1: Fundación Empresarial (COMPLETADA)

### 1.1 Estructura de Proyecto Backend ✅
- [x] Estructura de carpetas creada (`backend/src/`) — referencia / workers
- [x] Configuración TypeScript (`tsconfig.json`)
- [x] Package.json con dependencias
- [x] Servidor Express básico (`src/index.ts`)

### 1.2 Modelo de Datos Extendido ✅
- [x] `Organization.ts` - Multi-tenancy root
- [x] `ReportingCycle.ts` - Versionado por año
- [x] `ExtendedDatapoint.ts` - Con versionado y multi-tenancy
- [x] `User.ts` - RBAC extendido
- [x] `AuditEvent.ts` - Event Sourcing

### 1.3 Servicios Base ✅ (Express — referencia)
- [x] `permissionService.ts` - Verificación de permisos RBAC
- [x] `auditService.ts` - Gestión de eventos de auditoría
- [x] `datapointService.ts` - CRUD de datapoints con versionado

### 1.4 RBAC y Middleware ✅ (Express — referencia)
- [x] `auth.ts` - Middleware de autenticación
- [x] `authorization.ts` - Middleware de autorización RBAC
- [x] `audit.ts` - Middleware de auditoría automática

### 1.5 API Routes ✅ (Express — no usadas por el SPA)
- [x] `routes/datapoints.ts` - Endpoints CRUD con RBAC y auditoría

### 1.6 Producto cliente (Supabase) ✅
- [x] `apiService.ts` + PostgREST / RPC alineados con `organization_id`
- [x] Supabase Auth + tabla `users` — ver [`services/authService.ts`](services/authService.ts)

---

## ✅ Fase 2: Dashboard Empresarial (COMPLETADA)

### 2.1 Componentes de Dashboard ✅
- [x] `KPICard.tsx` - Tarjetas KPI con drill-down
- [x] `ReadinessScoring.tsx` - Scoring por función y ESRS
- [x] `WorkflowStatusBoard.tsx` - Board tipo Kanban
- [x] `Dashboard.tsx` - Actualizado con nuevos componentes
- [x] `useDashboard.ts` - Hook para datos del dashboard

### 2.2 Funcionalidades ✅
- [x] KPIs clickables con breakdown
- [x] Readiness scoring visual (barras horizontales)
- [x] Workflow status board con items clickables
- [x] Indicadores de prioridad y fechas de vencimiento

---

## ⏳ Fase 3: Consolidación Avanzada (PENDIENTE)

### 3.1 Consolidación Multi-Nivel
- [ ] Servicio de consolidación multi-nivel con persistencia en Postgres
- [ ] Roll-up jerárquico (Facility → Subsidiary → Country → Region → Group)
- [ ] Gestión de perímetros dinámicos
- [ ] Conversión automática de unidades

### 3.2 Versionado Completo
- [ ] Historial de versiones de consolidaciones
- [ ] Comparación de versiones
- [ ] Rollback (con aprobación)

### 3.3 Validaciones Avanzadas
- [ ] Motor de reglas configurable
- [ ] Validaciones cruzadas
- [ ] Alertas proactivas

---

## ⏳ Fase 4: AI Nativa (PENDIENTE)

### 4.1 Análisis Inteligente de Evidencias
- [ ] Servicio de análisis de evidencias
- [ ] Extracción automática de datos de PDFs/Excel
- [ ] Validación contra valores reportados
- [ ] Scoring de confianza

### 4.2 Validación de Consistencia Temporal
- [ ] Detección de anomalías entre años
- [ ] Sugerencias de acciones
- [ ] Alertas automáticas

### 4.3 Generación Mejorada de Narrativas
- [ ] Context-aware generation
- [ ] Multi-estándar support
- [ ] Evidencia-linked

### 4.4 Detección de Gaps Regulatorios
- [ ] Detección automática de requisitos faltantes
- [ ] Priorización inteligente
- [ ] Sugerencias de acciones

---

## ⏳ Fase 5: Enterprise Features (PENDIENTE)

### 5.1 Workflow de Aprobación Multi-Nivel
- [ ] Workflows configurables
- [ ] Aprobaciones multi-nivel
- [ ] Notificaciones automáticas

### 5.2 Multi-Entity / Multi-Country
- [ ] Soporte completo para grupos corporativos
- [ ] Consolidación cross-entity
- [ ] Reporting por entidad

### 5.3 Preparación iXBRL
- [ ] Mapeo a taxonomía ESRS
- [ ] Estructura de datos compatible
- [ ] Exportación básica

### 5.4 Performance y Escalabilidad
- [ ] Caching estratégico (p. ej. Redis) cuando haya métricas reales
- [ ] Optimización de queries y RPC `get_reporting_pack`
- [ ] CDN para assets estáticos (Vercel)
- [ ] Load balancing / multi-región según SLA

---

## 📊 Estadísticas de Implementación

- **Fase 1 (incl. Supabase cliente)**: en gran parte completada ✅
- **Fase 2**: 100% completada ✅
- **Fase 3**: 0% completada ⏳
- **Fase 4**: 0% completada ⏳
- **Fase 5**: 0% completada ⏳

**Progreso orientativo**: funcionalidad core UI + datos Supabase; consolidación avanzada y enterprise features pendientes.

---

## 🚀 Próximos pasos (alineados con el código)

1. **Producto operable en Supabase**
   - Onboarding de organización / ciclo de reporting
   - RLS revisada por `organization_id` y roles
   - Gemini solo vía proxy en producción (`VITE_GEMINI_USE_PROXY`)

2. **Fase 3: Consolidación Avanzada**
   - Persistencia de consolidaciones y jerarquías
   - UI de perímetros y reglas de unidad

3. **Fase 4–5: IA gobernada y enterprise**
   - Auditoría end-to-end en Postgres
   - Workflows de aprobación y export regulatorio
   - SSO / multi-entidad cuando haya requisitos de cliente

---

## 📝 Notas de Implementación

- **Datos**: Postgres en Supabase es la base real del producto; migraciones en `supabase/migrations/`.
- **Dashboard**: consume datos remotos vía `useEnterpriseData` + `fetchSections` cuando Supabase está configurado.
- **Auditoría**: eventos de auditoría en cliente/servicios deben alinearse con tablas unificadas (ver migraciones `005`+); TimescaleDB u otros almacenes son opcionales a escala.
- **Express**: no sustituye a Supabase Auth ni al PostgREST del cliente.

---

**Mantenido por**: Equipo de Desarrollo NFQ ESG
