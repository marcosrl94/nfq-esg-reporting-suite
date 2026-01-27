# Configuración de API Key de Google Gemini

## Pasos para configurar la API Key

### 1. Obtener una API Key de Google Gemini

1. Ve a una de estas URLs:
   - **Google AI Studio**: https://aistudio.google.com/app/apikey
   - **Google MakerSuite**: https://makersuite.google.com/app/apikey

2. Inicia sesión con tu cuenta de Google

3. Haz clic en "Create API Key" o "Crear clave API"

4. Selecciona un proyecto de Google Cloud o crea uno nuevo

5. Copia la API key generada (tendrá un formato como: `AIzaSy...`)

### 2. Configurar la API Key en el proyecto

El archivo `.env.local` ya existe en tu proyecto. Necesitas editarlo y agregar tu API key:

**Opción A: Usando un editor de texto**

1. Abre el archivo `.env.local` en la raíz del proyecto
2. Agrega o modifica la línea:
   ```
   GEMINI_API_KEY=tu_clave_api_aqui
   ```
3. Reemplaza `tu_clave_api_aqui` con tu API key real
4. Guarda el archivo

**Opción B: Usando la terminal**

```bash
# En la raíz del proyecto
echo "GEMINI_API_KEY=tu_clave_api_aqui" > .env.local
```

Reemplaza `tu_clave_api_aqui` con tu API key real.

### 3. Verificar el formato del archivo

El archivo `.env.local` debe tener exactamente este formato:

```
GEMINI_API_KEY=AIzaSyTuClaveApiAqui123456789
```

**Importante:**
- No dejes espacios alrededor del signo `=`
- No uses comillas alrededor del valor
- No agregues líneas en blanco innecesarias
- Cada variable debe estar en una línea separada

### 4. Reiniciar el servidor de desarrollo

Después de configurar la API key, **debes reiniciar el servidor de desarrollo** para que los cambios surtan efecto:

1. Detén el servidor actual (Ctrl+C o Cmd+C)
2. Inicia el servidor nuevamente:
   ```bash
   npm run dev
   ```

### 5. Verificar que funciona

1. Ve a la sección "Narrative Engine" en la aplicación
2. Intenta generar una narrativa
3. Si todo está correcto, deberías ver la narrativa generándose sin errores

## Solución de problemas

### Error: "API Key no configurada"

- Verifica que el archivo `.env.local` existe en la raíz del proyecto
- Verifica que la línea `GEMINI_API_KEY=...` está presente
- Verifica que no hay espacios alrededor del `=`
- **Reinicia el servidor de desarrollo** después de hacer cambios

### Error: "API Key no válida"

- Verifica que copiaste la API key completa (sin espacios al inicio o final)
- Verifica que la API key no haya expirado
- Verifica que la API key tiene permisos para usar la API de Gemini
- Intenta crear una nueva API key

### El servidor no detecta los cambios

- Asegúrate de haber reiniciado el servidor completamente
- Verifica que estás editando el archivo `.env.local` correcto (en la raíz del proyecto)
- Intenta eliminar la carpeta `node_modules/.vite` y reiniciar

## Estructura del proyecto

```
nfq-esg-reporting-suite/
├── .env.local          ← Archivo de configuración (crear/editar aquí)
├── vite.config.ts      ← Configuración de Vite (ya configurado)
├── services/
│   └── geminiService.ts ← Lee la variable GEMINI_API_KEY
└── ...
```

## Notas de seguridad

- **NUNCA** subas el archivo `.env.local` a Git (ya está en .gitignore)
- **NUNCA** compartas tu API key públicamente
- Si compartes el código, asegúrate de que `.env.local` esté en `.gitignore`
- Si necesitas compartir la configuración, usa `.env.example` como plantilla
