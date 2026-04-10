# Arquitectura Empresarial - NFQ ESG Reporting Suite

**Versión**: 2.0  
**Fecha**: Enero 2026  
**Estado**: Propuesta de Arquitectura Enterprise-Ready

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Modelo de Datos Empresarial](#modelo-de-datos-empresarial)
4. [Rediseño del Dashboard UX](#rediseño-del-dashboard-ux)
5. [Características AI Nativas](#características-ai-nativas)
6. [Características Enterprise-Ready](#características-enterprise-ready)
7. [Roadmap de Implementación](#roadmap-de-implementación)
8. [Suposiciones y Consideraciones](#suposiciones-y-consideraciones)

---

## 1. Resumen Ejecutivo

### Objetivo

Transformar el POC actual en una plataforma empresarial de reporting ESG/CSRD que pueda venderse a bancos y grandes corporaciones, cumpliendo con:

- **Regulación**: CSRD/ESRS, auditabilidad completa, trazabilidad multi-año
- **Escalabilidad**: Multi-entidad, multi-país, miles de datapoints, cientos de usuarios
- **Enterprise**: RBAC robusto, audit logs, workflows de aprobación, versionado
- **AI-Native**: Características de IA que añaden valor real, no chatbots genéricos

### Principios de Diseño

1. **Auditabilidad Total**: Cada cambio debe ser trazable y auditable
2. **Escalabilidad Horizontal**: Arquitectura que escala con el crecimiento
3. **Regulatory Compliance First**: Diseñado para cumplir estándares desde el inicio
4. **AI como Multiplicador de Valor**: IA que resuelve problemas reales de ESG
5. **Multi-tenancy desde el Inicio**: Soporte nativo para múltiples organizaciones

---

## 2. Arquitectura del Sistema

### 2.1 Diagrama de Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   Dashboard  │  │ Data Input   │  │  Narrative   │            │
│  │   (React)    │  │  (React)     │  │  Engine      │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │Consolidation │  │   Evidence   │  │   Reports    │            │
│  │   Manager    │  │   Manager    │  │   Generator  │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                     │
│  State Management: React Query + Zustand                          │
│  UI Framework: React 19 + TypeScript + Tailwind                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS / WebSocket
                                    │
┌─────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY LAYER                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  API Gateway (Kong / AWS API Gateway / NGINX)               │  │
│  │  - Authentication / Authorization                           │  │
│  │  - Rate Limiting                                           │  │
│  │  - Request Routing                                         │  │
│  │  - Request/Response Transformation                         │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
┌───────────────────▼───┐  ┌────────▼────────┐  ┌─▼──────────────────┐
│   BACKEND SERVICES    │  │  AI SERVICES    │  │  FILE STORAGE      │
├───────────────────────┤  ├─────────────────┤  ├────────────────────┤
│                       │  │                 │  │                    │
│ ┌───────────────────┐ │  │ ┌─────────────┐ │  │ ┌──────────────┐  │
│ │ Core API Service  │ │  │ │ Gemini API  │ │  │ │ S3 / GCS /   │  │
│ │ (Node.js/Express)  │ │  │ │ Integration │ │  │ │ Supabase     │  │
│ └───────────────────┘ │  │ └─────────────┘ │  │ │ Storage      │  │
│                       │  │                 │  │ └──────────────┘  │
│ ┌───────────────────┐ │  │ ┌─────────────┐ │  │                    │
│ │ Workflow Engine   │ │  │ │ Evidence    │ │  │                    │
│ │ (State Machine)   │ │  │ │ Analyzer    │ │  │                    │
│ └───────────────────┘ │  │ └─────────────┘ │  │                    │
│                       │  │                 │  │                    │
│ ┌───────────────────┐ │  │ ┌─────────────┐ │  │                    │
│ │ Consolidation     │ │  │ │ Narrative   │ │  │                    │
│ │ Service           │ │  │ │ Generator   │ │  │                    │
│ └───────────────────┘ │  │ └─────────────┘ │  │                    │
│                       │  │                 │  │                    │
│ ┌───────────────────┐ │  │ ┌─────────────┐ │  │                    │
│ │ Audit Service     │ │  │ │ Data Quality│ │  │                    │
│ │ (Event Sourcing)  │ │  │ │ Validator    │ │  │                    │
│ └───────────────────┘ │  │ └─────────────┘ │  │                    │
│                       │  │                 │  │                    │
│ ┌───────────────────┐ │  │                 │  │                    │
│ │ Notification      │ │  │                 │  │                    │
│ │ Service           │ │  │                 │  │                    │
│ └───────────────────┘ │  │                 │  │                    │
│                       │  │                 │  │                    │
└───────────────────────┘  └─────────────────┘  └────────────────────┘
         │                          │                      │
         │                          │                      │
         └──────────────┬───────────┴──────────────────────┘
                        │
┌───────────────────────▼───────────────────────────────────────────┐
│                      DATA LAYER                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL (Primary Database)                               │  │
│  │  - Multi-tenant schema (organization_id)                   │  │
│  │  - Row Level Security (RLS)                                 │  │
│  │  - JSONB for flexible data                                  │  │
│  │  - Full-text search (pg_trgm)                               │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Redis (Cache & Sessions)                                   │  │
│  │  - Session storage                                          │  │
│  │  - Query result caching                                    │  │
│  │  - Rate limiting                                            │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  TimescaleDB (Time-series for Audit Logs)                   │  │
│  │  - High-volume audit log storage                            │  │
│  │  - Time-based queries                                       │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Elasticsearch (Search & Analytics)                         │  │
│  │  - Full-text search across datapoints                       │  │
│  │  - Analytics queries                                        │  │
│  │  - Evidence content indexing                                │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Stack Tecnológico Recomendado

#### Frontend
- **Framework**: React 19 + TypeScript
- **State Management**: TanStack Query (React Query) + Zustand
- **UI Components**: Tailwind CSS + Headless UI / Radix UI
- **Charts**: Recharts / Apache ECharts
- **Build**: Vite
- **Testing**: Vitest + React Testing Library + Playwright

#### Backend
- **Runtime**: Node.js 20+ (LTS) o Python 3.11+ (FastAPI)
- **Framework**: Express.js (Node) o FastAPI (Python)
- **API Style**: REST + GraphQL (opcional para queries complejas)
- **Authentication**: JWT + OAuth 2.0 / OIDC
- **Validation**: Zod (TypeScript) o Pydantic (Python)

#### Base de Datos
- **Primary**: PostgreSQL 15+ (con extensiones: pg_trgm, pgcrypto)
- **Cache**: Redis 7+
- **Time-series**: TimescaleDB (extension de PostgreSQL)
- **Search**: Elasticsearch 8+ o PostgreSQL Full-Text Search
- **Object Storage**: AWS S3 / Google Cloud Storage / Supabase Storage

#### Infraestructura
- **Containerization**: Docker + Docker Compose
- **Orchestration**: Kubernetes (producción) o Docker Swarm (pequeño)
- **CI/CD**: GitHub Actions / GitLab CI
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Error Tracking**: Sentry

#### AI/ML
- **LLM**: Google Gemini API (actual) + OpenAI GPT-4 (backup)
- **Embeddings**: OpenAI Embeddings / Cohere
- **Vector DB**: PostgreSQL pgvector (extension) o Pinecone

### 2.3 Patrones Arquitectónicos

#### 2.3.1 Multi-Tenancy

**Estrategia**: Schema-per-tenant con `organization_id` en todas las tablas

```sql
-- Ejemplo de tabla multi-tenant
CREATE TABLE datapoints (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    code VARCHAR(50) NOT NULL,
    -- ... otros campos
    CONSTRAINT unique_datapoint_per_org UNIQUE (organization_id, code)
);

-- Índice para queries multi-tenant
CREATE INDEX idx_datapoints_org ON datapoints(organization_id);
```

**Ventajas**:
- Aislamiento de datos por organización
- Fácil backup/restore por tenant
- Escalabilidad horizontal
- Compliance por jurisdicción

#### 2.3.2 Event Sourcing para Audit Logs

```typescript
// Event Store Pattern
interface AuditEvent {
  id: string;
  organizationId: string;
  entityType: 'datapoint' | 'evidence' | 'consolidation';
  entityId: string;
  eventType: 'created' | 'updated' | 'deleted' | 'status_changed';
  userId: string;
  timestamp: string;
  beforeState: Record<string, any> | null;
  afterState: Record<string, any>;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
  };
}
```

**Beneficios**:
- Trazabilidad completa e inmutable
- Capacidad de reconstruir estado histórico
- Cumplimiento regulatorio (CSRD requiere auditabilidad)

#### 2.3.3 CQRS (Command Query Responsibility Segregation)

- **Commands** (Write): Mutaciones de datos, validaciones complejas
- **Queries** (Read): Lecturas optimizadas, cacheables

**Ejemplo**:
```typescript
// Command: Update Datapoint
async function updateDatapointCommand(
  organizationId: string,
  datapointId: string,
  updates: Partial<Datapoint>,
  userId: string
): Promise<void> {
  // 1. Validar permisos
  // 2. Validar datos
  // 3. Aplicar cambios
  // 4. Emitir evento de auditoría
  // 5. Invalidar cache
}

// Query: Get Dashboard KPIs
async function getDashboardKPIsQuery(
  organizationId: string,
  reportingYear: number
): Promise<DashboardKPIs> {
  // 1. Verificar cache
  // 2. Query optimizada desde DB
  // 3. Cachear resultado
  // 4. Retornar
}
```

---

## 3. Modelo de Datos Empresarial

### 3.1 Entidades Principales y Relaciones

```
┌─────────────────────┐
│   Organization      │ (Multi-tenant root)
│   - id              │
│   - name            │
│   - country         │
│   - industry        │
│   - settings (JSONB)│
└──────────┬──────────┘
           │
           │ 1:N
           │
┌──────────▼──────────┐         ┌──────────────────────┐
│   Reporting Cycle   │────────▶│   ESRS Standard      │
│   - id              │         │   - id              │
│   - organizationId  │         │   - code (E1, S1...) │
│   - year            │         │   - title           │
│   - status          │         │   - version          │
│   - startDate       │         │   - requirements[]  │
│   - endDate         │         └──────────────────────┘
│   - lockedAt        │
└──────────┬──────────┘
           │
           │ 1:N
           │
┌──────────▼──────────┐
│   Datapoint         │
│   - id              │
│   - organizationId  │
│   - cycleId         │
│   - standardId      │
│   - code            │
│   - name            │
│   - type            │
│   - unit            │
│   - values (JSONB)  │
│   - status          │
│   - ownerId         │
│   - department      │
│   - version         │
└──────────┬──────────┘
           │
           │ 1:N
           ├──────────────────┐
           │                  │
┌──────────▼──────────┐  ┌───▼──────────────────┐
│   Evidence File     │  │ Consolidation Source │
│   - id              │  │ - id                │
│   - datapointId     │  │ - datapointId       │
│   - sourceId        │  │ - hierarchyId       │
│   - fileName        │  │ - values (JSONB)    │
│   - filePath        │  │ - evidenceIds[]     │
│   - extractedData   │  │ - status            │
│   - aiAnalysis      │  │ - version           │
└─────────────────────┘  └─────────────────────┘
           │
           │ N:1
           │
┌──────────▼──────────┐
│   Audit Log         │
│   - id              │
│   - organizationId  │
│   - entityType      │
│   - entityId        │
│   - eventType       │
│   - userId          │
│   - beforeState     │
│   - afterState      │
│   - timestamp       │
└─────────────────────┘
```

### 3.2 Schema SQL Extendido

```sql
-- ============================================
-- ORGANIZATIONS (Multi-tenancy root)
-- ============================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    country_code CHAR(2) NOT NULL, -- ISO 3166-1 alpha-2
    industry VARCHAR(100),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- REPORTING CYCLES (Versioning por año)
-- ============================================
CREATE TABLE reporting_cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'in_progress', 'under_review', 'approved', 'locked')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    locked_at TIMESTAMP WITH TIME ZONE,
    locked_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_cycle_per_org UNIQUE (organization_id, year)
);

CREATE INDEX idx_cycles_org_year ON reporting_cycles(organization_id, year DESC);

-- ============================================
-- ESRS REQUIREMENTS (Catálogo de requisitos)
-- ============================================
CREATE TABLE esrs_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    standard_code VARCHAR(50) NOT NULL, -- e.g., "ESRS E1"
    requirement_code VARCHAR(50) NOT NULL, -- e.g., "E1-6-01"
    requirement_type VARCHAR(50) NOT NULL CHECK (requirement_type IN ('disclosure', 'datapoint', 'narrative')),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    applicable_conditions JSONB DEFAULT '{}', -- Condiciones de aplicabilidad
    related_requirements UUID[], -- IDs de requisitos relacionados
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_requirement_code UNIQUE (standard_code, requirement_code, version)
);

CREATE INDEX idx_requirements_standard ON esrs_requirements(standard_code);
CREATE INDEX idx_requirements_code ON esrs_requirements(requirement_code);

-- ============================================
-- DATAPOINTS (Extendido con versionado)
-- ============================================
CREATE TABLE datapoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES reporting_cycles(id) ON DELETE CASCADE,
    requirement_id UUID REFERENCES esrs_requirements(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('quantitative', 'qualitative')),
    unit VARCHAR(50),
    base_unit VARCHAR(50), -- Unidad base para consolidación
    values JSONB NOT NULL DEFAULT '{}', -- { "2024": 45200, "2023": 48500 }
    status VARCHAR(20) NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'in_review', 'approved', 'rejected', 'locked')),
    owner_id UUID REFERENCES users(id),
    department VARCHAR(100) NOT NULL,
    workflow_stage VARCHAR(50), -- Estado del workflow de consolidación
    consolidation_enabled BOOLEAN NOT NULL DEFAULT false,
    consolidation_method VARCHAR(50) CHECK (consolidation_method IN ('sum', 'average', 'weighted_average', 'max', 'min', 'custom')),
    mappings JSONB DEFAULT '{}', -- Cross-reference a otros estándares
    ai_verification JSONB DEFAULT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    parent_version_id UUID REFERENCES datapoints(id), -- Para versionado
    change_reason TEXT, -- Razón del cambio de versión
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_datapoint_per_cycle UNIQUE (organization_id, cycle_id, code)
);

CREATE INDEX idx_datapoints_org_cycle ON datapoints(organization_id, cycle_id);
CREATE INDEX idx_datapoints_status ON datapoints(status);
CREATE INDEX idx_datapoints_owner ON datapoints(owner_id);
CREATE INDEX idx_datapoints_values_gin ON datapoints USING GIN (values);

-- ============================================
-- ORGANIZATIONAL HIERARCHY (Multi-nivel)
-- ============================================
CREATE TABLE organizational_hierarchy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL, -- e.g., "EU-ES-MAD"
    name VARCHAR(255) NOT NULL,
    level VARCHAR(50) NOT NULL CHECK (level IN ('region', 'country', 'state', 'city', 'business_unit', 'subsidiary', 'facility')),
    parent_id UUID REFERENCES organizational_hierarchy(id),
    metadata JSONB DEFAULT '{}', -- { countryCode, timezone, currency, etc. }
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_hierarchy_code UNIQUE (organization_id, code)
);

CREATE INDEX idx_hierarchy_org ON organizational_hierarchy(organization_id);
CREATE INDEX idx_hierarchy_parent ON organizational_hierarchy(parent_id);
CREATE INDEX idx_hierarchy_level ON organizational_hierarchy(level);

-- ============================================
-- CONSOLIDATION SOURCES (Fuentes de datos)
-- ============================================
CREATE TABLE consolidation_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    datapoint_id UUID NOT NULL REFERENCES datapoints(id) ON DELETE CASCADE,
    hierarchy_id UUID REFERENCES organizational_hierarchy(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('geography', 'business_unit', 'subsidiary', 'facility')),
    responsible_user_id UUID NOT NULL REFERENCES users(id),
    values JSONB NOT NULL DEFAULT '{}', -- { "2024": { value, unit, period, metadata } }
    evidence_ids UUID[] DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    workflow_stage VARCHAR(50),
    version INTEGER NOT NULL DEFAULT 1,
    parent_version_id UUID REFERENCES consolidation_sources(id),
    change_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sources_datapoint ON consolidation_sources(datapoint_id);
CREATE INDEX idx_sources_hierarchy ON consolidation_sources(hierarchy_id);
CREATE INDEX idx_sources_responsible ON consolidation_sources(responsible_user_id);

-- ============================================
-- CONSOLIDATION RECORDS (Historial)
-- ============================================
CREATE TABLE consolidation_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    datapoint_id UUID NOT NULL REFERENCES datapoints(id) ON DELETE CASCADE,
    consolidation_id VARCHAR(100) NOT NULL, -- ID único de ejecución
    version INTEGER NOT NULL,
    reporting_year INTEGER NOT NULL,
    method VARCHAR(50) NOT NULL,
    input_source_ids UUID[] NOT NULL,
    result JSONB NOT NULL, -- ConsolidatedValue completo
    validation_results JSONB DEFAULT '[]',
    status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'validated', 'approved', 'rejected')),
    performed_by UUID NOT NULL REFERENCES users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX idx_consolidation_datapoint ON consolidation_records(datapoint_id);
CREATE INDEX idx_consolidation_year ON consolidation_records(reporting_year);
CREATE INDEX idx_consolidation_performed_at ON consolidation_records(performed_at DESC);

-- ============================================
-- EVIDENCE FILES (Extendido)
-- ============================================
CREATE TABLE evidence_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    datapoint_id UUID NOT NULL REFERENCES datapoints(id) ON DELETE CASCADE,
    source_id UUID REFERENCES consolidation_sources(id),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    hierarchy JSONB, -- { level, value }
    extracted_data JSONB, -- ExtractedEvidenceData
    ai_analysis JSONB, -- EvidenceAnalysis
    checksum VARCHAR(64), -- SHA-256 para integridad
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_evidence_datapoint ON evidence_files(datapoint_id);
CREATE INDEX idx_evidence_source ON evidence_files(source_id);
CREATE INDEX idx_evidence_uploaded_by ON evidence_files(uploaded_by);

-- ============================================
-- AUDIT LOGS (Event Sourcing)
-- ============================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    before_state JSONB,
    after_state JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (created_at); -- Particionado por tiempo para escalabilidad

-- Crear particiones mensuales automáticamente
CREATE INDEX idx_audit_org_entity ON audit_logs(organization_id, entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);

-- ============================================
-- USERS (Extendido con RBAC)
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Sustainability Lead', 'Data Owner', 'Auditor', 'Viewer')),
    department VARCHAR(100) NOT NULL,
    permissions JSONB DEFAULT '{}', -- Permisos granulares
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_email_per_org UNIQUE (organization_id, email)
);

CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- WORKFLOW APPROVALS (Aprobaciones)
-- ============================================
CREATE TABLE workflow_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    approver_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    comments TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_approvals_entity ON workflow_approvals(entity_type, entity_id);
CREATE INDEX idx_approvals_approver ON workflow_approvals(approver_id);

-- ============================================
-- NOTIFICATIONS (Sistema de notificaciones)
-- ============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
```

### 3.3 Relaciones Clave

1. **Organization → Reporting Cycle**: 1:N (una organización tiene múltiples ciclos de reporting)
2. **Reporting Cycle → Datapoint**: 1:N (un ciclo tiene múltiples datapoints)
3. **Datapoint → Consolidation Source**: 1:N (un datapoint puede tener múltiples fuentes)
4. **Consolidation Source → Organizational Hierarchy**: N:1 (cada fuente pertenece a una jerarquía)
5. **Datapoint → Evidence File**: 1:N (un datapoint puede tener múltiples evidencias)
6. **Entity → Audit Log**: 1:N (cada entidad tiene múltiples eventos de auditoría)

### 3.4 Versionado y Trazabilidad

**Estrategia de Versionado**:
- Cada cambio importante crea una nueva versión
- Versiones anteriores se mantienen para auditoría
- Campo `parent_version_id` para rastrear linaje
- Campo `change_reason` obligatorio para cambios de versión

**Ejemplo**:
```sql
-- Versión 1 (original)
INSERT INTO datapoints (id, code, values, version) 
VALUES ('dp1', 'E1-6-01', '{"2024": 45200}', 1);

-- Versión 2 (corrección)
INSERT INTO datapoints (id, code, values, version, parent_version_id, change_reason)
VALUES ('dp2', 'E1-6-01', '{"2024": 45500}', 2, 'dp1', 'Corrección: se incluyó instalación adicional');
```

---

## 4. Rediseño del Dashboard UX

### 4.1 Estructura del Dashboard Empresarial

```
┌─────────────────────────────────────────────────────────────────────┐
│  DASHBOARD PRINCIPAL                                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  KPI CARDS (Clickable para drill-down)                      │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                       │  │
│  │  │Total │ │Ready │ │At    │ │Block │                       │  │
│  │  │      │ │      │ │Risk  │ │      │                       │  │
│  │  │ 245  │ │ 180  │ │  45  │ │  20  │                       │  │
│  │  └──────┘ └──────┘ └──────┘ └──────┘                       │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  READINESS SCORING                                           │  │
│  │  ┌───────────────────────────────────────────────────────┐  │  │
│  │  │  By Function              │  By ESRS Standard         │  │  │
│  │  │  ┌─────────────────────┐  │  ┌─────────────────────┐  │  │  │
│  │  │  │ Sustainability: 85%│  │  │ ESRS E1: 92%        │  │  │  │
│  │  │  │ Finance: 78%       │  │  │ ESRS S1: 88%        │  │  │  │
│  │  │  │ HR: 91%            │  │  │ ESRS G1: 65%        │  │  │  │
│  │  │  └─────────────────────┘  │  └─────────────────────┘  │  │  │
│  │  └───────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  WORKFLOW STATUS & OWNERSHIP                                  │  │
│  │  ┌───────────────────────────────────────────────────────┐  │  │
│  │  │  Stage          │ Count │ Owner          │ Due Date    │  │  │
│  │  │  ──────────────────────────────────────────────────── │  │  │
│  │  │  Draft          │  45   │ Finance Team  │ 2024-02-15 │  │  │
│  │  │  In Review      │  20   │ Maria G.      │ 2024-02-20 │  │  │
│  │  │  Approved       │ 180   │ -             │ -           │  │  │
│  │  └───────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  MY ACTION ITEMS                                             │  │
│  │  ┌───────────────────────────────────────────────────────┐  │  │
│  │  │  [ ] Review E1-6-01 consolidation (Due: 2 days)      │  │  │
│  │  │  [ ] Approve S1-9 diversity data (Due: 5 days)        │  │  │
│  │  │  [ ] Provide evidence for E1-9 (Overdue: 3 days)     │  │  │
│  │  └───────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Componentes de Dashboard

#### 4.2.1 KPI Cards con Drill-Down

```typescript
interface KPICard {
  id: string;
  label: string;
  value: number;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  onClick?: () => void; // Navega a vista detallada
  breakdown?: {
    byFunction: Record<string, number>;
    byESRS: Record<string, number>;
    byStatus: Record<string, number>;
  };
}

// Ejemplo de uso
<KPICard
  label="Total Datapoints"
  value={245}
  trend="up"
  trendValue={12}
  onClick={() => navigateToDatapointList()}
  breakdown={{
    byFunction: { Sustainability: 80, Finance: 65, HR: 100 },
    byESRS: { 'E1': 120, 'S1': 75, 'G1': 50 },
    byStatus: { draft: 45, review: 20, approved: 180 }
  }}
/>
```

#### 4.2.2 Readiness Scoring

```typescript
interface ReadinessScore {
  dimension: 'function' | 'esrs' | 'department';
  dimensionValue: string;
  score: number; // 0-100
  total: number;
  completed: number;
  inProgress: number;
  blocked: number;
  breakdown?: {
    byRequirement: Array<{
      requirementCode: string;
      status: 'complete' | 'in_progress' | 'blocked' | 'not_started';
    }>;
  };
}

// Visualización
<ReadinessHeatmap
  scores={readinessScores}
  onCellClick={(dimension, value) => {
    // Drill-down a lista de datapoints filtrados
    navigateToDatapointList({ filter: { [dimension]: value } });
  }}
/>
```

#### 4.2.3 Workflow Status Board

```typescript
interface WorkflowStatusBoard {
  stages: Array<{
    stage: WorkflowStatus;
    count: number;
    items: Array<{
      id: string;
      code: string;
      name: string;
      owner: User;
      dueDate: string;
      priority: 'high' | 'medium' | 'low';
    }>;
  }>;
  onItemClick: (itemId: string) => void;
}

// Visualización tipo Kanban
<WorkflowKanbanBoard
  stages={workflowStages}
  onItemClick={(item) => navigateToDatapoint(item.id)}
  onStatusChange={(itemId, newStatus) => updateWorkflowStatus(itemId, newStatus)}
/>
```

### 4.3 Flujos de Usuario

#### Flujo 1: Drill-Down desde KPI

```
1. Usuario hace clic en KPI "Total: 245"
   ↓
2. Se abre modal/vista con breakdown:
   - Por función (Sustainability: 80, Finance: 65...)
   - Por ESRS (E1: 120, S1: 75...)
   - Por estado (Draft: 45, Review: 20...)
   ↓
3. Usuario hace clic en "Finance: 65"
   ↓
4. Se navega a lista de datapoints filtrados:
   - Departamento: Finance
   - Mostrando 65 datapoints
   - Con opciones de filtro adicionales
```

#### Flujo 2: Revisión de Readiness

```
1. Usuario ve "ESRS E1: 92%" en readiness scoring
   ↓
2. Hace clic para ver detalles
   ↓
3. Vista muestra:
   - Lista de requisitos E1 con estado individual
   - Requisitos completos (verde)
   - Requisitos en progreso (amarillo)
   - Requisitos bloqueados (rojo)
   ↓
4. Usuario hace clic en requisito bloqueado
   ↓
5. Se abre vista de datapoint con:
   - Estado actual
   - Blockers identificados
   - Acciones disponibles
   - Historial de cambios
```

---

## 5. Características AI Nativas

### 5.1 Análisis Inteligente de Evidencias

**Problema que resuelve**: Validar que las evidencias subidas realmente respaldan los valores reportados.

**Implementación**:
```typescript
interface EvidenceAnalyzer {
  /**
   * Analiza un archivo de evidencia y extrae información relevante
   */
  analyzeEvidence(
    file: File,
    datapointCode: string,
    reportedValue: number | string,
    unit?: string
  ): Promise<EvidenceAnalysis>;
}

// Ejemplo de uso
const analysis = await evidenceAnalyzer.analyzeEvidence(
  pdfFile,
  'E1-6-01',
  45200,
  'tCO2e'
);

// Resultado:
{
  status: 'verified',
  extractedValue: 45200,
  confidence: 95,
  reasoning: 'El documento contiene una tabla de emisiones Scope 1 que muestra 45,200 tCO2e para el año 2024, coincidiendo con el valor reportado.',
  requirementsMet: [
    'Valor numérico presente',
    'Unidad especificada',
    'Período de reporting claro',
    'Fuente identificable'
  ],
  missingRequirements: []
}
```

**Valor de negocio**:
- Reduce tiempo de revisión manual en 70%
- Detecta inconsistencias antes de la aprobación
- Mejora calidad de datos reportados

### 5.2 Validación de Consistencia Temporal

**Problema que resuelve**: Detectar cambios anómalos entre años que requieren explicación.

**Implementación**:
```typescript
interface TemporalConsistencyValidator {
  /**
   * Valida consistencia temporal de un datapoint
   */
  validateTemporalConsistency(
    datapoint: Datapoint,
    historicalValues: Record<string, number>
  ): Promise<ConsistencyReport>;
}

// Ejemplo
const report = await validator.validateTemporalConsistency(
  currentDatapoint,
  { '2023': 48500, '2022': 51000, '2021': 49500 }
);

// Resultado:
{
  status: 'anomaly_detected',
  currentValue: 30000, // Reducción del 38% respecto a 2023
  expectedRange: { min: 42000, max: 55000 },
  anomalyType: 'significant_decrease',
  suggestedActions: [
    'Verificar que no se excluyeron instalaciones',
    'Confirmar cambios en metodología',
    'Revisar evidencias de reducción'
  ],
  confidence: 85
}
```

### 5.3 Generación Inteligente de Narrativas

**Problema que resuelve**: Generar narrativas ESRS-compliant que expliquen los datos de forma coherente.

**Mejoras sobre el actual**:
- Context-aware: Usa datos históricos y comparativas del sector
- Multi-estándar: Genera narrativas compatibles con ESRS, GRI, TCFD simultáneamente
- Evidencia-linked: Referencia automática a evidencias específicas

**Implementación**:
```typescript
interface NarrativeGenerator {
  /**
   * Genera narrativa ESRS-compliant con contexto
   */
  generateNarrative(
    datapoint: Datapoint,
    context: {
      historicalData: Record<string, number>;
      sectorBenchmarks?: Record<string, number>;
      relatedDatapoints: Datapoint[];
      evidenceFiles: EvidenceFile[];
    },
    options: {
      tone: 'formal' | 'concise' | 'detailed';
      standards: StandardType[];
      language: string;
    }
  ): Promise<Narrative>;
}

// Ejemplo
const narrative = await generator.generateNarrative(
  scope1Datapoint,
  {
    historicalData: { '2023': 48500, '2022': 51000 },
    sectorBenchmarks: { 'industry_average': 52000 },
    relatedDatapoints: [scope2Datapoint, scope3Datapoint],
    evidenceFiles: [verificationCert, emissionsReport]
  },
  {
    tone: 'formal',
    standards: [StandardType.ESRS, StandardType.TCFD],
    language: 'es'
  }
);
```

### 5.4 Detección de Gaps Regulatorios

**Problema que resuelve**: Identificar automáticamente requisitos ESRS que faltan o están incompletos.

**Implementación**:
```typescript
interface RegulatoryGapDetector {
  /**
   * Detecta gaps en cumplimiento regulatorio
   */
  detectGaps(
    organizationId: string,
    cycleId: string,
    standardCode: string
  ): Promise<GapReport>;
}

// Ejemplo
const gapReport = await detector.detectGaps(
  orgId,
  cycleId,
  'ESRS E1'
);

// Resultado:
{
  standard: 'ESRS E1',
  totalRequirements: 45,
  completedRequirements: 38,
  incompleteRequirements: [
    {
      code: 'E1-9',
      title: 'Anticipated financial effects',
      status: 'missing',
      reason: 'No datapoint creado para este requisito',
      priority: 'high',
      suggestedActions: [
        'Crear datapoint E1-9',
        'Asignar a Finance Department',
        'Revisar guía ESRS E1-9'
      ]
    },
    {
      code: 'E1-6-03',
      title: 'Scope 3 emissions',
      status: 'incomplete',
      reason: 'Valor reportado pero falta evidencia de verificación',
      priority: 'medium'
    }
  ]
}
```

### 5.5 Recomendaciones Proactivas

**Problema que resuelve**: Sugerir acciones basadas en patrones y mejores prácticas.

**Implementación**:
```typescript
interface RecommendationEngine {
  /**
   * Genera recomendaciones proactivas
   */
  generateRecommendations(
    organizationId: string,
    cycleId: string,
    userId: string
  ): Promise<Recommendation[]>;
}

// Ejemplo
const recommendations = await engine.generateRecommendations(
  orgId,
  cycleId,
  userId
);

// Resultado:
[
  {
    type: 'data_quality',
    priority: 'high',
    title: 'Mejorar calidad de evidencias para E1-6-01',
    description: '3 de 5 evidencias tienen confianza < 70%',
    action: {
      type: 'review_evidence',
      targetEntityId: 'dp1',
      estimatedTime: '15 minutes'
    }
  },
  {
    type: 'workflow',
    priority: 'medium',
    title: 'Acelerar aprobación de datapoints críticos',
    description: '5 datapoints en review por más de 7 días',
    action: {
      type: 'batch_approve',
      targetEntityIds: ['dp1', 'dp2', 'dp3', 'dp4', 'dp5']
    }
  },
  {
    type: 'compliance',
    priority: 'high',
    title: 'Completar requisitos obligatorios de ESRS E1',
    description: 'Faltan 3 requisitos obligatorios para cumplimiento completo',
    action: {
      type: 'create_datapoints',
      requirements: ['E1-9', 'E1-10', 'E1-11']
    }
  }
]
```

---

## 6. Características Enterprise-Ready

### 6.1 RBAC (Role-Based Access Control) Granular

#### 6.1.1 Roles y Permisos

```typescript
interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  organizationId: string;
}

interface Permission {
  resource: 'datapoint' | 'evidence' | 'consolidation' | 'report' | 'user' | 'organization';
  actions: ('create' | 'read' | 'update' | 'delete' | 'approve' | 'export')[];
  conditions?: {
    department?: string[];
    status?: WorkflowStatus[];
    cycleId?: string[];
  };
}

// Ejemplo de roles predefinidos
const ROLES = {
  SUSTAINABILITY_LEAD: {
    name: 'Sustainability Lead',
    permissions: [
      { resource: 'datapoint', actions: ['create', 'read', 'update', 'delete', 'approve'] },
      { resource: 'evidence', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'consolidation', actions: ['create', 'read', 'update', 'approve'] },
      { resource: 'report', actions: ['create', 'read', 'export'] },
      { resource: 'user', actions: ['read', 'update'] },
      { resource: 'organization', actions: ['read', 'update'] }
    ]
  },
  DATA_OWNER: {
    name: 'Data Owner',
    permissions: [
      { 
        resource: 'datapoint', 
        actions: ['create', 'read', 'update'],
        conditions: { department: ['$user.department'] }
      },
      { 
        resource: 'evidence', 
        actions: ['create', 'read', 'update'],
        conditions: { department: ['$user.department'] }
      }
    ]
  },
  AUDITOR: {
    name: 'Auditor',
    permissions: [
      { 
        resource: 'datapoint', 
        actions: ['read'],
        conditions: { status: ['approved', 'locked'] }
      },
      { 
        resource: 'evidence', 
        actions: ['read'],
        conditions: { status: ['approved', 'locked'] }
      },
      { 
        resource: 'report', 
        actions: ['read', 'export']
      }
    ]
  }
};
```

#### 6.1.2 Implementación en Backend

```typescript
// Middleware de autorización
async function authorizeRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = req.user;
  const { resource, action } = req.params;
  
  // Verificar permisos
  const hasPermission = await checkPermission(
    user.id,
    resource,
    action,
    req.body // Contexto adicional
  );
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  next();
}

// Función de verificación de permisos
async function checkPermission(
  userId: string,
  resource: string,
  action: string,
  context: Record<string, any>
): Promise<boolean> {
  const user = await getUserWithRole(userId);
  const role = await getRole(user.roleId);
  
  // Verificar permiso básico
  const permission = role.permissions.find(
    p => p.resource === resource && p.actions.includes(action)
  );
  
  if (!permission) return false;
  
  // Verificar condiciones
  if (permission.conditions) {
    // Verificar departamento
    if (permission.conditions.department) {
      const userDept = user.department;
      if (!permission.conditions.department.includes(userDept)) {
        return false;
      }
    }
    
    // Verificar estado
    if (permission.conditions.status && context.status) {
      if (!permission.conditions.status.includes(context.status)) {
        return false;
      }
    }
  }
  
  return true;
}
```

### 6.2 Audit Logs Completos

#### 6.2.1 Eventos Auditables

```typescript
interface AuditEvent {
  id: string;
  organizationId: string;
  entityType: 'datapoint' | 'evidence' | 'consolidation' | 'user' | 'workflow';
  entityId: string;
  eventType: 
    | 'created'
    | 'updated'
    | 'deleted'
    | 'status_changed'
    | 'approved'
    | 'rejected'
    | 'exported'
    | 'viewed';
  userId: string;
  userName: string;
  beforeState: Record<string, any> | null;
  afterState: Record<string, any>;
  changes: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
    approvalComments?: string;
  };
  timestamp: string;
}

// Función helper para crear eventos de auditoría
async function createAuditEvent(
  organizationId: string,
  entityType: string,
  entityId: string,
  eventType: string,
  userId: string,
  beforeState: Record<string, any> | null,
  afterState: Record<string, any>,
  metadata: Record<string, any> = {}
): Promise<void> {
  const user = await getUser(userId);
  
  const changes = beforeState && afterState
    ? calculateChanges(beforeState, afterState)
    : [];
  
  const event: AuditEvent = {
    id: uuidv4(),
    organizationId,
    entityType,
    entityId,
    eventType,
    userId,
    userName: user.name,
    beforeState,
    afterState,
    changes,
    metadata: {
      ...metadata,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent
    },
    timestamp: new Date().toISOString()
  };
  
  await auditLogRepository.create(event);
}
```

#### 6.2.2 Consultas de Auditoría

```typescript
// Obtener historial completo de una entidad
async function getEntityAuditHistory(
  organizationId: string,
  entityType: string,
  entityId: string
): Promise<AuditEvent[]> {
  return auditLogRepository.find({
    organizationId,
    entityType,
    entityId
  }, {
    orderBy: { timestamp: 'DESC' }
  });
}

// Obtener cambios por usuario en un período
async function getUserActivity(
  organizationId: string,
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<AuditEvent[]> {
  return auditLogRepository.find({
    organizationId,
    userId,
    timestamp: {
      gte: startDate,
      lte: endDate
    }
  });
}

// Exportar reporte de auditoría
async function exportAuditReport(
  organizationId: string,
  filters: {
    entityType?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<Buffer> {
  const events = await auditLogRepository.find(filters);
  
  // Generar CSV/PDF con eventos
  return generateAuditReportPDF(events);
}
```

### 6.3 Multi-Entity / Multi-Country

#### 6.3.1 Estructura de Organizaciones

```typescript
interface Organization {
  id: string;
  name: string;
  legalName: string;
  countryCode: string; // ISO 3166-1 alpha-2
  industry: string;
  parentOrganizationId?: string; // Para grupos corporativos
  subsidiaries: string[]; // IDs de subsidiarias
  settings: {
    defaultCurrency: string;
    defaultLanguage: string;
    fiscalYearEnd: string; // MM-DD
    reportingStandards: StandardType[];
    dataRetentionYears: number;
  };
}

// Soporte para grupos corporativos
interface CorporateGroup {
  parentOrganization: Organization;
  subsidiaries: Organization[];
  consolidationRules: {
    method: 'sum' | 'proportional';
    excludeInactive: boolean;
    currencyConversion: boolean;
  };
}
```

#### 6.3.2 Consolidación Multi-País

```typescript
// Consolidar datos de múltiples países
async function consolidateMultiCountry(
  organizationId: string,
  datapointCode: string,
  countryCodes: string[],
  reportingYear: number
): Promise<ConsolidatedValue> {
  // Obtener fuentes de cada país
  const sources = await Promise.all(
    countryCodes.map(countryCode => 
      getConsolidationSources(organizationId, datapointCode, {
        countryCode,
        reportingYear
      })
    )
  );
  
  // Aplicar conversión de moneda si es necesario
  const convertedSources = await convertCurrencies(
    sources.flat(),
    reportingYear
  );
  
  // Consolidar
  return consolidateValues(convertedSources, config, reportingYear);
}
```

### 6.4 Workflow de Aprobación Multi-Nivel

```typescript
interface ApprovalWorkflow {
  id: string;
  organizationId: string;
  entityType: 'datapoint' | 'consolidation' | 'report';
  entityId: string;
  stages: ApprovalStage[];
  currentStageIndex: number;
  status: 'pending' | 'approved' | 'rejected';
}

interface ApprovalStage {
  id: string;
  name: string;
  requiredRole: Role[];
  requiredApprovals: number; // Mínimo de aprobaciones requeridas
  approvers: Array<{
    userId: string;
    status: 'pending' | 'approved' | 'rejected';
    comments?: string;
    approvedAt?: string;
  }>;
  order: number;
}

// Ejemplo de workflow
const workflow: ApprovalWorkflow = {
  id: 'wf1',
  organizationId: 'org1',
  entityType: 'datapoint',
  entityId: 'dp1',
  stages: [
    {
      id: 'stage1',
      name: 'Department Review',
      requiredRole: ['Data Owner'],
      requiredApprovals: 1,
      approvers: [
        { userId: 'u1', status: 'approved', approvedAt: '2024-01-15' }
      ],
      order: 1
    },
    {
      id: 'stage2',
      name: 'Sustainability Lead Review',
      requiredRole: ['Sustainability Lead'],
      requiredApprovals: 1,
      approvers: [
        { userId: 'u2', status: 'pending' }
      ],
      order: 2
    },
    {
      id: 'stage3',
      name: 'Executive Approval',
      requiredRole: ['Sustainability Lead'],
      requiredApprovals: 2, // Requiere 2 aprobaciones
      approvers: [
        { userId: 'u3', status: 'pending' },
        { userId: 'u4', status: 'pending' }
      ],
      order: 3
    }
  ],
  currentStageIndex: 1,
  status: 'pending'
};
```

### 6.5 Compatibilidad Futura con iXBRL

#### 6.5.1 Estructura de Datos para iXBRL

```typescript
interface IXBRLMapping {
  datapointId: string;
  taxonomyElement: string; // e.g., "esrs:Scope1Emissions"
  context: {
    entity: string;
    period: {
      start: string;
      end: string;
    };
    scenario?: string;
  };
  unit: string;
  value: number | string;
  decimals?: number;
}

// Generar estructura iXBRL
async function generateIXBRLStructure(
  organizationId: string,
  cycleId: string
): Promise<IXBRLDocument> {
  const datapoints = await getApprovedDatapoints(organizationId, cycleId);
  const organization = await getOrganization(organizationId);
  
  const mappings: IXBRLMapping[] = datapoints.map(dp => ({
    datapointId: dp.id,
    taxonomyElement: mapToESRSTaxonomy(dp.code),
    context: {
      entity: organization.legalName,
      period: {
        start: `${cycle.year}-01-01`,
        end: `${cycle.year}-12-31`
      }
    },
    unit: dp.unit || 'pure',
    value: dp.values[cycle.year.toString()],
    decimals: dp.type === 'quantitative' ? 2 : undefined
  }));
  
  return {
    documentInfo: {
      taxonomy: 'https://www.esrs.eu/taxonomy/2024',
      language: 'en'
    },
    facts: mappings
  };
}
```

#### 6.5.2 Exportación iXBRL

```typescript
// Exportar a formato iXBRL (futuro)
async function exportToIXBRL(
  organizationId: string,
  cycleId: string
): Promise<Buffer> {
  const structure = await generateIXBRLStructure(organizationId, cycleId);
  
  // Generar XML iXBRL
  const xml = generateIXBRLXML(structure);
  
  return Buffer.from(xml, 'utf-8');
}
```

---

## 7. Roadmap de Implementación

### Fase 1: Fundación Empresarial (Meses 1-3)

#### Objetivos
- Migrar de POC a arquitectura backend real
- Implementar multi-tenancy básico
- Establecer RBAC robusto
- Sistema de audit logs

#### Entregables
1. **Backend API**
   - API REST con Express.js/FastAPI
   - Autenticación JWT + OAuth
   - Middleware de autorización
   - Validación de datos (Zod/Pydantic)

2. **Base de Datos**
   - Schema extendido con multi-tenancy
   - Migraciones con versionado
   - Índices optimizados
   - Row Level Security (RLS)

3. **Audit Logs**
   - Sistema de eventos
   - Almacenamiento en TimescaleDB
   - API de consulta de auditoría

4. **RBAC**
   - Roles predefinidos
   - Permisos granulares
   - Middleware de autorización

#### Métricas de Éxito
- ✅ 100% de operaciones auditables
- ✅ RBAC funcionando para todos los endpoints
- ✅ Multi-tenancy probado con 3+ organizaciones

---

### Fase 2: Dashboard y UX Empresarial (Meses 4-5)

#### Objetivos
- Rediseñar dashboard con drill-down
- Implementar readiness scoring
- Workflow status board
- Sistema de notificaciones

#### Entregables
1. **Dashboard Rediseñado**
   - KPI cards clickables con drill-down
   - Readiness scoring por función y ESRS
   - Workflow status board (Kanban)
   - Action items personalizados

2. **Sistema de Notificaciones**
   - Notificaciones en tiempo real (WebSocket)
   - Email notifications
   - Preferencias de usuario

3. **Mejoras de UX**
   - Filtros avanzados
   - Búsqueda full-text
   - Exportación de datos

#### Métricas de Éxito
- ✅ Tiempo promedio para encontrar datapoint < 30 segundos
- ✅ 90% de usuarios pueden completar tareas sin ayuda
- ✅ Readiness scoring actualizado en tiempo real

---

### Fase 3: Consolidación Avanzada (Meses 6-7)

#### Objetivos
- Consolidación multi-nivel
- Gestión de perímetros
- Versionado completo
- Validaciones avanzadas

#### Entregables
1. **Consolidación Multi-Nivel**
   - Roll-up jerárquico (Facility → Subsidiary → Country → Group)
   - Gestión de perímetros dinámicos
   - Conversión automática de unidades

2. **Versionado**
   - Historial completo de versiones
   - Comparación de versiones
   - Rollback (con aprobación)

3. **Validaciones**
   - Motor de reglas configurable
   - Validaciones cruzadas
   - Alertas proactivas

#### Métricas de Éxito
- ✅ Consolidación multi-nivel funcionando para 5+ niveles
- ✅ 100% de cambios versionados
- ✅ Validaciones detectan 95% de errores antes de aprobación

---

### Fase 4: AI Nativa (Meses 8-9)

#### Objetivos
- Análisis inteligente de evidencias
- Validación de consistencia temporal
- Generación mejorada de narrativas
- Detección de gaps regulatorios

#### Entregables
1. **Evidence Analyzer**
   - Extracción automática de datos de PDFs/Excel
   - Validación contra valores reportados
   - Scoring de confianza

2. **Temporal Consistency Validator**
   - Detección de anomalías
   - Sugerencias de acciones
   - Alertas automáticas

3. **Narrative Generator Mejorado**
   - Context-aware generation
   - Multi-estándar support
   - Evidencia-linked

4. **Gap Detector**
   - Detección automática de requisitos faltantes
   - Priorización inteligente
   - Sugerencias de acciones

#### Métricas de Éxito
- ✅ 80% de reducción en tiempo de revisión de evidencias
- ✅ 90% de precisión en detección de anomalías
- ✅ Narrativas generadas pasan revisión humana en 70% de casos

---

### Fase 5: Enterprise Features (Meses 10-12)

#### Objetivos
- Workflow de aprobación multi-nivel
- Multi-entity / multi-country completo
- Preparación para iXBRL
- Performance y escalabilidad

#### Entregables
1. **Workflow Engine**
   - Workflows configurables
   - Aprobaciones multi-nivel
   - Notificaciones automáticas

2. **Multi-Entity**
   - Soporte completo para grupos corporativos
   - Consolidación cross-entity
   - Reporting por entidad

3. **iXBRL Preparation**
   - Mapeo a taxonomía ESRS
   - Estructura de datos compatible
   - Exportación básica (sin renderizado HTML)

4. **Performance**
   - Caching estratégico (Redis)
   - Optimización de queries
   - CDN para assets estáticos
   - Load balancing

#### Métricas de Éxito
- ✅ Workflows completados en < 5 días promedio
- ✅ Sistema soporta 1000+ usuarios concurrentes
- ✅ Queries de dashboard < 500ms p95

---

## 8. Suposiciones y Consideraciones

### 8.1 Suposiciones Técnicas

1. **Infraestructura**
   - Acceso a cloud provider (AWS/GCP/Azure)
   - Presupuesto para servicios managed (RDS, Redis, etc.)
   - Equipo DevOps disponible

2. **Equipo**
   - 2-3 desarrolladores backend
   - 2 desarrolladores frontend
   - 1 DevOps engineer
   - 1 Product Manager
   - 1 Designer UX

3. **APIs Externas**
   - Google Gemini API disponible y con cuota suficiente
   - Posibilidad de integrar OpenAI como backup

### 8.2 Consideraciones de Negocio

1. **Compliance**
   - Cumplimiento con GDPR para datos de usuarios
   - Cumplimiento con regulaciones locales de cada país
   - Certificaciones de seguridad (ISO 27001, SOC 2)

2. **Escalabilidad**
   - Diseño para crecer de 10 a 1000+ organizaciones
   - Arquitectura que soporte millones de datapoints
   - Performance bajo carga alta

3. **Monetización**
   - Modelo SaaS por organización
   - Pricing basado en número de usuarios o datapoints
   - Tier enterprise con características avanzadas

### 8.3 Riesgos y Mitigaciones

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|-------------|------------|
| Cambios en regulación ESRS | Alto | Media | Diseño flexible, abstracción de estándares |
| Escalabilidad de AI costs | Medio | Alta | Caching, batch processing, límites de uso |
| Complejidad de consolidación | Alto | Alta | MVP primero, iterar basado en feedback |
| Adopción de usuarios | Alto | Media | UX intuitiva, onboarding guiado, soporte |

---

## 9. Conclusión

Esta arquitectura propone transformar el POC actual en una plataforma empresarial robusta, escalable y lista para producción. Los pilares clave son:

1. **Arquitectura Escalable**: Multi-tenancy, microservicios-ready, caching estratégico
2. **Modelo de Datos Robusto**: Versionado, trazabilidad, auditabilidad completa
3. **UX Empresarial**: Dashboard con drill-down, readiness scoring, workflows claros
4. **AI Nativa**: Características que resuelven problemas reales de ESG
5. **Enterprise-Ready**: RBAC, audit logs, multi-entity, preparación para iXBRL

El roadmap de 12 meses permite una implementación incremental y gestionable, con entregas de valor en cada fase.

---

**Documento creado**: Enero 2026  
**Versión**: 2.0  
**Autor**: Arquitectura Empresarial - NFQ ESG Reporting Suite  
**Estado**: Propuesta para Aprobación
