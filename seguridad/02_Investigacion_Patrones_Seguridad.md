# Investigación: Patrones de Seguridad en el Mundo Real 🌍

**Ubicación:** `d:\planificacion\v2sistema\seguridad\02_Investigacion_Patrones_Seguridad.md`
**Fecha:** 2026-02-28

Para resolver tu duda de "¿cómo lo hacen otros?" y evitar complicar el sistema innecesariamente, aquí presento un resumen de las mejores prácticas de la industria y cómo se ajustan a nuestro proyecto.

---

## 🔍 1. Los 3 Patrones Estándar

| Patrón | ¿Qué es? | ¿Cuándo usarlo? | Complejidad |
| :--- | :--- | :--- | :--- |
| **RBAC** (Role-Based) | Basado en "quién eres" (Admin, Editor, Usuario). | Cuando los roles son fijos y claros. | Baja |
| **ACL** (Access List) | Basado en "esta persona tiene acceso a esta cosa". | Para permisos muy específicos (ej. Google Docs compartir un archivo). | Mediana |
| **ABAC** (Attribute-Based) | Basado en condiciones (ej: "Solo si es lunes y el proyecto es de mi área"). | Para sistemas gubernamentales o financieros complejos. | ALTA |

---

## 🛠️ 2. ¿Cómo lo hacen los grandes (Jira, Trello, Asana)?

Sistemas similares a Clarity usan un **Modelo Híbrido (RBAC + Propiedad)**. Es el enfoque más eficiente y menos complicado:

1.  **Roles base (RBAC):**
    *   **Admin:** Tiene el "God Mode". No se le aplican restricciones de propiedad.
    *   **Usuario Estándar:** Tiene permisos limitados por su relación con el objeto.
2.  **Verificación de Propiedad (Ownership Check):**
    *   Un usuario común solo puede **Editar/Eliminar** si se cumple: `usuarioId === objeto.creadorId` OR `usuarioId === objeto.responsableId`.
3.  **Jerarquía (Lo que ya tenemos):**
    *   Si yo soy jefe de X, heredo el permiso de "ver" lo de X, pero no necesariamente de "editar" (a menos que el sistema así lo defina).

---

## 🎯 3. Ruta Simplificada para Clarity v2 (Sin complicaciones)

No necesitas un módulo de seguridad espacial. Necesitas una lógica centralizada de **"¿Puedo tocar esto?"**.

### A. La Lógica "Universal" (En el Backend)
En lugar de repetir el código en cada API, se usa un **Interceptador o Helper** único:

```javascript
function canContextUserManage(resource, user) {
   if (user.rol === 'Admin') return true; // El Admin es libre
   if (resource.idCreador === user.id) return true; // Si yo lo creé, es mío
   if (resource.idResponsable === user.id) return true; // Si soy el jefe del proyecto, puedo
   return false; // De lo contrario, bloqueado.
}
```

### B. El "Guard" de NestJS
NestJS permite aplicar esto automáticamente. Si intentas un `PATCH /proyectos/78`, el sistema:
1.  Busca el proyecto 78.
2.  Llama a la lógica de arriba.
3.  Si es `false`, devuelve un error **403 Prohibido** antes de que toque la base de datos.

---

## 💡 4. Conclusión: ¿Lo estamos complicando?

**No, si lo mantenemos así:**
- Mantén el `Admin` con poder total (esto simplifica mucho el código).
- Para el resto: la regla de **"Si no es tuyo y no eres Admin, no lo tocas"**.
- La única "complejidad" necesaria es la **Visibilidad**, que ya resolvimos con el SP de jerarquía.

### Mi recomendación:
No crees una matriz de 500 permisos. Crea **3 niveles de poder**:
1. `FULL_CONTROL` (Admins)
2. `OWNERSHIP_ONLY` (Mayoría de usuarios: solo tocan lo que crean o se les asigna)
3. `READ_ONLY_HIERARCHY` (Ver lo de subordinados pero sin permiso de edición destructiva).

> [!TIP]
> Esta ruta es la que usan el 90% de las Startups exitosas porque es fácil de mantener y escalar.
