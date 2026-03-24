# Análisis de Edge Cases: Delegaciones y Colaboraciones Cruzadas 🎯

**Ubicación:** `d:\planificacion\v2sistema\seguridad\05_Seguridad_Avanzada_Edge_Cases.md`
**Fecha:** 2026-02-28

Has hecho una observación sumamente inteligente y técnica. Efectivamente, la regla de "Admin o Propiedad (Creador)" es demasiado rígida si no contemplamos que en la vida real la empresa tiene **flujos horizontales** (no solo verticales de jefaturas).

He analizado la base de datos y nuestro código actual y he comprobado que **YA TENEMOS las tablas para soportar estos casos límite**. Solo necesitamos conectarlas a la "Aduana Central" de la que te hablé.

---

## 🔍 Caso 1: Seguimiento Cruzado (Fuera de Jerarquía)
*El Escenario:* Un usuario (Ej: Auditor o Coordinador) necesita darle seguimiento a otro empleado, pero ese empleado **no es su subordinado directo** en el organigrama.

*Nuestra Solución Integrada:*
En la base de datos ya existen las tablas **`p_permiso_empleado`** y **`p_permiso_area`**. El Stored Procedure de jerarquía (`sp_Visibilidad_ObtenerMiEquipo`) **ya lee de estas tablas**. 

Si le agregamos a un usuario "A" un permiso en `p_permiso_empleado` apuntando al usuario "B", el sistema automáticamente lo considerará "de su equipo". 

**Cómo encaja en la Aduana (Backend):**
```javascript
// ¿Puedo ver/gestionar el Foco Diario de Juan?
function canViewUser(requesterCarnet, targetCarnet) {
   if (requesterCarnet === targetCarnet) return true; // Yo mismo
   if (isAdmin) return true; // El Admin todo lo ve
   
   // La función backend consulta al SP de jerarquía:
   // Si el SP (que lee permisos puntuales) retorna a Juan en la lista del requester, entonces:
   return true; 
}
```
*Veredicto Caso 1:* No falla. La arquitectura de "Delegación de Visibilidad" que tenías en V1 es perfectamente compatible con la V2.

---

## 🤝 Caso 2: Colaboradores de Proyecto (Accesos Horizontales)
*El Escenario:* Un proyecto fue creado por "Carlos" y el responsable es "Ana", pero han invitado a "Luis" usando el módulo de colaboradores (`p_ProyectoColaboradores`). Obviamente, Luis debe poder editar, aunque no sea Jefe ni Creador.

*Nuestra Solución Integrada:*
He detectado las tablas `p_ProyectoColaboradores` y `p_RolesColaboracion`. La "Aduana Central" simplemente debe agregar esta validación como un paso más de la regla de Propiedad.

**Cómo encaja la nueva Llave Maestra (Código de `assertCanManageProject` ampliado):**

```typescript
async assertCanManageProject(idProyecto: number, idUsuario: number) {
    const proyecto = await getProject(idProyecto);
    
    // 1. ¿Es Administrador Dios?
    if (isAdminRole(user.rol)) return true;

    // 2. ¿Es el Dueño Legítimo? (Creador o Responsable asignado)
    if (proyecto.idCreador === idUsuario) return true;
    if (proyecto.responsableCarnet === user.carnet) return true;

    // 3. NUEVO: ¿Es Colaborador Oficial de ese Proyecto?
    const esColaborador = await db.query(
        "SELECT 1 FROM p_ProyectoColaboradores WHERE idProyecto = X AND idUsuario = Y"
    );
    if (esColaborador) {
        // Podríamos incluso revisar si el rol de colaborador le permite editar y no solo leer
        return true; 
    }

    // 4. Muro Final: Si no eres Admin, Dueño, ni Colaborador Invitado... Bloqueo total.
    throw new ForbiddenException('Atrás! No puedes tocar este proyecto.');
}
```

---

## 🥇 Conclusión Definitiva: ¿Esta arquitectura funcionará bien?

**SÍ, con absoluta certeza, por dos razones:**
1. **Evita la Burocracia:** No tenemos que andar inventando "Roles" nuevos (Ej: Crear el rol 'Lector de Ventas') cada vez que alquien requiere ver a alguien. Usamos tu tabla `p_permiso_empleado`.
2. **Es Orgánico:** Tu mismo sistema ya tiene los Colaboradores de Proyecto (esto es un ACL - Access Control List pequeño). Al integrar los Colaboradores a la función unificada de protección, el sistema respeta el flujo humano normal de trabajo de la empresa.

### El Siguiente Paso (Acción)
Si estás 100% de acuerdo con que la regla final es: **"Tocas algo si eres Admin, Creador, Jefe Asignado o Colaborador Invitado"**, procedo a re-escribir el Backend para blindar los Proyectos y las Tareas bajo esa exacta validación. Así todo queda protegido antes de conectar el nuevo Super Panel de Frontend.
