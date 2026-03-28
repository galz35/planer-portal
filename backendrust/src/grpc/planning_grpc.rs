use tonic::{Request, Response, Status};

use super::pb::planning::planning_service_server::PlanningService;
use super::pb::planning::*;
use crate::db::Pool;

/// Implementación gRPC del PlanningService.
pub struct PlanningServiceImpl {
    pub pool: Pool,
}

#[tonic::async_trait]
impl PlanningService for PlanningServiceImpl {
    async fn get_workload(
        &self,
        request: Request<CarnetRequest>,
    ) -> Result<Response<WorkloadResponse>, Status> {
        let carnet = request.into_inner().carnet;

        let mut client = self
            .pool
            .get()
            .await
            .map_err(|e| Status::internal(format!("DB error: {}", e)))?;

        let stream = client
            .query(
                "SELECT u.carnet, u.nombre as colaborador, \
                 (SELECT COUNT(*) FROM p_Tareas t \
                  WHERE t.responsableCarnet = u.carnet AND t.estado NOT IN ('Hecha','Completada','Descartada','Eliminada')) \
                 as tareasActivas \
                 FROM p_Usuarios u WHERE u.jefeCarnet = @P1 AND u.activo = 1 ORDER BY u.nombre",
                &[&carnet],
            )
            .await
            .map_err(|e| Status::internal(format!("Query error: {}", e)))?;

        let rows = stream
            .into_first_result()
            .await
            .map_err(|e| Status::internal(format!("Result error: {}", e)))?;

        let items: Vec<WorkloadItem> = rows
            .into_iter()
            .map(|r| WorkloadItem {
                carnet: r
                    .try_get::<&str, _>("carnet")
                    .ok()
                    .flatten()
                    .unwrap_or("")
                    .to_string(),
                colaborador: r
                    .try_get::<&str, _>("colaborador")
                    .ok()
                    .flatten()
                    .unwrap_or("")
                    .to_string(),
                tareas_activas: r
                    .try_get::<i32, _>("tareasActivas")
                    .ok()
                    .flatten()
                    .unwrap_or(0),
            })
            .collect();

        Ok(Response::new(WorkloadResponse {
            success: true,
            items,
        }))
    }

    async fn get_pending(
        &self,
        request: Request<CarnetRequest>,
    ) -> Result<Response<PendingResponse>, Status> {
        let _carnet = request.into_inner().carnet;

        let mut client = self
            .pool
            .get()
            .await
            .map_err(|e| Status::internal(format!("DB error: {}", e)))?;

        let stream = client
            .query(
                "SELECT sc.idSolicitud, sc.idTarea, sc.estado, sc.motivo, sc.campo, sc.valorNuevo, \
                 u.nombre as solicitante \
                 FROM p_SolicitudesCambio sc \
                 LEFT JOIN p_Usuarios u ON sc.idUsuarioSolicitante = u.idUsuario \
                 WHERE sc.estado = 'Pendiente'",
                &[],
            )
            .await
            .map_err(|e| Status::internal(format!("Query error: {}", e)))?;

        let rows = stream
            .into_first_result()
            .await
            .map_err(|e| Status::internal(format!("Result error: {}", e)))?;

        let items: Vec<PendingItem> = rows
            .into_iter()
            .map(|r| PendingItem {
                id_solicitud: r
                    .try_get::<i32, _>("idSolicitud")
                    .ok()
                    .flatten()
                    .unwrap_or(0),
                id_tarea: r.try_get::<i32, _>("idTarea").ok().flatten().unwrap_or(0),
                estado: r
                    .try_get::<&str, _>("estado")
                    .ok()
                    .flatten()
                    .unwrap_or("")
                    .to_string(),
                motivo: r
                    .try_get::<&str, _>("motivo")
                    .ok()
                    .flatten()
                    .unwrap_or("")
                    .to_string(),
                campo: r
                    .try_get::<&str, _>("campo")
                    .ok()
                    .flatten()
                    .unwrap_or("")
                    .to_string(),
                valor_nuevo: r
                    .try_get::<&str, _>("valorNuevo")
                    .ok()
                    .flatten()
                    .unwrap_or("")
                    .to_string(),
                solicitante: r
                    .try_get::<&str, _>("solicitante")
                    .ok()
                    .flatten()
                    .unwrap_or("")
                    .to_string(),
            })
            .collect();

        Ok(Response::new(PendingResponse {
            success: true,
            items,
        }))
    }

    async fn get_approvals(
        &self,
        _request: Request<CarnetRequest>,
    ) -> Result<Response<ApprovalsResponse>, Status> {
        Ok(Response::new(ApprovalsResponse {
            success: true,
            items: vec![],
        }))
    }

