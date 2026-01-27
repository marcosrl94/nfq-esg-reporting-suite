# Arquitectura Enterprise-Ready - NFQ ESG Reporting Suite

## Resumen de Refactorización

Esta aplicación ha sido refactorizada de un MVP client-side a una arquitectura escalable lista para producción.

---

## 1. Refactorización de Estado con Context API ✅

### Estructura Creada

```
contexts/
├── SectionsContext.tsx    # Gestión de sections y datapoints
├── UsersContext.tsx       # Gestión de usuarios y autenticación
├── AppViewContext.tsx     # Navegación y vista activa
└── index.ts               # Exportaciones centralizadas
```

### Beneficios

- **Separación de concerns**: Cada contexto maneja su propio dominio
- **Preparado para TanStack Query**: Los hooks personalizados (`useSections`, `useUsers`, `useAppView`) facilitan la migración futura a un estado servidor
- **Reutilización**: Los contextos pueden ser usados en cualquier componente sin prop drilling
- **Testeable**: Cada contexto puede ser probado independientemente

### Uso

```typescript
// En cualquier componente
import { useSections, useUsers, useAppView } from '../contexts';

const MyComponent = () => {
  const { sections, updateDatapoint } = useSections();
  const { currentUser } = useUsers();
  const { currentView, setCurrentView } = useAppView();
  // ...
};
```

---

## 2. Schema de Base de Datos (Supabase/PostgreSQL) ✅

### Archivos Creados

```
database/
├── schema.sql    # Script completo de creación de tablas
└── README.md     # Documentación del schema
```

### Tablas Implementadas

1. **users** - Usuarios del sistema con roles y departamentos
2. **standards** - Estándares de reporting (ESRS, GRI, ISSB, TCFD, SASB)
3. **datapoints** - Datapoints individuales con valores JSONB, estado workflow, verificaciones IA
4. **comments** - Sistema de comentarios y colaboración
5. **evidence_files** - Archivos de evidencia adjuntos
6. **audit_logs** - Registro completo de auditoría
7. **materiality_assessments** - Evaluaciones de materialidad doble

### Seguridad (RLS)

Políticas de Row Level Security implementadas:

- **Sustainability Leads (Admins)**: Acceso completo
- **Data Owners**: Solo su departamento
- **Auditors**: Solo datapoints aprobados/bloqueados

### Características

- Índices optimizados para consultas frecuentes
- Triggers automáticos para `updated_at`
- Soporte JSONB para datos flexibles
- Foreign keys con cascadas apropiadas

---

## 3. Mejora del Servicio de IA (Gemini) ✅

### Mejoras Implementadas

#### Manejo Robusto de Errores

```typescript
// Tipos de error específicos
- GeminiServiceError (base)
- RateLimitError (reintentable)
- AuthenticationError (no reintentable)
- NetworkError (reintentable)
```

#### Sistema de Reintentos

- **Backoff exponencial** con jitter para evitar thundering herd
- **Rate limiting** entre requests (2 segundos mínimo)
- **Máximo 3 reintentos** por defecto
- **Configurable** por operación

#### Función `verifyEvidence` Mejorada

Ahora acepta:
- `File` (objeto File del navegador)
- `Buffer` (Node.js Buffer)
- `string` (nombre de archivo - legacy)

La función procesa automáticamente:
- Archivos de texto → lectura directa
- Archivos binarios (PDF, Excel) → conversión a base64
- Análisis inteligente del contenido

### Ejemplo de Uso

```typescript
import { verifyEvidence } from './services/geminiService';

// Con archivo real
const file = event.target.files[0];
const result = await verifyEvidence(
  'Gross Scope 1 GHG emissions',
  45200,
  file, // File object
  'tCO2e'
);

// Con nombre de archivo (legacy)
const result = await verifyEvidence(
  'Gross Scope 1 GHG emissions',
  45200,
  'Utility_Bills_2023.pdf', // string
  'tCO2e'
);
```

---

## 4. Sistema de Ingesta Masiva (ETL) ✅

