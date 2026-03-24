# Análisis del Estado Actual: Seguridad y Accesos 🛡️

**Ubicación:** `d:\planificacion\v2sistema\seguridad\03_Estructura_Actual_Seguridad.md`
**Fecha:** 2026-02-28
**Autor:** Antigravity (IA Coding Assistant)

Este documento detalla técnicamente cómo funciona la seguridad en el sistema actual ("As-Is"), identificando sus fortalezas y sus puntos de falla.

---

## 1. Flujo de Autenticación (JWT)
El sistema utiliza **JSON Web Tokens** para identificar a los usuarios.

- **Estrategia:** El backend (`JwtStrategy`) decodifica el token en cada petición.
- **Objeto Usuario en Código:** Al estar logueado, cada petición (`req.user`) inyecta:
  * `userId`: ID numérico del usuario en `p_Usuarios`.
  * `carnet`: Carnet de empleado (clave para jerarquías).
  * `rolGlobal`: String con el nombre del rol (Ej: "Admin", "Empleado").
  * `pais`: Localización (Ej: "NI").

---

## 2. Gestión de Roles (Estado Actual)
Actualmente, el sistema ha dado un paso importante al centralizar los nombres de los roles en un solo archivo: `src/common/role-utils.ts`.

### Categorización de Roles:
- **Administradores:** `['Admin', 'Administrador', 'SuperAdmin']`.
- **Líderes:** `['Gerente', 'Director', 'Jefe', 'Coordinador', 'Lider']`.
- **Otros:** Roles de nivel inferior o no privilegiados (Ej: "Empleado").

### Mecanismo de Verificación:
Se usan funciones booleanas como `isAdminRole(rol)` o `isLeaderRole(rol)` dispersas por los Servicios (`.service.ts`) para bifurcar la lógica.

---

## 3. Control de Acceso y Propiedad (Ownership)
El sistema no solo revisa el "Rol", sino también quién es el "Dueño" del dato.

### Ejemplo: Gestión de Proyectos (`proyecto.service.ts`)
Existe una función llamada `assertCanManageProject(idProyecto, idUsuario)` que aplica la siguiente jerarquía de permisos:
1. **Paso Directo:** Si el usuario es **Admin**, puede hacer todo.
2. **Propiedad Creadora:** Si `idCreador === idUsuario`, el usuario puede editar/borrar.
3. **Responsabilidad:** Si el usuario es el `responsableCarnet` asignado al proyecto, puede gestionar.
4. **Bloqueo:** Si no se cumple nada de lo anterior, dispara un error `403 Forbidden`.

### Ejemplo: Gestión de Tareas (`tasks.service.ts`)
Sigue un patrón similar pero más complejo debido a la **Jerarquía**:
- Los jefes pueden "ver" mediante el SP `sp_Visibilidad_ObtenerMiEquipo`.
- Sin embargo, la **edición destructiva** (borrar o cambiar datos core) suele estar bloqueada si no eres el ejecutor o el creador, a menos que seas Admin.

---

## 4. Debilidades Identificadas (Puntos Críticos)

| Debilidad | Impacto | Descripción |
| :--- | :--- | :--- |
| **Strings Harcodeados** | Medio-Alto | Si se cambia el nombre de un rol en la base de datos (ej: de "Gerente" a "Management"), el sistema de seguridad podría romperse en cascada. |
| **Lógica Dispersa** | Medio | Cada servicio implementa su propia función "assert...". Un error en una de ellas deja un hueco de seguridad en ese módulo específico. |
| **Rol Global Limitante** | Alto | No es posible tener un usuario que sea "Empleado" pero que tenga permiso de "Admin" *únicamente* para generar reportes. Es todo o nada. |
| **Falta de Logs de Denegación** | Bajo | Cuando un usuario intenta hacer algo prohibido, solo recibe un 403, pero no siempre registramos ese intento en una bitácora de auditoría. |

---

## 5. Inventario de Archivos de Seguridad Core

1. `src/auth/jwt.strategy.ts`: Define qué datos del usuario están disponibles en cada API.
2. `src/common/role-utils.ts`: Único lugar donde se definen quiénes son Admins/Líderes.
3. `src/admin/admin.guard.ts`: Guard para bloquear rutas completas a no-admins.
4. `src/auth/roles.guard.ts`: Guard dinámico basado en el decorador `@Roles()`.

---

## 6. Conclusión del Estado Actual
El sistema tiene una base **sólida y funcional**, pero **rígida**. Es ideal para una organización con jerarquías piramidales clásicas, pero será difícil de escalar si se introducen roles cruzados o permisos granulares por módulo. 

> [!IMPORTANT]
> La "Llave Maestra" actualmente es el valor del campo `rolGlobal`. El plan de mejora debe enfocarse en migrar esta responsabilidad a una tabla de **Permisos** sin perder la simplicidad actual.
