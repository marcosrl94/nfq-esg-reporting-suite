# Tema PALANTIR - Guía de Implementación

## ✅ Completado

### 1. Sistema de Diseño Base
- ✅ **Archivo CSS**: `styles/palantir-theme.css` con variables CSS y utilidades
- ✅ **Utilidades de Color**: `utils/palantirColors.ts` con paleta centralizada
- ✅ **Hook Responsive**: `hooks/useMobile.ts` para detectar tamaño de pantalla

### 2. App.tsx - Refactorizado
- ✅ Tema oscuro PALANTIR aplicado
- ✅ Sidebar responsive con overlay móvil
- ✅ Botón hamburguesa para móvil
- ✅ Navegación que cierra sidebar en móvil
- ✅ Header responsive con elementos adaptativos

### 3. Dashboard.tsx - Actualizado
- ✅ Cards KPI con tema PALANTIR
- ✅ Gráficos con colores PALANTIR
- ✅ Lista de tareas responsive
- ✅ Tipografía y espaciado optimizados

## 🎨 Paleta de Colores PALANTIR

```typescript
// Fondos
bg-primary: #000000      // Negro puro
bg-secondary: #0a0a0a    // Casi negro
bg-card: #1e1e1e         // Gris muy oscuro

// Texto
text-primary: #ffffff     // Blanco
text-secondary: #cccccc  // Gris claro
text-muted: #6a6a6a      // Gris medio

// Acentos
accent-blue: #0066ff      // Azul PALANTIR
accent-cyan: #00d4ff      // Cyan PALANTIR

// Estados
success: #00ff88          // Verde brillante
warning: #ffaa00          // Naranja
error: #ff4444            // Rojo
```

## 📱 Breakpoints Responsive

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: >= 1024px

## 🔄 Componentes Pendientes de Actualización

Los siguientes componentes necesitan actualización al tema PALANTIR:

### DataInput.tsx
**Cambios necesarios**:
- Reemplazar `bg-white` → `bg-[#1e1e1e]`
- Reemplazar `text-slate-800` → `text-white`
- Reemplazar `border-slate-200` → `border-[#2a2a2a]`
- Ajustar inputs y selects al tema oscuro
- Hacer layout responsive (stack vertical en móvil)

### NarrativeEngine.tsx
**Cambios necesarios**:
- Panel lateral responsive (oculto en móvil o colapsable)
- Tema oscuro en todos los elementos
- Botones con colores PALANTIR

### MaterialityAssessment.tsx
**Cambios necesarios**:
- Gráficos con colores PALANTIR
- Cards y inputs con tema oscuro
- Layout responsive para el scatter plot

### IndexComposer.tsx
**Cambios necesarios**:
- Tabla con tema oscuro
- Sidebar responsive
- Colores PALANTIR en badges

### BulkImportModal.tsx
**Cambios necesarios**:
- Modal con fondo oscuro
- Inputs y botones con tema PALANTIR
- Mejorar responsive en móvil

## 🛠️ Guía Rápida para Actualizar Componentes

### Paso 1: Reemplazar Colores de Fondo
```tsx
// Antes
className="bg-white border border-slate-200"

// Después
className="bg-[#1e1e1e] border border-[#2a2a2a]"
```

### Paso 2: Reemplazar Colores de Texto
```tsx
// Antes
className="text-slate-800"

// Después
className="text-white"
```

### Paso 3: Hacer Responsive
```tsx
import { useMobile } from '../hooks/useMobile';

const MyComponent = () => {
  const { isMobile, isTablet } = useMobile();
  
  return (
    <div className={`
      grid 
      ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}
      gap-4 lg:gap-6
    `}>
      {/* contenido */}
    </div>
  );
};
```

### Paso 4: Botones y Acentos
```tsx
// Botón primario PALANTIR
<button className="bg-[#0066ff] hover:bg-[#0052cc] text-white px-4 py-2 rounded transition-colors">
  Action
</button>

// Botón secundario PALANTIR
<button className="bg-transparent border border-[#2a2a2a] hover:bg-[#1a1a1a] text-[#cccccc] px-4 py-2 rounded transition-colors">
  Cancel
</button>
```

## 📋 Checklist de Actualización por Componente

Para cada componente, verificar:

- [ ] Fondos cambiados a `bg-[#1e1e1e]` o `bg-[#0a0a0a]`
- [ ] Textos cambiados a `text-white` o `text-[#cccccc]`
- [ ] Bordes cambiados a `border-[#2a2a2a]`
- [ ] Botones con colores PALANTIR (`#0066ff`, `#00d4ff`)
- [ ] Inputs con fondo oscuro y borde `#2a2a2a`
- [ ] Hover states con `hover:bg-[#1a1a1a]`
- [ ] Layout responsive (mobile-first)
- [ ] Gráficos con colores PALANTIR
- [ ] Scrollbars personalizados (ya en CSS global)

## 🎯 Prioridades

1. **Alta**: DataInput.tsx (componente más usado)
2. **Media**: NarrativeEngine.tsx, MaterialityAssessment.tsx
3. **Baja**: IndexComposer.tsx, BulkImportModal.tsx

## 📱 Mejoras de UX Mobile

### Implementadas
- ✅ Sidebar colapsable con overlay
- ✅ Botón hamburguesa
- ✅ Header responsive
- ✅ Cards apiladas en móvil

### Pendientes
- [ ] Swipe gestures para sidebar
- [ ] Touch-friendly targets (min 44x44px)
- [ ] Bottom navigation para móvil (opcional)
- [ ] Pull-to-refresh (opcional)

## 🔍 Testing Responsive

Para probar la aplicación:

1. **Chrome DevTools**:
   - F12 → Toggle device toolbar
   - Probar iPhone, iPad, Desktop

2. **Breakpoints a verificar**:
   - 375px (iPhone SE)
   - 768px (Tablet)
   - 1024px (Desktop pequeño)
   - 1440px (Desktop grande)

## 📚 Recursos

- **PALANTIR Design System**: Basado en observaciones de su interfaz
- **Tailwind CSS**: Usando clases personalizadas con valores hex
- **Recharts**: Configurado con colores PALANTIR para gráficos

## 🚀 Próximos Pasos

1. Actualizar DataInput.tsx completamente
2. Actualizar NarrativeEngine.tsx
3. Actualizar MaterialityAssessment.tsx
4. Testing completo en dispositivos reales
5. Optimizaciones de performance para móvil

---

**Estado**: Framework completo, componentes principales actualizados
**Última actualización**: 2024