### Archivo Creado

```
services/
└── bulkImporter.ts    # Servicio completo de importación masiva
```

### Interfaces TypeScript

```typescript
interface ColumnMapping {
  sourceColumn: string;
  datapointCode: string;
  confidence: number; // 0-100
  reasoning?: string;
}

interface BulkImportResult {
  success: boolean;
  totalRows: number;
  processedRows: number;
  failedRows: number;
  mappings: ColumnMapping[];
  errors: BulkImportError[];
  datapointsUpdated: string[];
}
```

### Funcionalidades

1. **Mapeo Automático por IA**
   - Analiza nombres de columnas del Excel/CSV
   - Mapea automáticamente a códigos de datapoints (ej: "Consumo Elec" → "E1-6-02")
   - Proporciona nivel de confianza y razonamiento

2. **Validación de Datos**
   - Valida tipos (quantitative vs qualitative)
   - Verifica que las columnas mapeadas existan
   - Reporta errores detallados por fila

3. **Importación con Progreso**
   - Callback de progreso para UI
   - Soporte para dry-run (simulación)
   - Actualización masiva de datapoints

### Ejemplo de Uso

```typescript
import { executeBulkImport } from './services/bulkImporter';

// Datos desde Excel/CSV convertidos a JSON
const bulkData = [
  { 'Consumo Elec': 12500, 'Emisiones Scope 1': 45200, 'Año': 2024 },
  { 'Consumo Elec': 12100, 'Emisiones Scope 1': 48500, 'Año': 2023 },
];

const result = await executeBulkImport(
  bulkData,
  sections, // StandardSection[]
  {
    year: 2024,
    dryRun: false,
    overwriteExisting: true
  },
  (stage, progress) => {
    console.log(stage, progress);
  }
);

console.log(`Procesadas ${result.processedRows} de ${result.totalRows} filas`);
console.log(`Mapeos: ${result.mappings.length}`);
```

---

## Próximos Pasos Recomendados

### Migración a Backend

1. **Crear API REST/GraphQL**
   - Endpoints para CRUD de datapoints
   - Autenticación con Supabase Auth
   - Integración con el schema SQL creado

2. **Migrar a TanStack Query**
   - Reemplazar Context API con queries/mutations
   - Cache automático y sincronización
   - Optimistic updates

3. **Implementar Storage**
   - Configurar Supabase Storage para `evidence_files`
   - Upload directo desde frontend
   - URLs seguras con expiración

### Mejoras Adicionales

1. **Testing**
   - Unit tests para contextos
   - Integration tests para servicios
   - E2E tests para flujos críticos

2. **Performance**
   - Lazy loading de componentes
   - Virtualización de listas grandes
   - Optimización de re-renders

3. **Monitoreo**
   - Error tracking (Sentry, etc.)
   - Analytics de uso
   - Performance monitoring

---

## Estructura de Archivos Final

```
nfq-esg-reporting-suite/
├── contexts/              # ✅ Context API
│   ├── SectionsContext.tsx
│   ├── UsersContext.tsx
│   ├── AppViewContext.tsx
│   └── index.ts
├── database/              # ✅ Schema SQL
│   ├── schema.sql
│   └── README.md
├── services/              # ✅ Servicios mejorados
│   ├── geminiService.ts   # Con reintentos y manejo de errores
│   └── bulkImporter.ts    # Sistema ETL completo
├── components/            # Componentes existentes
├── App.tsx                # ✅ Refactorizado para usar contextos
└── types.ts               # Tipos existentes
```

---

## Notas de Implementación

- ✅ **Compatibilidad hacia atrás**: El código existente sigue funcionando
- ✅ **Type-safe**: Todo está tipado estrictamente con TypeScript
- ✅ **Escalable**: Preparado para cientos de usuarios y miles de datapoints
- ✅ **Mantenible**: Código modular y bien documentado

---

**Fecha de Refactorización**: 2024
**Estado**: ✅ Completado - Listo para migración a backend
