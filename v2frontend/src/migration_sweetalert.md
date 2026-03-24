# Plan de Migración a SweetAlert2 (Clarity PWA)

Este documento detalla el plan para reemplazar los cuadros de diálogo nativos de `window.confirm` por una experiencia más premium utilizando **SweetAlert2 (Swal)**.

## 📋 Listado de Tareas y Componentes Detectados

A continuación se listan los archivos que actualmente utilizan `confirm()` o `window.confirm()` y que serán actualizados:

### 🏗️ Gestión de Proyectos y Tareas
- [ ] `src/pages/Planning/PlanTrabajoPage.tsx`
    - Eliminar comentario (línea 799)
    - Aprobación de cambios sensibles (línea 870)
    - Eliminación definitiva de tarea (línea 1072)
    - Eliminación de proyecto (línea 1358)
    - Confirmación genérica de eliminación de tarea (línea 1811)
- [ ] `src/pages/Planning/GestionProyecto2.tsx`
    - Eliminación de proyecto (línea 517)
- [ ] `src/pages/Planning/TimelinePage.tsx`
    - Archivar proyecto (línea 309)
- [ ] `src/components/ui/CreateTaskModal.tsx`
    - Asignación masiva por área (línea 187)
- [ ] `src/hooks/useTaskController.ts`
    - Posponer tarea al backlog (línea 241)
    - Cerrar tarea (línea 248)
    - Eliminar comentario (línea 294)

### 👥 Equipo y Colaboración
- [ ] `src/pages/Equipo/EquipoBloqueosPage.tsx`
    - Resolver bloqueo (línea 55)
- [ ] `src/pages/Notes/MeetingNotesPage.tsx`
    - Eliminar nota permanentemente (línea 157)
- [ ] `src/components/acceso/DelegacionModal.tsx`
    - Eliminar delegación (línea 83)

### 🔐 Administración y Accesos
- [ ] `src/pages/Admin/Roles/RolesPage.tsx`
    - Cambios sin guardar (línea 61)
    - Eliminar rol (línea 136)
- [ ] `src/pages/Admin/Acceso/PermisosPage.tsx`
    - Desactivar permiso (línea 122)
- [ ] `src/components/admin/VisibilityModal.tsx`
    - Quitar permiso/restricción (línea 112)

### 🔧 Sistema y Core
- [ ] `src/pwa/sw-register.ts`
    - Actualización de versión PWA (línea 6)

---

## ✅ Checklist de Implementación

Antes de comenzar los cambios, seguiremos este checklist para asegurar la consistencia:

1. [ ] **Crear Utilidad de Confirmación**: Implementar un helper en `src/utils/alerts.ts` que pre-configure los estilos de Clarity (colores, fuentes, modo oscuro).
2. [ ] **Estandarizar Iconos**:
    - 🗑️ **warning**: Para eliminaciones y acciones irreversibles.
    - 🔒 **info**: Para acciones de seguridad o aprobación.
    - ❓ **question**: Para decisiones simples del usuario.
3. [ ] **Revisión de Estilo**: Asegurar que los botones de SweetAlert2 usen las clases de Tailwind del proyecto (o colores similares a la paleta de Clarity).
4. [ ] **Manejo de Promesas**: `window.confirm` es síncrono. `Swal.fire` es asíncrono. Se debe asegurar el uso de `async/await` en todos los lugares donde se reemplace.
5. [ ] **Paso a Paso**: Migrar primero las páginas críticas (`PlanTrabajoPage`) y verificar funcionamiento.

---

## 🎨 Diseño Visual Propuesto

Para mantener el look premium de Clarity:
- **Fondo**: `#FFFFFF` o `#FAFAFA`
- **Títulos**: Color Slate-800
- **Botón Confirmar**: Color Rose-600 o Indigo-600
- **Botón Cancelar**: Color Gray-400
- **Animaciones**: Backdrop difuminado (glassmorphism opcional).
