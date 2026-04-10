# Configuración de API Key de Google Gemini

## Pasos para configurar la API Key

### 1. Obtener una API Key de Google Gemini

#### Opción A: Google AI Studio (Recomendado - Más fácil)

1. **Abre tu navegador** y ve a: https://aistudio.google.com/app/apikey
   - Si el enlace no funciona, busca "Google AI Studio API key" en Google

2. **Inicia sesión** con tu cuenta de Google
   - Si no tienes cuenta de Google, créala primero en https://accounts.google.com/signup

3. **Acepta los Términos de Servicio** si es la primera vez
   - Google creará automáticamente un proyecto por defecto

4. **Haz clic en "Create API Key"** o **"Crear clave API"**
   - El botón puede estar en la parte superior derecha o en el centro de la página

5. **Selecciona un proyecto**:
   - Si tienes proyectos existentes, selecciona uno
   - Si no tienes proyectos, haz clic en "Create new project" o "Crear nuevo proyecto"
   - También puedes usar el proyecto por defecto que Google crea automáticamente

6. **Copia la API key** que aparece en pantalla
   - Formato: `AIzaSy...` (empieza con "AIzaSy" seguido de letras y números)
   - **IMPORTANTE**: Copia la clave completa, puede ser bastante larga
   - Guárdala en un lugar seguro temporalmente

#### Opción B: Google Cloud Console (Alternativa)

Si la Opción A no funciona, intenta esta:

1. Ve a: https://console.cloud.google.com/apis/credentials
2. Inicia sesión con tu cuenta de Google
3. Selecciona o crea un proyecto de Google Cloud
4. Haz clic en "Create Credentials" > "API Key"
5. Copia la API key generada

#### Problemas comunes y soluciones

**Problema: "No puedo acceder a Google AI Studio"**
- Verifica que estés usando una cuenta de Google válida
- Intenta en modo incógnito o con otro navegador
- Asegúrate de tener conexión a internet estable

**Problema: "No veo el botón Create API Key"**
- Asegúrate de estar en la página correcta: https://aistudio.google.com/app/apikey
- Intenta refrescar la página (F5 o Cmd+R)
- Verifica que hayas iniciado sesión correctamente

**Problema: "Me pide crear un proyecto pero no sé cómo"**
- Haz clic en "Create new project" o "Crear nuevo proyecto"
- Dale un nombre simple como "Mi Proyecto Gemini" o "Test Project"
- Haz clic en "Create" o "Crear"
- Espera unos segundos a que se cree el proyecto

**Problema: "La API key no aparece después de crearla"**
- Revisa si hay un mensaje de confirmación en la página
- Busca en la lista de "API Keys" en la página
- Intenta crear otra API key si es necesario

**Problema: "Me pide habilitar facturación"**
- Para uso básico y pruebas, Google ofrece un tier gratuito
- Puedes crear la API key sin habilitar facturación inicialmente
- Si te lo pide, puedes configurar facturación más tarde (hay créditos gratuitos disponibles)

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

## Guía Visual Paso a Paso

### Paso 1: Acceder a Google AI Studio
```
1. Abre tu navegador (Chrome, Firefox, Safari, etc.)
2. Ve a: https://aistudio.google.com/app/apikey
3. Verás una página con el título "Get API key" o "Obtener clave API"
```

### Paso 2: Iniciar Sesión
```
1. Si no estás logueado, haz clic en "Sign in" o "Iniciar sesión"
2. Ingresa tu email de Google y contraseña
3. Si no tienes cuenta, créala primero en accounts.google.com
```

### Paso 3: Crear la API Key
```
1. Busca el botón "Create API Key" (puede estar en azul o verde)
2. Si te pregunta por un proyecto:
   - Opción 1: Selecciona "Create new project" y dale un nombre
   - Opción 2: Usa el proyecto por defecto si aparece
3. Haz clic en "Create API Key in new project" o similar
```

### Paso 4: Copiar la API Key
```
1. Verás un cuadro con tu API key (empieza con "AIzaSy...")
2. Haz clic en el ícono de copiar o selecciona todo el texto
3. Pégala en un documento temporal para no perderla
```

### Paso 5: Configurar en el Proyecto
```
1. Abre el archivo .env.local en tu proyecto
2. Reemplaza TU_API_KEY_AQUI con la clave que copiaste
3. Guarda el archivo
```

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