    async fn get_team(
        &self,
        request: Request<CarnetRequest>,
    ) -> Result<Response<TeamResponse>, Status> {
        let carnet = request.into_inner().carnet;

        let mut client = self
            .pool
            .get()
            .await
            .map_err(|e| Status::internal(format!("DB error: {}", e)))?;

        let stream = client
            .query(
                "SELECT idUsuario, nombre, carnet, cargo, correo \
                 FROM p_Usuarios WHERE jefeCarnet = @P1 AND activo = 1 ORDER BY nombre",
                &[&carnet],
            )
            .await
            .map_err(|e| Status::internal(format!("Query error: {}", e)))?;

        let rows = stream
            .into_first_result()
            .await
            .map_err(|e| Status::internal(format!("Result error: {}", e)))?;

        let items: Vec<TeamMember> = rows
            .into_iter()
            .map(|r| TeamMember {
                id_usuario: r.try_get::<i32, _>("idUsuario").ok().flatten().unwrap_or(0),
                nombre: r
                    .try_get::<&str, _>("nombre")
                    .ok()
                    .flatten()
                    .unwrap_or("")
                    .to_string(),
                carnet: r
                    .try_get::<&str, _>("carnet")
                    .ok()
                    .flatten()
                    .unwrap_or("")
                    .to_string(),
                cargo: r
                    .try_get::<&str, _>("cargo")
                    .ok()
                    .flatten()
                    .unwrap_or("")
                    .to_string(),
                correo: r
                    .try_get::<&str, _>("correo")
                    .ok()
                    .flatten()
                    .unwrap_or("")
                    .to_string(),
            })
            .collect();

        Ok(Response::new(TeamResponse {
            success: true,
            items,
        }))
    }

    async fn get_my_projects(
        &self,
        request: Request<CarnetRequest>,
    ) -> Result<Response<MyProjectsResponse>, Status> {
        let carnet = request.into_inner().carnet;

        let mut client = self
            .pool
            .get()
            .await
            .map_err(|e| Status::internal(format!("DB error: {}", e)))?;

        let stream = client
            .query("EXEC sp_ObtenerProyectos @P1", &[&carnet])
            .await
            .map_err(|e| Status::internal(format!("Query error: {}", e)))?;

        let rows = stream
            .into_first_result()
            .await
            .map_err(|e| Status::internal(format!("Result error: {}", e)))?;

        let items: Vec<ProjectSummary> = rows
            .into_iter()
            .map(|r| {
                let total = r
                    .try_get::<i32, _>("totalTareas")
                    .ok()
                    .flatten()
                    .unwrap_or(0);
                let completadas = r
                    .try_get::<i32, _>("tareasCompletadas")
                    .ok()
                    .flatten()
                    .unwrap_or(0);
                let progreso = if total > 0 {
                    (completadas as f64 / total as f64) * 100.0
                } else {
                    0.0
                };

                ProjectSummary {
                    id_proyecto: r
                        .try_get::<i32, _>("idProyecto")
                        .ok()
                        .flatten()
                        .unwrap_or(0),
                    nombre: r
                        .try_get::<&str, _>("nombre")
                        .ok()
                        .flatten()
                        .unwrap_or("")
                        .to_string(),
                    estado: r
                        .try_get::<&str, _>("estado")
                        .ok()
                        .flatten()
                        .unwrap_or("Activo")
                        .to_string(),
                    total_tareas: total,
                    tareas_completadas: completadas,
                    progreso,
                }
            })
            .collect();

        Ok(Response::new(MyProjectsResponse {
            success: true,
            items,
        }))
    }

    async fn get_stats(
        &self,
        _request: Request<CarnetRequest>,
    ) -> Result<Response<StatsResponse>, Status> {
        let mut client = self
            .pool
            .get()
            .await
            .map_err(|e| Status::internal(format!("DB error: {}", e)))?;

        let stream = client
            .query(
                "SELECT \
                 (SELECT COUNT(*) FROM p_Usuarios WHERE activo = 1) as usuarios, \
                 (SELECT COUNT(*) FROM p_Proyectos) as proyectos, \
                 (SELECT COUNT(*) FROM p_Tareas WHERE estado NOT IN ('Eliminada','Descartada')) as tareas, \
                 (SELECT COUNT(*) FROM p_Roles) as roles",
                &[],
            )
            .await
            .map_err(|e| Status::internal(format!("Query error: {}", e)))?;

        let rows = stream
            .into_first_result()
            .await
            .map_err(|e| Status::internal(format!("Result error: {}", e)))?;

        if let Some(r) = rows.into_iter().next() {
            Ok(Response::new(StatsResponse {
                success: true,
                usuarios: r.try_get::<i32, _>("usuarios").ok().flatten().unwrap_or(0),
                proyectos: r.try_get::<i32, _>("proyectos").ok().flatten().unwrap_or(0),
                tareas: r.try_get::<i32, _>("tareas").ok().flatten().unwrap_or(0),
                roles: r.try_get::<i32, _>("roles").ok().flatten().unwrap_or(0),
            }))
        } else {
            Ok(Response::new(StatsResponse {
                success: true,
                usuarios: 0,
                proyectos: 0,
                tareas: 0,
                roles: 0,
            }))
        }
    }
}
