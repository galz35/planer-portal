# 🎨 Sistema de Diseño - Momentus Mobile
**Versión**: 1.0 | **Solo Modo Claro**

---

## 🌿 Visión de Diseño

**Fresco, productivo y calmante.** Un diseño verde suave que transmite organización sin estrés. 

Inspiración:
- Notion (limpieza y espacios blancos)
- Linear (interacciones premium)
- Todoist (eficiencia visual)
- Forest App (paleta verde natural)

---

## 🎨 Paleta de Colores

### Verde Primario (Sage Fresh)
El verde es el color central. Transmite productividad, naturaleza y calma.

| Token | Hex | Uso |
|-------|-----|-----|
| `green50` | `#F0FDF4` | **Fondo principal de la app** |
| `green100` | `#DCFCE7` | Indicador de navegación activo, fondos de chips |
| `green200` | `#BBF7D0` | Bordes activos, switches |
| `green300` | `#86EFAC` | Iconos en estados vacíos |
| `green400` | `#4ADE80` | Gradiente (inicio) |
| `green500` | `#22C55E` | **Color principal** - Botones, links |
| `green600` | `#16A34A` | Gradiente (fin), hover states |
| `green700` | `#15803D` | Texto en avatares, énfasis |

### Neutrales (Slate)
Para texto, bordes y elementos secundarios.

| Token | Hex | Uso |
|-------|-----|-----|
| `slate50` | `#F8FAFC` | Fondos secundarios |
| `slate100` | `#F1F5F9` | Fondos de secciones |
| `slate200` | `#E2E8F0` | Bordes de inputs/cards |
| `slate300` | `#CBD5E1` | Bordes de checkbox inactivos |
| `slate400` | `#94A3B8` | Iconos inactivos, placeholders |
| `slate500` | `#64748B` | Texto secundario |
| `slate600` | `#475569` | Texto normal |
| `slate700` | `#334155` | Títulos en drawer |
| `slate800` | `#1E293B` | Texto bodyLarge |
| `slate900` | `#0F172A` | **Títulos principales** |

### Semánticos
| Estado | Color | Hex |
|--------|-------|-----|
| Éxito (prioridad baja) | Verde esmeralda | `#10B981` |
| Advertencia (prioridad media) | Ámbar | `#F59E0B` |
| Error (prioridad alta) | Rojo | `#EF4444` |
| Info | Azul | `#3B82F6` |

---

## 🌈 Gradientes

### Gradiente Primario
Para botones principales, headers del drawer.
```dart
LinearGradient(
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
  colors: [green400, green600],
)
```

### Gradiente de Fondo
Para la pantalla de login.
```dart
LinearGradient(
  begin: Alignment.topCenter,
  end: Alignment.bottomCenter,
  colors: [green50, Colors.white],
)
```

---

## 📝 Tipografía

### Fuente
**Inter** - Sans-serif moderna, óptima para interfaces.

### Escala
| Estilo | Tamaño | Peso | Uso |
|--------|--------|------|-----|
| displayLarge | 32px | 700 | Splash screen |
| displaySmall | 24px | 600 | Título de login |
| headlineMedium | 20px | 600 | Títulos de sección |
| headlineSmall | 18px | 600 | Headers de cards |
| titleMedium | 16px | 500 | Títulos de tareas |
| titleSmall | 14px | 500 | Subtítulos |
| bodyLarge | 16px | 400 | Texto principal |
| bodyMedium | 14px | 400 | Texto secundario |
| bodySmall | 12px | 400 | Texto terciario |
| labelSmall | 11px | 500 | Badges, etiquetas |

---

## 📐 Espaciado

Sistema de 4px:
| Token | Valor | Uso |
|-------|-------|-----|
| `spaceXxs` | 4px | Mínimo |
| `spaceXs` | 8px | Entre iconos y texto |
| `spaceSm` | 12px | Padding de chips |
| `spaceMd` | 16px | Padding de cards |
| `spaceLg` | 24px | Separación de secciones |
| `spaceXl` | 32px | Márgenes laterales |
| `spaceXxl` | 48px | Espacio en login |

---

## 🔲 Bordes Redondeados

