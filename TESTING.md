# Guía de Pruebas - NFQ ESG Reporting Suite

## ✅ Estado de la Aplicación

La aplicación ha sido refactorizada y está lista para pruebas. Todos los componentes principales están funcionando.

---

## 1. Verificar que la Aplicación Funciona

### Pasos para Probar Localmente

1. **Instalar dependencias** (si no están instaladas):
```bash
npm install
```

2. **Iniciar el servidor de desarrollo**:
```bash
npm run dev
```

3. **Abrir en el navegador**:
   - La aplicación debería abrirse en `http://localhost:5173` (o el puerto que Vite asigne)

### Verificaciones Básicas

✅ **Context API Funciona**:
- Navega entre diferentes vistas (Dashboard, Data Ingestion, etc.)
- Cambia de usuario usando el selector en el sidebar
- Verifica que los datos persisten al cambiar de vista

✅ **Componentes Principales**:
- **Dashboard**: Debería mostrar estadísticas de datapoints
- **Data Ingestion**: Debería permitir editar datapoints individuales
- **Materiality Assessment**: Debería funcionar (requiere API key de Gemini)
- **Narrative Engine**: Debería generar narrativas (requiere API key de Gemini)

✅ **Bulk Import** (NUEVO):
- Ve a "Data Ingestion"
- Haz clic en "Bulk Import" en la parte superior izquierda
- Selecciona el archivo `database/example_bulk_import.json`
- Verifica que el modal se abre y muestra el proceso de importación

---

## 2. Ejecutar Schema SQL en Supabase

### Preparación

1. **Crear cuenta en Supabase** (si no tienes una):
   - Ve a https://supabase.com
   - Crea un nuevo proyecto

2. **Obtener credenciales**:
   - Ve a Settings → API
   - Anota tu `Project URL` y `anon/public key`

### Ejecutar el Schema

1. **Abrir SQL Editor en Supabase**:
   - En el dashboard de Supabase, ve a "SQL Editor"
   - Haz clic en "New query"

2. **Copiar y pegar el schema**:
   - Abre el archivo `database/schema.sql`
   - Copia todo el contenido
   - Pégalo en el SQL Editor de Supabase

