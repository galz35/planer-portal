# Arquitectura: Módulo de Seguridad Granular (RBAC) 🛡️

**Ubicación de este documento:** `d:\planificacion\v2sistema\seguridad\`
**Fecha:** 2026-02-28

Este documento marca el inicio de la implementación del Módulo de Permisos Granulares. Pasaremos de revisar textos estáticos (`"Admin"`, `"Empleado"`) a validar **Permisos Específicos** que viven en un `JSON` dentro de la tabla `p_Roles` de SQL Server.

---

## 🏗️ 1. Modelo de Datos (SQL Server)

Utilizaremos la tabla existente `p_Roles`, pero reactivaremos y estructuraremos su columna `reglas`.

### Estructura de `p_Roles`:
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `idRol` | INT (PK) | Identificador numérico del rol. |
| `nombre` | NVARCHAR | Nombre descriptivo (ej. "Coordinador de Calidad"). |
| `reglas` | NVARCHAR(MAX) | **Array JSON** estricto con la lista de permisos permitidos para el rol. |
| `esSistema`| BIT | Determina si el rol es inmutable (Ej. "Admin" puro). |

**Ejemplo de dato en columna `reglas`:**
```json
[
  "proyectos:ver_propios",
  "proyectos:crear",
  "proyectos:editar_cualquiera",
  "reportes:ver_dashboard_gerencia",
  "configuracion:acceso_total"
]
```

---

## 🚦 2. Diccionario Central de Permisos (NestJS / TypeScript)

En lugar de textos sueltos, crearemos un `Enum` universal (`Permission.enum.ts`) que tipará fuertemente cada acción permitida.

```typescript
export enum AppPermission {
  // --- Módulo Proyectos ---
  PROYECTOS_VER_TODOS = 'proyectos:ver_todos',
  PROYECTOS_CREAR = 'proyectos:crear',
  PROYECTOS_EDITAR = 'proyectos:editar',
  PROYECTOS_ELIMINAR = 'proyectos:eliminar',

  // --- Módulo Foco/Agenda ---
  FOCO_VER = 'foco:ver',
  FOCO_EDITAR = 'foco:editar',

  // --- Módulo Reportes ---
  REPORTES_VER_GERENCIA = 'reportes:gerencia',
  REPORTES_EXPORTAR = 'reportes:exportar',

  // --- Seguridad & Settings ---
  ADMIN_USUARIOS_GESTIONAR = 'admin:usuarios',
  ADMIN_ROLES_GESTIONAR = 'admin:roles'
}
```

---

## 🛡️ 3. Backend: Implementación de Guards (NestJS)

Reemplazaremos el estricto e ineficiente `AdminGuard` o `@Roles('Admin')` por nuestro nuevo y poderoso `@RequirePermissions(...)`.

### Ciclo de vida de la Seguridad:
1. **Login (`auth.service.ts`):** Al autenticar al usuario, recuperamos de la BD `p_Roles.reglas`.
2. **Generación JWT:** Se incrusta el array de `permissions: [...]` dentro del payload del token (o se cachea en Redis si es muy pesado para prevenir Tokens gigantes).
3. **Petición API:**
   - El Decorador `@RequirePermissions(AppPermission.PROYECTOS_ELIMINAR)` se asienta en el endpoint.
   - El Guard `PermissionsGuard` extrae `req.user.permissions`.
   - Si `req.user.permissions.includes(...)` otorga un estatus HTTP 200 (OK), de lo contrario bloquea con HTTP 403 (Forbidden).

---

## ⚛️ 4. Frontend: Interfaces Predictivas (React)

En lugar de condicionales espagueti en React (`if (user.rol === 'Admin' || user.rol === 'Lider')`), pasaremos a usar un componente contenedor o hook:

```tsx
import { Can } from '@/auth/components/Can';

<Can permission="proyectos:eliminar">
   <Button color="error" onClick={handleDeleteTarget}>Eliminar Proyecto</Button>
</Can>
```
*Si el empleado en su Rol Híbrido no tiene el derecho exacto `proyectos:eliminar`, el botón jamás se reenderizará, ocultando mágicamente funciones prohibidas y reduciendo fricción visual.*

---

## 📝 Plan de Acción de Hoy: FASE 1 (Backend Core)
1. **(API)** Generar la Carpeta Core: `v2backend/src/auth/permissions`.
2. **(Code)** Crear el Decorador `@RequirePermissions` y el `PermissionsGuard`.
3. **(Login)** Interceptar `AuthService.login()` para adjuntar la constante dinámica de permisos extraída del `idRol` de BD.
4. **(Test)** Aplicar el Guard a 2 rutas de proyectos (Ej. Borrar Proyecto) y testearlo automáticamente antes de inyectarlo en otros 50 endpoints.