| Token | Valor | Uso |
|-------|-------|-----|
| `radiusXs` | 6px | Checkboxes |
| `radiusSm` | 8px | Chips |
| `radiusMd` | 12px | Botones, inputs |
| `radiusLg` | 16px | Cards |
| `radiusXl` | 24px | Modales, logo |
| `radiusFull` | 100px | Avatares, badges |

---

## 🌓 Sombras

### Card Shadow
Sombra sutil para cards flotantes.
```dart
[
  BoxShadow(
    color: slate900.withOpacity(0.04),
    blurRadius: 8,
    offset: Offset(0, 2),
  ),
  BoxShadow(
    color: slate900.withOpacity(0.02),
    blurRadius: 24,
    offset: Offset(0, 8),
  ),
]
```

### Button Shadow
Sombra verde para botones principales.
```dart
[
  BoxShadow(
    color: primary.withOpacity(0.25),
    blurRadius: 12,
    offset: Offset(0, 4),
  ),
]
```

---

## 🧩 Componentes

### Botón Primario
- Fondo: Gradiente verde (green400 → green600)
- Texto: Blanco, 16px, w600
- Height: 52px
- Border Radius: 12px
- Sombra: Button shadow verde

### Botón Secundario (Outlined)
- Fondo: Transparente
- Borde: 1.5px green500
- Texto: green500, 16px, w600

### Input Field
- Fondo: Blanco
- Borde: 1px slate200
- Borde Focus: 2px green500
- Padding: 18px horizontal/vertical
- Border Radius: 12px

### Task Card
- Fondo: Blanco
- Border Radius: 16px
- Sombra: Card shadow
- Checkbox: Círculo con borde, verde al completar
- Badge de prioridad: Pill con color semántico

### Bottom Navigation
- Fondo: Blanco con sombra superior
- Item activo: Fondo green50, icono/texto green500
- Item inactivo: Icono slate400, texto slate500
- Animación: 200ms ease-out

### Drawer
- Header: Gradiente verde con avatar
- Items: Icono + título + chevron
- Logout: Botón outlined rojo

---

## 📱 Pantallas

### 1. Login
```
┌────────────────────────────────────┐
│     Fondo: Gradiente green50→white │
│                                    │
│         ┌──────────┐               │
│         │  LOGO    │ ← Gradiente   │
│         │  verde   │               │
│         └──────────┘               │
│                                    │
│          Momentus                  │
│    Gestiona tu día con claridad   │
│                                    │
│  ┌────────────────────────────┐   │
│  │ Card blanca con sombra     │   │
│  │                            │   │
│  │  Iniciar Sesión            │   │
│  │                            │   │
│  │  [📧 Email input         ] │   │
│  │  [🔒 Password       👁   ] │   │
│  │                            │   │
│  │  [████ ENTRAR ████→]       │ ← Gradiente
│  │                            │   │
│  │    ¿Olvidaste tu clave?    │   │
│  └────────────────────────────┘   │
│                                    │
│        ─── Versión 1.0 ───        │
└────────────────────────────────────┘
```

### 2. Home (con Bottom Nav)
```
┌────────────────────────────────────┐
│ Fondo: green50                     │
│                                    │
│  [Contenido de la pantalla]        │
│                                    │
│  Cards blancas flotantes           │
│  con sombras sutiles               │
│                                    │
├────────────────────────────────────┤
│ ┌─────────────────────────────────┐│
││  🏠     📋     📁     👥     📊  ││
││  Hoy  Pend. Proy. Equipo Dash   ││
│└─────────────────────────────────┘│
└────────────────────────────────────┘
     ↑ Item activo: fondo green50
       icono y texto green500
```

---

## ✨ Animaciones

| Elemento | Duración | Curva |
|----------|----------|-------|
| Entrada login | 800ms | easeOut |
| Bottom nav item | 200ms | easeOut |
| Checkbox complete | 200ms | easeIn |
| Card press | 100ms | linear |

---

## 📦 Archivos de Diseño

| Archivo | Propósito |
|---------|-----------|
| `lib/core/theme/app_theme.dart` | Tema completo (solo claro) |
| `lib/core/widgets/momentus_widgets.dart` | Componentes reutilizables |

---

**El diseño está optimizado para simplicidad y productividad.** 🌿
