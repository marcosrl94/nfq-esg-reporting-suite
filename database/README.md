# Database Schema Documentation

Este directorio contiene el schema SQL para la base de datos de NFQ ESG Reporting Suite.

## Archivos

- `schema.sql`: Script completo de creación de tablas, índices, triggers y políticas RLS

## Estructura de Tablas

### users
Almacena información de usuarios del sistema con sus roles y departamentos.

### standards
Define los estándares de reporting (ESRS, GRI, ISSB, TCFD, SASB).

### datapoints
Contiene los datapoints individuales con sus valores, estado del workflow, y verificaciones de IA.

### comments
Comentarios y colaboración en datapoints.

### evidence_files
Archivos de evidencia adjuntos a datapoints.

### audit_logs
Registro de auditoría de todos los cambios en el sistema.

### materiality_assessments
Evaluaciones de materialidad doble realizadas por usuarios.

## Seguridad (RLS)

El schema incluye políticas de Row Level Security (RLS) que garantizan:

- **Sustainability Leads (Admins)**: Acceso completo a todos los datos
- **Data Owners**: Solo pueden ver/editar datapoints de su departamento
- **Auditors**: Solo pueden ver datapoints aprobados/bloqueados

## Instalación en Supabase

1. Abre el SQL Editor en tu proyecto de Supabase
2. Copia y pega el contenido de `schema.sql`
3. Ejecuta el script
4. Verifica que todas las tablas se crearon correctamente
5. Configura el storage bucket para `evidence-files`

## Migraciones Futuras

Para cambios futuros al schema, crea archivos de migración numerados:
- `001_initial_schema.sql`
- `002_add_new_feature.sql`
- etc.
