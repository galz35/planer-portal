# Auditoria runtime de stored procedures `_rust`

Fecha: 2026-03-28

Objetivo:
- detectar procedures `_rust` usados por handlers que no existian realmente en SQL Server.

Resultado inicial:
- procedures `_rust` referenciados por handlers: `127`
- existentes en SQL Server antes de la correccion: `91`
- faltantes antes de la correccion: `36`

Correcciones aplicadas en esta tanda:
- `sp_Usuarios_ObtenerDetallesPorId_rust`
- `sp_Planning_UpsertPlan_rust`
- `sp_Plan_Cerrar_rust`
- `sp_SolicitudCambio_Resolver_rust`
- `sp_Planning_StatsDashboard_rust`
- `sp_Planning_StatsCompliance_rust`

Resultado despues de la correccion:
- existentes en SQL Server: `97`
- faltantes restantes: `30`

Faltantes restantes al 2026-03-28:
- `sp_Admin_Usuarios_Importar_rust`
- `sp_DelegacionVisibilidad_Eliminar_rust`
- `sp_Instancia_Upsert_rust`
- `sp_Marcaje_Admin_GestionGeocerca_rust`
- `sp_Marcaje_Admin_GestionIp_rust`
- `sp_Marcaje_Admin_ObtenerConfigResumen_rust`
- `sp_Marcaje_Admin_ObtenerDevices_rust`
- `sp_Recurrencia_Crear_rust`
- `sp_Recurrencia_ObtenerPorTarea_rust`
- `sp_Tarea_CreacionMasiva_rust`
- `sp_Tarea_Revalidar_rust`
- `sp_Tarea_UpsertRecordatorio_rust`
- `sp_Tareas_Reasignar_PorCarnet_rust`
- `sp_Visita_ObtenerClientes_rust`
- `sp_Visita_ObtenerListado_rust`
- `sp_Visita_ObtenerMetas_rust`
- `sp_Visita_ObtenerStats_rust`
- `sp_campo_admin_recorridos_rust`
- `sp_campo_recorrido_activo_rust`
- `sp_campo_recorrido_historial_rust`
- `sp_campo_recorrido_puntos_rust`
- `sp_vc_agenda_crear_rust`
- `sp_vc_agenda_eliminar_rust`
- `sp_vc_agenda_reordenar_rust`
- `sp_vc_checkout_rust`
- `sp_vc_cliente_actualizar_rust`
- `sp_vc_cliente_crear_rust`
- `sp_vc_cliente_eliminar_rust`
- `sp_vc_meta_set_rust`
- `sp_vc_usuarios_con_tracking_rust`

Lectura operativa:
- la auditoria confirmo que el riesgo no era teorico; habia endpoints capaces de responder sin que el SP realmente existiera.
- el frente principal de `planning` bajo de forma real con estas 6 correcciones.
- el backlog restante de SPs faltantes ya no esta concentrado en el core principal; ahora se mueve mas hacia `marcaje`, `visita` y `campo`.
