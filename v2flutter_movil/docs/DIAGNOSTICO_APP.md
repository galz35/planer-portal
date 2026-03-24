# 📊 Diagnóstico App Móvil Momentus
**Fecha**: 8 de Febrero 2026

---

## ✅ Lo que YA existe

| Componente | Estado | Archivo |
|------------|--------|---------|
| Estructura de carpetas | ✅ Bien organizada | `lib/features/*` |
| AuthController | ✅ Funcional | `auth/presentation/auth_controller.dart` |
| TaskController | ✅ Funcional | `tasks/presentation/task_controller.dart` |
| Sincronización offline | ✅ Implementada | `core/network/*` + SQLite |
| Bottom Navigation | ✅ Básica | `home_shell.dart` |
| Drawer Menu | ✅ Básico | `home_shell.dart` |
| Provider setup | ✅ Configurado | `app.dart` |

---

## ⚠️ Problemas Detectados

### 1. **Diseño Visual Genérico/Básico**
El actual diseño usa componentes por defecto de Flutter sin estilizar:
- Sin paleta de colores definida
- Sin tipografía custom
- Botones y cards básicos
- Sin animaciones ni micro-interacciones

### 2. **Archivos Duplicados**
Hay dos versiones de login:
- `features/auth/login_screen.dart` (nuevo con diseño)
- `features/auth/presentation/login_screen.dart` (existente básico)

**Solución**: Unificar usando el diseño nuevo.

### 3. **Tema Incompleto**
- `app_theme.dart` tiene modo oscuro que no se usará
- Falta simplificar a solo modo claro

### 4. **Imports Rotos**
El `home_shell.dart` tiene imports relativos incorrectos que causarán errores.

---

## 🔧 Ajustes Necesarios

### PRIORIDAD ALTA

| # | Tarea | Archivo |
|---|-------|---------|
| 1 | Simplificar tema (solo modo claro) | `app_theme.dart` |
| 2 | Actualizar app.dart (quitar darkTheme) | `app.dart` |
| 3 | Rediseñar LoginScreen existente | `auth/presentation/login_screen.dart` |
| 4 | Rediseñar HomeShell con nuevo tema | `home/presentation/home_shell.dart` |
| 5 | Eliminar login duplicado | `auth/login_screen.dart` |

### PRIORIDAD MEDIA

| # | Tarea | Archivo |
|---|-------|---------|
| 6 | Agregar animaciones de transición | `app.dart` |
| 7 | Crear splash screen verde | Nuevo archivo |
| 8 | Mejorar cards de tareas | `tasks/presentation/*` |
| 9 | Agregar pull-to-refresh estilizado | Varias pantallas |

### PRIORIDAD BAJA

| # | Tarea |
|---|-------|
| 10 | Agregar fuente Inter (Google Fonts) |
| 11 | Crear iconos de app verdes |
| 12 | Agregar shimmer loading |

---

## 🎨 Paleta de Colores Simplificada (Solo Claro)

```dart
// VERDE PRIMARIO (Sage suave)
primary:     #22C55E  // Botones, links, acentos
primaryLight: #4ADE80 // Hover, estados activos
primaryDark:  #16A34A // Pressed states

// FONDOS
background:  #F0FDF4  // Fondo principal (verde muy tenue)
surface:     #FFFFFF  // Cards, modales
surfaceAlt:  #F8FAFC  // Fondos secundarios

// TEXTO
textPrimary:   #0F172A // Títulos, texto principal
textSecondary: #475569 // Subtítulos
textMuted:     #94A3B8 // Placeholders, hints

// BORDES
border:      #E2E8F0 // Bordes de cards/inputs
borderFocus: #22C55E // Borde al enfocar

// SEMÁNTICOS
success: #10B981
warning: #F59E0B
error:   #EF4444
```

---

## 📱 Diseño Objetivo (Verde Suave Premium)

Inspiración: Apps modernas como Notion, Linear, Todoist pero con verde suave.

### Características:
1. **Fondo con tinte verde muy sutil** (`#F0FDF4`) - da sensación de frescura
2. **Cards blancas flotantes** con bordes suaves y sombras
3. **Botones verdes con gradiente sutil** 
4. **Iconos con color verde como acento**
5. **Tipografía Inter** limpia y legible
6. **Animaciones suaves** en transiciones
7. **Bottom bar con indicador verde animado**

---

## ⏱️ Estimación de Trabajo

| Tarea | Tiempo |
|-------|--------|
| Ajustar tema (solo claro) | 15 min |
| Rediseñar Login | 20 min |
| Rediseñar HomeShell | 30 min |
| Limpiar duplicados | 10 min |
| **Total** | ~1.5 horas |

---

## 🚀 Próxima Acción

Procederé a:
1. Simplificar el tema a solo modo claro
2. Rediseñar las pantallas existentes con el nuevo design system
3. Eliminar archivos duplicados