3. **Ejecutar el script**:
   - Haz clic en "Run" o presiona `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)
   - Verifica que no hay errores en la consola

4. **Verificar tablas creadas**:
   - Ve a "Table Editor" en Supabase
   - Deberías ver las siguientes tablas:
     - `users`
     - `standards`
     - `datapoints`
     - `comments`
     - `evidence_files`
     - `audit_logs`
     - `materiality_assessments`

### Configurar Storage (Opcional)

Para subir archivos de evidencia:

1. Ve a "Storage" en Supabase
2. Crea un nuevo bucket llamado `evidence-files`
3. Configura políticas públicas según tus necesidades de seguridad

---

## 3. Probar Bulk Import

### Preparar Archivo de Prueba

Usa el archivo de ejemplo incluido: `database/example_bulk_import.json`

O crea tu propio archivo JSON/CSV con esta estructura:

```json
[
  {
    "Consumo Elec": 12500,
    "Emisiones Scope 1": 45200,
    "Emisiones Scope 2": 12500,
    "Año": 2024
  }
]
```

### Proceso de Importación

1. **Abrir Bulk Import Modal**:
   - Ve a "Data Ingestion"
   - Haz clic en "Bulk Import" (botón azul arriba a la izquierda)

2. **Seleccionar archivo**:
   - Haz clic en "Seleccionar archivo"
   - Elige `database/example_bulk_import.json`

3. **Revisar mapeos**:
   - El sistema usará IA para mapear automáticamente las columnas
   - Verás el nivel de confianza de cada mapeo (verde = alto, amarillo = medio, rojo = bajo)

4. **Importar**:
   - Haz clic en "Importar datos"
   - Observa el progreso en tiempo real
   - Revisa los resultados al finalizar

5. **Verificar datos**:
   - Los datapoints deberían actualizarse automáticamente
   - Ve a un datapoint individual para verificar que los valores se importaron correctamente

### Notas sobre el Mapeo Automático

El sistema de IA intentará mapear columnas como:
- "Consumo Elec" → "E1-6-02" (Scope 2 emissions)
- "Emisiones Scope 1" → "E1-6-01" (Scope 1 emissions)
- "Emisiones Scope 3" → "E1-6-03" (Scope 3 emissions)

Si el mapeo no es correcto, puedes:
- Ajustar los nombres de las columnas en tu archivo
- Usar los códigos exactos de datapoints como nombres de columna

---

## 4. Probar Servicios de IA

### Configurar API Key de Gemini

1. **Obtener API Key**:
   - Ve a https://aistudio.google.com/app/apikey
   - Crea una nueva API key

2. **Configurar en la aplicación**:
   - Haz clic en "Configure API Key" en el sidebar (abajo)
   - O configura la variable de entorno `API_KEY`

### Funcionalidades que Requieren IA

✅ **Narrative Engine**:
- Ve a "Narrative Engine"
- Selecciona una sección
- Haz clic en "Generate Narrative"
- Verifica que se genera texto coherente

✅ **Materiality Assessment**:
- Ve a "Double Materiality"
- Ingresa sectores y países
- Genera la matriz de materialidad
- Verifica que se crean topics con scores

✅ **AI Verification**:
- Ve a "Data Ingestion"
- Selecciona un datapoint con evidencia
- Haz clic en "Verify Data"
- Verifica que se muestra el resultado de la verificación

---

## 5. Verificar Manejo de Errores

### Probar Reintentos

El servicio de Gemini ahora incluye:
- ✅ Reintentos automáticos con backoff exponencial
- ✅ Manejo de rate limits
- ✅ Manejo de errores de red

Para probar:
1. Desconecta temporalmente tu internet
2. Intenta generar una narrativa
3. Reconecta y verifica que se reintenta automáticamente

### Probar Validaciones

1. **Bulk Import con datos inválidos**:
   - Crea un JSON con valores no numéricos para datapoints cuantitativos
   - Verifica que se muestran errores apropiados

2. **Archivos no soportados**:
   - Intenta importar un archivo .txt o .pdf
   - Verifica que se muestra un mensaje de error claro

---

## 6. Checklist de Verificación

- [ ] La aplicación inicia sin errores
- [ ] Los contextos funcionan (cambiar usuario, navegar vistas)
- [ ] El Dashboard muestra estadísticas correctas
- [ ] Data Ingestion permite editar datapoints
- [ ] Bulk Import modal se abre y funciona
- [ ] El schema SQL se ejecuta en Supabase sin errores
- [ ] Las tablas se crean correctamente en Supabase
- [ ] Los servicios de IA funcionan (con API key configurada)
- [ ] El manejo de errores funciona correctamente

---

## Troubleshooting

### Error: "API Key is missing"
- Configura la variable de entorno `API_KEY` o usa el botón "Configure API Key"

### Error: "Cannot find module"
- Ejecuta `npm install` para instalar dependencias

### Error en Supabase: "relation already exists"
- Las tablas ya existen. Elimínalas primero o usa `DROP TABLE IF EXISTS`

### Bulk Import no mapea correctamente
- Ajusta los nombres de las columnas para que sean más descriptivos
- Usa los códigos exactos de datapoints como nombres de columna

---

## Próximos Pasos

Una vez verificada la funcionalidad básica:

1. **Integrar con Supabase**:
   - Crear cliente de Supabase en el frontend
   - Reemplazar estado en memoria con queries a la base de datos

2. **Migrar a TanStack Query**:
   - Reemplazar Context API con TanStack Query
   - Implementar cache y sincronización automática

3. **Implementar autenticación**:
   - Integrar Supabase Auth
   - Implementar login/logout

4. **Subir archivos de evidencia**:
   - Integrar Supabase Storage
   - Permitir upload de PDFs/Excel

---

**Última actualización**: 2024
**Estado**: ✅ Listo para pruebas
