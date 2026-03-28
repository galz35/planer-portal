#![allow(dead_code)]
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::Utc;
use serde::Deserialize;
use std::collections::HashMap;

use crate::state::ApiState;

pub async fn planning_workload(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    query_params: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let carnet = query_params.get("carnet").cloned().unwrap_or_else(|| user.carnet().to_string());

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    // 1. Obtener empleados visibles (mismo motor que NestJS)
    let visible_carnets = match crate::handlers::equipo::get_visible_carnets(&mut client, &carnet).await {
        Ok(v) => v,
        Err(_) => vec![carnet.clone()],
    };

    if visible_carnets.is_empty() {
        return (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
            "users": [], "tasks": [], "agenda": []
        })))).into_response();
    }

    let csv = visible_carnets.join(",");

    // 2. Obtener detalles de usuarios y tareas
    let members = crate::handlers::equipo::exec_sp_to_json(&mut client, "EXEC sp_Usuarios_ObtenerDetallesPorCarnets_rust @P1", &[&csv.as_str()]).await;
    let all_tasks = crate::handlers::equipo::exec_sp_to_json(&mut client, "EXEC sp_Tareas_ObtenerMultiplesUsuarios_rust @P1", &[&csv.as_str()]).await;

    // 3. Obtener Agenda (Checkins)
    let start_date = query_params.get("startDate").cloned().unwrap_or_else(|| chrono::Utc::now().format("%Y-%m-%d").to_string());
    let end_date = query_params.get("endDate").cloned().unwrap_or_else(|| chrono::Utc::now().format("%Y-%m-%d").to_string());
    
    // Convert dates for SQL
    let start_sql = format!("{} 00:00:00", start_date);
    let end_sql = format!("{} 23:59:59", end_date);

    // Zero Inline SQL: Usar sp_Planning_ObtenerAgenda
    let agenda = crate::handlers::equipo::exec_sp_to_json(
        &mut client, 
        "EXEC sp_Planning_ObtenerAgenda_rust @P1, @P2, @P3", 
        &[&csv.as_str(), &start_sql.as_str(), &end_sql.as_str()]
    ).await;

    // 4. Formatear usuarios como lo hace NestJS TasksService.getWorkload
    let users: Vec<serde_json::Value> = members.iter().map(|u| {
        let u_carnet = u.get("carnet").and_then(|v| v.as_str()).unwrap_or("");
        
        let active_count = all_tasks.iter().filter(|t| {
            let t_carnet = t.get("usuarioCarnet").and_then(|v| v.as_str()).unwrap_or("");
            let t_estado = t.get("estado").and_then(|v| v.as_str()).unwrap_or("");
            t_carnet == u_carnet && ["Pendiente", "EnCurso", "Bloqueada", "Bloqueo"].contains(&t_estado)
        }).count();

        let completed_count = all_tasks.iter().filter(|t| {
            let t_carnet = t.get("usuarioCarnet").and_then(|v| v.as_str()).unwrap_or("");
            let t_estado = t.get("estado").and_then(|v| v.as_str()).unwrap_or("");
            t_carnet == u_carnet && t_estado == "Hecha"
        }).count();

        serde_json::json!({
            "idUsuario": u.get("idUsuario"),
            "nombre": u.get("nombre").or(u.get("nombreCompleto")),
            "correo": u.get("correo"),
            "carnet": u_carnet,
            "rol": { "nombre": u.get("subgerencia").or(u.get("gerencia")).or(u.get("cargo")).unwrap_or(&serde_json::json!("General")) },
            "tareasActivas": active_count,
            "tareasCompletadas": completed_count,
        })
    }).collect();

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "users": users,
        "tasks": all_tasks,
        "agenda": agenda
    })))).into_response()
}

pub async fn planning_pending(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    let items = crate::handlers::equipo::exec_sp_to_json(&mut client, "EXEC sp_Planning_ObtenerSolicitudes_rust @tipo='PENDIENTES'", &[]).await;
    (StatusCode::OK, Json(crate::models::ApiResponse::success(items))).into_response()
}

pub async fn planning_approvals(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    let items = crate::handlers::equipo::exec_sp_to_json(&mut client, "EXEC sp_Planning_ObtenerSolicitudes_rust @tipo='APPROVALS'", &[]).await;
    (StatusCode::OK, Json(crate::models::ApiResponse::success(items))).into_response()
}

pub async fn planning_check_permission(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<PlanningPermissionRequest>,
) -> impl IntoResponse {
    let id_tarea = body.id_tarea.unwrap_or(0) as i32;
    let id_usuario_req = body.id_usuario.unwrap_or(0);
    let id_usuario_actual = if id_usuario_req > 0 { id_usuario_req as i32 } else { user.user_id_i32() };
    
    // Si viene action de old frontend (ej "Edit"), asumimos puede_editar logic
    // Frontend Rust envÃ­a solo {idTarea} mayormente y toma sesiÃ³n

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error("DB connect error".to_string(), 500))).into_response(),
    };

    // Zero Inline SQL: Usar sp_Planning_CheckPermission
    let perm_res = crate::handlers::equipo::exec_sp_to_json(
        &mut client, 
        "EXEC sp_Planning_CheckPermission_rust @P1, @P2", 
        &[&id_tarea, &id_usuario_actual]
    ).await;

    let p = perm_res.first().cloned().unwrap_or_default();
    let id_proyecto = p.get("idProyecto").and_then(|v| v.as_i64()).unwrap_or(0);
    let id_creador = p.get("idCreador").and_then(|v| v.as_i64()).unwrap_or(0);
    let proy_tipo = p.get("proyectoTipo").and_then(|v| v.as_str()).unwrap_or("General");
    let req_aprob = p.get("requiereAprobacion").and_then(|v| v.as_bool()).unwrap_or(false);
    let is_assigned = p.get("isAssigned").and_then(|v| v.as_bool()).unwrap_or(false);

    if id_proyecto == 0 {
        return (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
            "puedeEditar": true,
            "requiereAprobacion": false,
            "tipoProyecto": "Personal",
        })))).into_response();
    }

    if proy_tipo == "Estrategico" || req_aprob {
        let is_admin = user.rol().to_uppercase() == "ADMIN";
        let is_creador_bool = id_creador == id_usuario_actual as i64;

        if is_admin || is_creador_bool || is_assigned {
            return (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
                "puedeEditar": true,
                "requiereAprobacion": false,
                "tipoProyecto": proy_tipo,
            })))).into_response();
        }

        // Permitimos editar pero requiere aprobaciÃ³n
        return (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
            "puedeEditar": true,
            "requiereAprobacion": true,
            "tipoProyecto": proy_tipo,
        })))).into_response();
    }

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "puedeEditar": true,
        "requiereAprobacion": false,
        "tipoProyecto": proy_tipo,
    })))).into_response()
}

pub async fn planning_request_change(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<PlanningRequestChangeRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    let id_usuario = user.user_id_i32();
    let id_tarea = body.id_tarea as i32;
    let campo = body.campo.unwrap_or_default();
    let motivo = body.motivo;

    // Obtener valor anterior para auditorÃ­a (Paridad con Nest.js)
    let mut valor_anterior = String::new();
    if let Ok(stream) = client.query("SELECT * FROM p_Tareas WHERE idTarea = @P1", &[&id_tarea]).await {
        if let Ok(rows) = stream.into_first_result().await {
            if let Some(r) = rows.into_iter().next() {
                // Buscamos el campo dinÃ¡micamente en el row
                // Nota: Nest.js mapea titulo -> nombre, etc.
                let campo_db = match campo.as_str() {
                    "titulo" => "nombre",
                    "progreso" => "porcentaje",
                    other => other,
                };
                
                // Intentamos obtener el valor como string o nÃºmero
                if let Some(v_str) = r.try_get::<&str, _>(campo_db).ok().flatten() {
                    valor_anterior = v_str.to_string();
                } else if let Some(v_int) = r.try_get::<i32, _>(campo_db).ok().flatten() {
                    valor_anterior = v_int.to_string();
                } else if let Some(v_date) = r.try_get::<chrono::NaiveDateTime, _>(campo_db).ok().flatten() {
                    valor_anterior = v_date.format("%Y-%m-%d").to_string();
                }
            }
        }
    }

    let valor_nuevo_str = match body.valor_nuevo {
        Some(serde_json::Value::String(s)) => s,
        Some(other) => other.to_string(),
        None => "".to_string(),
    };

    let query = r#"
        INSERT INTO p_SolicitudesCambio (idTarea, idUsuarioSolicitante, campo, valorAnterior, valorNuevo, motivo, estado, fechaSolicitud)
        OUTPUT INSERTED.idSolicitud
        VALUES (@P1, @P2, @P3, @P4, @P5, @P6, 'Pendiente', GETDATE())
    "#;

    let res = client.query(query, &[&id_tarea, &id_usuario, &campo, &valor_anterior, &valor_nuevo_str, &motivo]).await;
    
    let mut _new_id = 0;
    if let Ok(stream) = res {
        if let Ok(rows) = stream.into_first_result().await {
            if let Some(r) = rows.into_iter().next() {
                _new_id = r.try_get::<i32, _>("idSolicitud").ok().flatten().unwrap_or(0);
            }
        }
    }

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "message": "Solicitud registrada correctamente",
        "requiresApproval": true
    })))).into_response()
}

pub async fn planning_resolve(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<PlanningResolveRequest>
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    let id_solicitud = body.id_solicitud.unwrap_or(0) as i32;
    if id_solicitud == 0 {
        return (StatusCode::BAD_REQUEST, Json(crate::models::ApiResponse::error("id_solicitud mandatorio".to_string(), 400))).into_response();
    }

    let estado = match body.accion.as_str() {
        "Aprobar" => "Aprobado",
        "Rechazar" => "Rechazado",
        _ => return (StatusCode::BAD_REQUEST, Json(crate::models::ApiResponse::error("AcciÃ³n invÃ¡lida".to_string(), 400))).into_response(),
    };
    
    let comentario = body.comentario.unwrap_or_default();
    let id_usuario = user.user_id_i32();

    // 1. Obtener detalles de la solicitud si se aprueba
    let mut sol_info = None;
    if estado == "Aprobado" {
        if let Ok(st) = client.query("SELECT idTarea, campo, valorNuevo FROM p_SolicitudesCambio WHERE idSolicitud = @P1", &[&id_solicitud]).await {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.into_iter().next() {
                    sol_info = Some((
                        r.try_get::<i32, _>("idTarea").ok().flatten().unwrap_or(0),
                        r.try_get::<&str, _>("campo").ok().flatten().unwrap_or("").to_string(),
                        r.try_get::<&str, _>("valorNuevo").ok().flatten().unwrap_or("").to_string(),
                    ));
                }
            }
        }
    }

    // 2. Actualizar solicitud
    let query_sol = r#"
        UPDATE p_SolicitudesCambio 
        SET estado = @P1, 
            idUsuarioResolutor = @P2, 
            fechaResolucion = GETDATE(),
            comentarioResolucion = @P3
        WHERE idSolicitud = @P4
    "#;

    if let Err(e) = client.execute(query_sol, &[&estado, &id_usuario, &comentario, &id_solicitud]).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response();
    }

    // 3. Aplicar cambio a la tarea si fue aprobada
    if let Some((id_tarea, campo, valor)) = sol_info {
        if id_tarea > 0 && !campo.is_empty() {
             // SanitizaciÃ³n bÃ¡sica de campo para evitar SQL Injection aunque venga de DB
             let allowed_fields = ["titulo", "descripcion", "fechaObjetivo", "prioridad", "idEstado", "avance", "estado"];
             if allowed_fields.contains(&campo.as_str()) {
                 let field_final = if campo == "idEstado" { "estado" } else { &campo };
                 let sql_task = format!("UPDATE p_Tareas SET {} = @P1, fechaActualizacion = GETDATE() WHERE idTarea = @P2", field_final);
                 let _ = client.execute(sql_task.as_str(), &[&valor, &id_tarea]).await;
                 
                 // Recalcular jerarquÃ­a si es cambio de estado
                 if campo == "idEstado" || campo == "estado" {
                     let _ = client.execute("EXEC sp_Tarea_RecalcularJerarquia_rust @P1", &[&id_tarea]).await;
                 }
             }
        }
    }

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "idSolicitud": id_solicitud,
        "message": format!("Solicitud {} correctamente", estado)
    })))).into_response()
}

pub async fn planning_approval_resolve(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Path(id_solicitud): Path<i32>,
    Json(body): Json<PlanningResolveRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    let estado = match body.accion.as_str() {
        "Aprobar" => "Aprobado",
        "Rechazar" => "Rechazado",
        _ => return (StatusCode::BAD_REQUEST, Json(crate::models::ApiResponse::error("AcciÃ³n invÃ¡lida".to_string(), 400))).into_response(),
    };
    
    let comentario = body.comentario.unwrap_or_default();
    let id_usuario = user.user_id_i32();

    // 1. Obtener detalles de la solicitud si se aprueba
    let mut sol_info = None;
    if estado == "Aprobado" {
        if let Ok(st) = client.query("SELECT idTarea, campo, valorNuevo FROM p_SolicitudesCambio WHERE idSolicitud = @P1", &[&id_solicitud]).await {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.into_iter().next() {
                    sol_info = Some((
                        r.try_get::<i32, _>("idTarea").ok().flatten().unwrap_or(0),
                        r.try_get::<&str, _>("campo").ok().flatten().unwrap_or("").to_string(),
                        r.try_get::<&str, _>("valorNuevo").ok().flatten().unwrap_or("").to_string(),
                    ));
                }
            }
        }
    }

    // 2. Actualizar solicitud
    let query_sol = r#"
        UPDATE p_SolicitudesCambio 
        SET estado = @P1, 
            idUsuarioResolutor = @P2, 
            fechaResolucion = GETDATE(),
            comentarioResolucion = @P3
        WHERE idSolicitud = @P4
    "#;

    if let Err(e) = client.execute(query_sol, &[&estado, &id_usuario, &comentario, &id_solicitud]).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response();
    }

    // 3. Aplicar cambio a la tarea si fue aprobada
    if let Some((id_tarea, campo, valor)) = sol_info {
        if id_tarea > 0 && !campo.is_empty() {
             let allowed_fields = ["titulo", "descripcion", "fechaObjetivo", "prioridad", "idEstado", "avance", "estado"];
             if allowed_fields.contains(&campo.as_str()) {
                 let field_final = if campo == "idEstado" { "estado" } else { &campo };
                 let sql_task = format!("UPDATE p_Tareas SET {} = @P1, fechaActualizacion = GETDATE() WHERE idTarea = @P2", field_final);
                 let _ = client.execute(sql_task.as_str(), &[&valor, &id_tarea]).await;
                 
                 // Recalcular
                 if campo == "idEstado" || campo == "estado" {
                    let _ = client.execute("EXEC sp_Tarea_RecalcularJerarquia_rust @P1", &[&id_tarea]).await;
                 }
             }
        }
    }

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "idSolicitud": id_solicitud,
        "message": format!("Solicitud {} correctamente", estado)
    })))).into_response()
}

pub async fn planning_plans(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    query: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let mes = query.get("mes").and_then(|v| v.parse::<i32>().ok()).unwrap_or(0);
    let anio = query.get("anio").and_then(|v| v.parse::<i32>().ok()).unwrap_or(0);
    let id_usuario_obj = query.get("idUsuario").and_then(|v| v.parse::<i32>().ok()).unwrap_or(user.user_id_i32());

    if mes == 0 || anio == 0 {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"message": "mes and anio required"}))).into_response();
    }

    let mut carnet_obj = user.carnet().to_string();
    if id_usuario_obj != user.user_id_i32() {
        // Zero Inline SQL: Usar exec_sp_to_json para obtener detalles del usuario
        let user_data = crate::handlers::equipo::exec_sp_to_json(&mut client, "EXEC sp_Usuarios_ObtenerDetallesPorId_rust @P1", &[&id_usuario_obj]).await;
        if let Some(u) = user_data.first() {
            carnet_obj = u.get("carnet").and_then(|v| v.as_str()).unwrap_or("").to_string();
        } else {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({"message": "Usuario no encontrado"}))).into_response();
        }
    }

    // Zero Inline SQL: Usar sp_Planning_ObtenerPlanDetalle (Multi-Resultset)
    // Este SP ahora puede recibir (NULL, carnet, mes, anio) para buscar si id_plan es 0
    let recordsets = crate::handlers::equipo::exec_sp_multi_to_json(
        &mut client, 
        "EXEC sp_Planning_ObtenerPlanDetalle_rust @idPlan=@P1, @carnet=@P2, @mes=@P3, @anio=@P4", 
        &[&0i32, &carnet_obj, &mes, &anio]
    ).await;

    if let Some(plan_rows) = recordsets.get(0) {
        if let Some(p_row) = plan_rows.first() {
            let mut plan_obj = p_row.clone();
            let tareas = recordsets.get(1).cloned().unwrap_or_default();

            let mut semanas = vec![];
            for i in 1..=4 {
                let sem_tareas: Vec<_> = tareas.iter()
                    .filter(|t| t.get("semana").and_then(|v| v.as_i64()) == Some(i as i64))
                    .cloned().collect();
                semanas.push(serde_json::json!({
                    "id": i,
                    "label": format!("Semana {}", i),
                    "tareas": sem_tareas
                }));
            }
            plan_obj.as_object_mut().unwrap().insert("semanas".to_string(), serde_json::json!(semanas));
            return (StatusCode::OK, Json(crate::models::ApiResponse::success(plan_obj))).into_response();
        }
    }

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!(null)))).into_response()
}

pub async fn planning_create_plan(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let id_usuario_obj = body.get("idUsuario").and_then(|v| v.as_i64()).unwrap_or(user.user_id() as i64) as i32;
    let mes = body.get("mes").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
    let anio = body.get("anio").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
    
    if mes == 0 || anio == 0 {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"message": "mes and anio required"}))).into_response();
    }

    let objetivos = match body.get("objetivos") {
        Some(v) if v.is_string() => v.as_str().unwrap().to_string(),
        Some(v) => v.to_string(),
        None => "".to_string(),
    };
    
    let estado = body.get("estado").and_then(|v| v.as_str()).unwrap_or("Borrador");
    let id_creador = user.user_id_i32();

    // Zero Inline SQL: Usar sp_Planning_UpsertPlan
    let upsert_res = crate::handlers::equipo::exec_sp_to_json(
        &mut client, 
        "EXEC sp_Planning_UpsertPlan_rust @P1, @P2, @P3, @P4, @P5, @P6", 
        &[&id_usuario_obj, &mes, &anio, &objetivos, &estado, &id_creador]
    ).await;

    if let Some(new_plan) = upsert_res.first() {
        (StatusCode::OK, Json(crate::models::ApiResponse::success(new_plan.clone()))).into_response()
    } else {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error("Error al procesar plan".to_string(), 500))).into_response()
    }
}

pub async fn planning_stats(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let carnet = user.carnet();
    
    // 1. Get visible carnets
    let mut visible_carnets = Vec::new();
    if let Ok(stream) = client.query("EXEC sp_Visibilidad_ObtenerCarnets_rust @P1", &[&carnet]).await {
        if let Ok(rows) = stream.into_first_result().await {
            for r in rows {
                if let Ok(Some(c)) = r.try_get::<&str, _>("carnet") {
                    visible_carnets.push(c.to_string());
                }
            }
        }
    }
    if visible_carnets.is_empty() {
        visible_carnets.push(carnet.to_string());
    }
    let carnets_csv = visible_carnets.join(",");
    
    // 2. Get details and ids
    let mut visible_users = Vec::new();
    let mut ids_list = Vec::new();

    if let Ok(stream) = client.query("EXEC sp_Usuarios_ObtenerDetallesPorCarnets_rust @P1", &[&carnets_csv]).await {
        if let Ok(rows) = stream.into_first_result().await {
            for r in rows {
                let id = r.try_get::<i32, _>("idUsuario").ok().flatten().unwrap_or(0);
                if id > 0 {
                    ids_list.push(id);
                    visible_users.push(serde_json::json!({
                        "id": id,
                        "nombre": r.try_get::<&str, _>("nombreCompleto").ok().flatten().unwrap_or(""),
                        "cargo": r.try_get::<&str, _>("cargo").ok().flatten().map(|s| if s.is_empty() { "Sin cargo" } else { s }).unwrap_or("Sin cargo")
                    }));
                }
            }
        }
    }

    if ids_list.is_empty() {
        return (StatusCode::OK, Json(serde_json::json!({
            "statusDistribution": [],
            "globalCompletion": 0,
            "totalActivePlans": 0,
            "usersWithoutPlanCount": 0,
            "usersWithoutPlan": [],
            "hierarchyBreakdown": [],
            "topDelays": [],
            "projectsStats": [],
            "blockersDetail": [],
            "visibleTeamCount": 0,
            "bottlenecks": [],
            "tasksDetails": []
        }))).into_response();
    }
    
    let ids_str = ids_list.iter().map(|id| id.to_string()).collect::<Vec<_>>().join(",");
    
    // Zero Inline SQL: MigraciÃ³n a sp_Planning_StatsDashboard (Multi-Resultset)
    // Este SP reemplaza todas las consultas inline anteriores en un solo viaje a la DB.
    let recordsets = crate::handlers::equipo::exec_sp_multi_to_json(
        &mut client, 
        "EXEC sp_Planning_StatsDashboard_rust @P1", 
        &[&ids_str]
    ).await;

    let projects_raw = recordsets.get(0).cloned().unwrap_or_default();
    let tasks_raw = recordsets.get(1).cloned().unwrap_or_default();
    
    // Convertir lista de usuarios activos a HashSet para compatibilidad con cÃ³digo posterior
    let mut active_user_ids = std::collections::HashSet::new();
    if let Some(active_rows) = recordsets.get(2) {
        for row in active_rows {
            if let Some(id) = row.get("idUsuario").and_then(|v| v.as_i64()) {
                active_user_ids.insert(id as i32);
            }
        }
    }

    let top_delays = recordsets.get(3).cloned().unwrap_or_default();
    let blockers_detail = recordsets.get(4).cloned().unwrap_or_default();


    // Process Projects Stats & Globals
    let mut total_all = 0; let mut hechas_all = 0; let mut atrasadas_all = 0; let mut bloqueadas_all = 0;
    let mut projects_stats = Vec::new();

    for p in projects_raw {
        let total_tasks = p["totalTasks"].as_i64().unwrap_or(0) as i32;
        let p_hechas = p["hechas"].as_i64().unwrap_or(0) as i32;
        let p_id = p["idProyecto"].as_i64().unwrap_or(0) as i32;

        let progress = if total_tasks > 0 { ((p_hechas as f64 / total_tasks as f64) * 100.0).round() as i32 } else { 0 };

        let mut expected_progress = 0;
        let now = chrono::Utc::now().timestamp_millis();
        if let (Some(f_inicio_str), Some(f_fin_str)) = (p["fechaInicio"].as_str(), p["fechaFin"].as_str()) {
            let start = chrono::NaiveDateTime::parse_from_str(f_inicio_str, "%Y-%m-%d %H:%M:%S%.f")
                .map(|nd| nd.and_utc().timestamp_millis()).unwrap_or(0);
            let end = chrono::NaiveDateTime::parse_from_str(f_fin_str, "%Y-%m-%d %H:%M:%S%.f")
                .map(|nd| nd.and_utc().timestamp_millis()).unwrap_or(0);
            
            if start > 0 && end > start {
                if now >= end { expected_progress = 100; } 
                else if now <= start { expected_progress = 0; } 
                else { expected_progress = (((now - start) as f64 / (end - start) as f64) * 100.0).round() as i32; }
            }
        }

        let p_tasks: Vec<_> = tasks_raw.iter().filter(|t| t["idProyecto"].as_i64().unwrap_or(0) as i32 == p_id).cloned().collect();

        total_all += total_tasks;
        hechas_all += p_hechas;
        atrasadas_all += p["atrasadas"].as_i64().unwrap_or(0) as i32;
        bloqueadas_all += p["bloqueadas"].as_i64().unwrap_or(0) as i32;

        let mut ps = p.clone();
        ps.as_object_mut().unwrap().insert("id".to_string(), serde_json::json!(p_id));
        ps.as_object_mut().unwrap().insert("progress".to_string(), serde_json::json!(progress));
        ps.as_object_mut().unwrap().insert("expectedProgress".to_string(), serde_json::json!(expected_progress));
        ps.as_object_mut().unwrap().insert("deviation".to_string(), serde_json::json!(progress - expected_progress));
        ps.as_object_mut().unwrap().insert("tareas".to_string(), serde_json::json!(p_tasks));
        projects_stats.push(ps);
    }

    // 5. Hierarchy breakdown
    let mut subgerencia_map: std::collections::HashMap<String, serde_json::Value> = std::collections::HashMap::new();
    for ps in &projects_stats {
        let key = ps["subgerencia"].as_str().unwrap_or("General").to_string();
        let entry = subgerencia_map.entry(key.clone()).or_insert_with(|| serde_json::json!({
            "name": key, "pendientes": 0, "enCurso": 0, "hechas": 0, "bloqueadas": 0, "atrasadas": 0, "total": 0
        }));
        entry["pendientes"] = serde_json::json!(entry["pendientes"].as_i64().unwrap() + ps["pendientes"].as_i64().unwrap_or(0));
        entry["enCurso"] = serde_json::json!(entry["enCurso"].as_i64().unwrap() + ps["enCurso"].as_i64().unwrap_or(0));
        entry["hechas"] = serde_json::json!(entry["hechas"].as_i64().unwrap() + ps["hechas"].as_i64().unwrap_or(0));
        entry["bloqueadas"] = serde_json::json!(entry["bloqueadas"].as_i64().unwrap() + ps["bloqueadas"].as_i64().unwrap_or(0));
        entry["atrasadas"] = serde_json::json!(entry["atrasadas"].as_i64().unwrap() + ps["atrasadas"].as_i64().unwrap_or(0));
        entry["total"] = serde_json::json!(entry["total"].as_i64().unwrap() + ps["totalTasks"].as_i64().unwrap_or(0));
    }
    let hierarchy_breakdown: Vec<_> = subgerencia_map.values().cloned().collect();

    // 6. Users Without Plan (Using parallel results)

    let users_without_plan: Vec<_> = visible_users.into_iter()
        .filter(|u| !active_user_ids.contains(&(u["id"].as_i64().unwrap_or(0) as i32)))
        .collect();

    // 7. Top Delays (Using parallel results)

    let bottlenecks = if top_delays.len() > 5 { top_delays[0..5].to_vec() } else { top_delays.clone() };

    let global_completion = if total_all > 0 { ((hechas_all as f64 / total_all as f64) * 100.0).round() as i32 } else { 0 };

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "statusDistribution": [
            { "name": "Pendientes", "value": total_all - hechas_all - atrasadas_all - bloqueadas_all, "fill": "#94a3b8" },
            { "name": "Atrasadas", "value": atrasadas_all, "fill": "#f43f5e" },
            { "name": "Hechas", "value": hechas_all, "fill": "#10b981" },
            { "name": "Bloqueadas", "value": bloqueadas_all, "fill": "#f59e0b" }
        ],
        "globalCompletion": global_completion,
        "totalActivePlans": projects_stats.len(),
        "usersWithoutPlanCount": users_without_plan.len(),
        "usersWithoutPlan": users_without_plan,
        "hierarchyBreakdown": hierarchy_breakdown,
        "topDelays": top_delays,
        "projectsStats": projects_stats,
        "blockersDetail": blockers_detail,
        "visibleTeamCount": ids_list.len(),
        "bottlenecks": bottlenecks,
        "tasksDetails": tasks_raw
    })))).into_response()

}

pub async fn planning_stats_compliance(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    query: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let month = query.get("mes").and_then(|v| v.parse::<i32>().ok()).unwrap_or(0);
    let year = query.get("anio").and_then(|v| v.parse::<i32>().ok()).unwrap_or(0);

    if month < 1 || month > 12 || year < 2000 {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"message": "Mes y aÃ±o invÃ¡lidos"}))).into_response();
    }

    // Zero Inline SQL: Usar SP sp_Planning_StatsCompliance
    let items = crate::handlers::equipo::exec_sp_to_json(
        &mut client, 
        "EXEC sp_Planning_StatsCompliance_rust @P1, @P2", 
        &[&month, &year]
    ).await;

    let mut total = 0;
    let mut confirmed = 0;

    for item in &items {
        let count = item.get("count").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
        let estado = item.get("estado").and_then(|v| v.as_str()).unwrap_or("");
        
        total += count;
        if estado == "Confirmado" || estado == "Cerrado" {
            confirmed += count;
        }
    }

    let compliance = if total > 0 { (confirmed as f64 / total as f64 * 100.0).round() as i32 } else { 0 };

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "month": month,
        "year": year,
        "compliance": compliance,
        "totalPlans": total,
        "breakdown": items
    })))).into_response()
}

pub async fn planning_stats_performance(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    query: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let month = query.get("mes").and_then(|v| v.parse::<i32>().ok()).unwrap_or(0);
    let year = query.get("anio").and_then(|v| v.parse::<i32>().ok()).unwrap_or(0);

    if month < 1 || month > 12 || year < 2000 {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"message": "Mes y aÃ±o invÃ¡lidos"}))).into_response();
    }

    // Zero Inline SQL: Usar SP sp_Planning_StatsPerformance
    let items = crate::handlers::equipo::exec_sp_to_json(
        &mut client, 
        "EXEC sp_Planning_StatsPerformance_rust @P1, @P2", 
        &[&month, &year]
    ).await;

    (StatusCode::OK, Json(crate::models::ApiResponse::success(items))).into_response()
}

pub async fn planning_stats_bottlenecks(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    // Zero Inline SQL: Usar SP sp_Planning_StatsBottlenecks (Multi-Resultset)
    let recordsets = crate::handlers::equipo::exec_sp_multi_to_json(
        &mut client, 
        "EXEC sp_Planning_StatsBottlenecks_rust", 
        &[]
    ).await;
    let top_delayed = recordsets.get(0).cloned().unwrap_or_default();
    let top_blockers = recordsets.get(1).cloned().unwrap_or_default();

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "topDelayedUsers": top_delayed,
        "topBlockers": top_blockers
    })))).into_response()
}

pub async fn planning_team(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    query_params: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let carnet = query_params.get("carnet").cloned().unwrap_or_else(|| user.carnet().to_string());
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };
    // Zero Inline SQL: Usar sp_Visibilidad_ObtenerMiEquipo en lugar de SELECT manual
    // NestJS: visibilidad.service.obtenerMiEquipo(carnet) que usa sp_Visibilidad_ObtenerMiEquipo
    let mut team = crate::handlers::equipo::exec_sp_to_json(&mut client, "EXEC sp_Visibilidad_ObtenerMiEquipo_rust @idUsuario=NULL, @carnet=@P1", &[&carnet]).await;
    
    // NestJS Parity: Garantizar que el usuario mismo esté en la lista (fuente: 'MISMO')
    let is_self_in_team = team.iter().any(|m| {
        m.get("carnet").and_then(|v| v.as_str()).map(|s| s.trim()) == Some(carnet.trim())
    });

    if !is_self_in_team {
        let self_details = crate::handlers::equipo::exec_sp_to_json(&mut client, "EXEC sp_Usuarios_ObtenerDetallesPorCarnets_rust @P1", &[&carnet]).await;
        if let Some(mut u) = self_details.into_iter().next() {
            if let Some(obj) = u.as_object_mut() {
                obj.insert("nivel".to_string(), serde_json::json!(0));
                obj.insert("fuente".to_string(), serde_json::json!("MISMO"));
            }
            team.insert(0, u);
        }
    }

    // Asegurar compatibilidad: agregar campo 'nombre' si falta (para sorting en frontend)
    for u in team.iter_mut() {
        if let Some(obj) = u.as_object_mut() {
            if !obj.contains_key("nombre") {
                if let Some(nc) = obj.get("nombreCompleto").cloned() {
                    obj.insert("nombre".to_string(), nc);
                }
            }
        }
    }

    (StatusCode::OK, Json(crate::models::ApiResponse::success(team))).into_response()
}

pub async fn planning_my_projects(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    query_params: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    // FIX: Use carnet from JWT, not "UNKNOWN"
    let carnet = query_params.get("carnet").cloned().unwrap_or_else(|| user.carnet().to_string());
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };
    let projects = crate::handlers::equipo::exec_sp_to_json(
        &mut client, 
        "EXEC sp_ObtenerProyectos_rust @carnet = @P1, @filtroNombre = NULL, @filtroEstado = NULL", 
        &[&carnet]
    ).await;

    (StatusCode::OK, Json(crate::models::ApiResponse::success(projects))).into_response()
}

pub async fn planning_close_plan(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };
    if let Err(e) = client.execute("EXEC sp_Plan_Cerrar_rust @P1", &[&id]).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response();
    }
    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({ "message": "Plan cerrado", "id": id })))).into_response()
}

pub async fn planning_update_operative(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    let id_tarea = body.get("idTarea").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
    if id_tarea <= 0 {
        return (StatusCode::BAD_REQUEST, Json(crate::models::ApiResponse::error("idTarea invÃ¡lido".to_string(), 400))).into_response();
    }

    let updates = match body.get("updates").and_then(|v| v.as_object()) {
        Some(o) => o,
        None => return (StatusCode::BAD_REQUEST, Json(crate::models::ApiResponse::error("updates requerido".to_string(), 400))).into_response(),
    };

    let titulo = updates.get("nombre").and_then(|v| v.as_str());
    let descripcion = updates.get("descripcion").and_then(|v| v.as_str());
    let estado = updates.get("estado").and_then(|v| v.as_str());
    let prioridad = updates.get("prioridad").and_then(|v| v.as_str());
    let progreso = updates.get("porcentaje").and_then(|v| v.as_i64()).map(|v| v as i32);
    
    let parse_date = |v: Option<&serde_json::Value>| -> Option<chrono::NaiveDateTime> {
        v.and_then(|s| s.as_str()).and_then(|s| chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.fZ").ok().or_else(|| chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok().map(|d| d.and_hms_opt(0, 0, 0).unwrap())))
    };

    let fecha_objetivo = parse_date(updates.get("fechaObjetivo"));
    let fecha_inicio = parse_date(updates.get("fechaInicioPlanificada"));

    let query = r#"
        SET QUOTED_IDENTIFIER ON;
        EXEC sp_ActualizarTarea_rust 
            @idTarea = @P1,
            @titulo = @P2,
            @descripcion = @P3,
            @estado = @P4,
            @prioridad = @P5,
            @progreso = @P6,
            @fechaObjetivo = @P7,
            @fechaInicioPlanificada = @P8
    "#;

    if let Err(e) = client.execute(query, &[
        &id_tarea,
        &titulo,
        &descripcion,
        &estado,
        &prioridad,
        &progreso,
        &fecha_objetivo,
        &fecha_inicio
    ]).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response();
    }

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({ "exito": true })))).into_response()
}

pub async fn planning_clone_task(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let carnet = user.carnet().to_string();
    let mut new_id = 0;
    
    if let Ok(stream) = client.query("EXEC sp_Tarea_Clonar_rust @P1, @P2", &[&id, &carnet.as_str()]).await {
        if let Ok(rows) = stream.into_first_result().await {
            if let Some(r) = rows.into_iter().next() {
                new_id = r.try_get::<i32, _>("idTarea").ok().flatten().unwrap_or(0);
            }
        }
    }

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({ "id": new_id })))).into_response()
}

pub async fn planning_task_history(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    let id_str = id.to_string();
    let mut history = Vec::new();

    if let Ok(st) = client.query("SELECT * FROM p_Auditoria WHERE recurso = 'Tarea' AND recursoId = @P1 ORDER BY fecha DESC", &[&id_str]).await {
        if let Ok(rows) = st.into_first_result().await {
            history = rows.into_iter().map(|r| crate::handlers::equipo::row_to_json(&r)).collect();
        }
    }

    (StatusCode::OK, Json(crate::models::ApiResponse::success(history))).into_response()
}

pub async fn planning_task_avance_mensual(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let query = r#"
        SELECT
            id, idTarea, anio, mes, CAST(porcentajeMes AS FLOAT) as porcentajeMes,
            CAST(SUM(porcentajeMes) OVER (
                PARTITION BY idTarea 
                ORDER BY anio, mes
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS FLOAT) AS porcentajeAcumulado,
            comentario, idUsuarioActualizador, fechaActualizacion
        FROM p_TareaAvanceMensual
        WHERE idTarea = @P1
        ORDER BY anio, mes
    "#;

    let mut items = vec![];
    if let Ok(stream) = client.query(query, &[&id]).await {
        if let Ok(rows) = stream.into_first_result().await {
            for r in rows {
                items.push(serde_json::json!({
                    "id": r.try_get::<i32, _>("id").ok().flatten().unwrap_or(0),
                    "idTarea": r.try_get::<i32, _>("idTarea").ok().flatten().unwrap_or(0),
                    "year": r.try_get::<i32, _>("anio").ok().flatten().unwrap_or(0),
                    "month": r.try_get::<i32, _>("mes").ok().flatten().unwrap_or(0),
                    "progress": r.try_get::<f64, _>("porcentajeMes").ok().flatten().unwrap_or(0.0),
                    "acumulado": r.try_get::<f64, _>("porcentajeAcumulado").ok().flatten().unwrap_or(0.0),
                    "comentario": r.try_get::<&str, _>("comentario").ok().flatten().unwrap_or(""),
                }));
            }
        }
    }

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "idTarea": id,
        "items": items
    })))).into_response()
}

pub async fn planning_task_save_avance_mensual(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    Json(body): Json<PlanningTaskAvanceMensualRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let id_usuario = user.user_id_i32();
    let year = body.year as i32;
    let month = body.month as i32;
    // The DB mapped it to decimal
    let progress_val = body.progress as f64; 
    let comentario = body.comentario.clone().unwrap_or_default();

    if let Err(e) = client.execute("EXEC sp_UpsertAvanceMensual_rust @P1, @P2, @P3, @P4, @P5, @P6", 
        &[&id, &year, &month, &progress_val, &comentario, &id_usuario]).await 
    {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))).into_response();
    }

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "saved": {
            "idTarea": id,
            "year": year,
            "month": month,
            "progress": progress_val,
            "comentario": comentario
        }
    })))).into_response()
}

pub async fn planning_task_crear_grupo(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))).into_response(),
    };

    match client.execute("EXEC sp_CrearGrupoInicial_rust @P1", &[&id]).await {
        Ok(_) => {
            (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
                "idGrupo": id,
                "message": "Grupo creado correctamente"
            })))).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    }
}

pub async fn planning_task_agregar_fase(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Path(id_grupo): Path<i32>,
    Json(body): Json<PlanningAgregarFaseRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))).into_response(),
    };

    let id_tarea_nueva = body.id_tarea_nueva;

    match client.execute("EXEC sp_AgregarFaseGrupo_rust @P1, @P2", &[&id_grupo, &id_tarea_nueva]).await {
        Ok(_) => {
            // Retornar la lista actualizada de tareas del grupo
            let sql = "SELECT * FROM p_Tareas WHERE idGrupo = @P1 ORDER BY numeroParte";
            match client.query(sql, &[&id_grupo]).await {
                Ok(st) => {
                    if let Ok(rows) = st.into_first_result().await {
                        let items: Vec<serde_json::Value> = rows.into_iter().map(|r| crate::handlers::equipo::row_to_json(&r)).collect();
                        return (StatusCode::OK, Json(crate::models::ApiResponse::success(items))).into_response();
                    }
                }
                Err(_) => {}
            }
            (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({})))).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    }
}

pub async fn planning_grupo_detail(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Path(id_grupo): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))).into_response(),
    };

    let sql = "SELECT * FROM p_Tareas WHERE idGrupo = @P1 ORDER BY numeroParte";
    match client.query(sql, &[&id_grupo]).await {
        Ok(st) => {
            if let Ok(rows) = st.into_first_result().await {
                let items: Vec<serde_json::Value> = rows.into_iter().map(|r| crate::handlers::equipo::row_to_json(&r)).collect();
                return (StatusCode::OK, Json(crate::models::ApiResponse::success(items))).into_response();
            }
        }
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    }
    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!([])))).into_response()
}

pub async fn planning_dashboard_alerts(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    let carnet = user.carnet().to_string();

    // Query para obtener las tareas crÃ­ticas (Atrasadas y de Hoy) del equipo
    // simplificada usando p_Tareas y asignaciones para el mismo carnet.
    let query = "
        WITH TareasEquipo AS (
            SELECT ta.idTarea FROM p_TareaAsignados ta WHERE ta.carnet = @P1
            UNION
            SELECT ct.idTarea FROM p_CheckinTareas ct 
            JOIN p_Checkins c ON c.idCheckin = ct.idCheckin WHERE c.usuarioCarnet = @P1 AND c.fecha >= CAST(GETDATE() as DATE)
        )
        SELECT t.idTarea as id, t.nombre as titulo, t.fechaObjetivo, t.estado, t.prioridad, t.idProyecto
        FROM p_Tareas t
        JOIN TareasEquipo te ON t.idTarea = te.idTarea
        WHERE t.activo = 1 AND t.estado NOT IN ('Hecha', 'Completada', 'Eliminada', 'Cancelada')
    ";

    let mut overdue = Vec::new();
    let mut today = Vec::new();

    if let Ok(st) = client.query(query, &[&carnet]).await {
        if let Ok(rows) = st.into_first_result().await {
            let hoy = chrono::Utc::now().naive_utc().date();
            for r in rows {
                let json = crate::handlers::equipo::row_to_json(&r);
                if let Some(fecha_obj) = json.get("fechaObjetivo").and_then(|v| v.as_str()) {
                    if let Ok(parsed_date) = chrono::NaiveDate::parse_from_str(&fecha_obj[..10], "%Y-%m-%d") {
                        if parsed_date < hoy {
                            overdue.push(json);
                        } else if parsed_date == hoy {
                            today.push(json);
                        }
                    } else {
                        overdue.push(json);
                    }
                }
            }
        }
    }

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "overdue": overdue,
        "today": today
    })))).into_response()
}

pub async fn planning_mi_dia(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    query_params: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    let carnet = query_params
        .get("carnet")
        .cloned()
        .unwrap_or_else(|| user.carnet().to_string());
    let fecha = query_params
        .get("fecha")
        .cloned()
        .unwrap_or_else(|| Utc::now().format("%Y-%m-%d").to_string());

    // Obtener tareas vÃ­a SP
    // EXEC sp_Tareas_ObtenerPorUsuario_rust @carnet='...', @estado=NULL
    let stream = match client
        .query("EXEC sp_Tareas_ObtenerPorUsuario_rust @P1, NULL", &[&carnet])
        .await
    {
        Ok(s) => s,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    };

    let mut all_tasks = Vec::new();
    match stream.into_first_result().await {
        Ok(rows) => {
            for r in rows {
                let id_tarea: i32 = r.try_get::<i32, _>("idTarea").ok().flatten().unwrap_or(0);
                let titulo: &str = r.try_get::<&str, _>("titulo").ok().flatten().unwrap_or("");
                let estado: &str = r.try_get::<&str, _>("estado").ok().flatten().unwrap_or("");
                let prioridad: &str = r.try_get::<&str, _>("prioridad").ok().flatten().unwrap_or("Media");
                let fecha_obj = r.try_get::<chrono::NaiveDateTime, _>("fechaObjetivo").ok().flatten();
                let fecha_creacion = r.try_get::<chrono::NaiveDateTime, _>("fechaCreacion").ok().flatten();

                all_tasks.push(serde_json::json!({
                    "idTarea": id_tarea,
                    "titulo": titulo,
                    "estado": estado,
                    "prioridad": prioridad,
                    "fechaObjetivo": fecha_obj,
                    "fechaCreacion": fecha_creacion,
                    "proyectoNombre": r.try_get::<&str, _>("proyectoNombre").ok().flatten().unwrap_or("General"),
                }));
            }

        }
        Err(_) => {}
    }

    // Clasificación básica
    let hoy = fecha.clone();
    let mut tareas_sugeridas = Vec::new();
    let mut backlog = Vec::new();
    let mut bloqueos_activos = Vec::new();

    for t in all_tasks {
        let estado = t["estado"].as_str().unwrap_or("");

        if estado == "Bloqueada" {
            bloqueos_activos.push(t.clone());
        }

        let finalizadas = ["Hecha", "Completada", "Descartada", "Terminada"];
        if finalizadas.contains(&estado) {
            continue;
        }

        let is_overdue = if let Some(f_obj_full) = t["fechaObjetivo"].as_str() {
            if f_obj_full.len() >= 10 {
                &f_obj_full[..10] < hoy.as_str()
            } else {
                false
            }
        } else {
            // Si no tiene fecha objetivo, ver si la fecha de creación es anterior a hoy (Backlog)
            if let Some(f_cre_full) = t["fechaCreacion"].as_str() {
                if f_cre_full.len() >= 10 {
                    &f_cre_full[..10] < hoy.as_str()
                } else {
                    false
                }
            } else {
                false
            }
        };

        if is_overdue {
            backlog.push(t);
        } else {
            tareas_sugeridas.push(t);
        }
    }

    let mut checkin_hoy = serde_json::Value::Null;
    let q = "SELECT TOP 1 * FROM p_Checkins WHERE usuarioCarnet=@P1 AND CAST(fecha AS DATE)=CAST(@P2 AS DATE) ORDER BY idCheckin DESC";
    
    if let Ok(mut c) = state.pool.get().await {
        let mut id_checkin_found = 0i64;
        let mut checkin_obj_found = serde_json::Value::Null;
        
        if let Ok(st) = c.query(q, &[&carnet, &fecha]).await {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.first() {
                    let checkin_obj = crate::handlers::equipo::row_to_json(r);
                    id_checkin_found = checkin_obj.get("idCheckin").and_then(|v| v.as_i64()).unwrap_or(0);
                    checkin_obj_found = checkin_obj;
                }
            }
        }
        
        if id_checkin_found > 0 {
            // Fetch checkin_tareas
            let q_tareas = "SELECT ct.idTarea, ct.tipo, t.nombre as titulo, t.estado \
                            FROM p_CheckinTareas ct \
                            JOIN p_Tareas t ON ct.idTarea = t.idTarea \
                            WHERE ct.idCheckin = @P1";
            if let Ok(st_t) = c.query(q_tareas, &[&(id_checkin_found as i32)]).await {
                if let Ok(rows_t) = st_t.into_first_result().await {
                    let mut tareas_arr = Vec::new();
                    for rt in rows_t {
                        let id_t = rt.try_get::<i32, _>("idTarea").ok().flatten().unwrap_or(0);
                        let tipo = rt.try_get::<&str, _>("tipo").ok().flatten().unwrap_or("");
                        let titulo = rt.try_get::<&str, _>("titulo").ok().flatten().unwrap_or("");
                        let estado = rt.try_get::<&str, _>("estado").ok().flatten().unwrap_or("");
                        
                        tareas_arr.push(serde_json::json!({
                            "idTarea": id_t,
                            "tipo": tipo,
                            "tarea": {
                                "idTarea": id_t,
                                "titulo": titulo,
                                "estado": estado
                            }
                        }));
                    }
                    if let Some(obj) = checkin_obj_found.as_object_mut() {
                        obj.insert("tareas".to_string(), serde_json::Value::Array(tareas_arr));
                    }
                }
            }
        }
        
        if !checkin_obj_found.is_null() {
            checkin_hoy = checkin_obj_found;
        }
    }

    // Filtra las tareas sugeridas para no incluir las que ya están en el checkin de hoy
    if let Some(tareas_checkin) = checkin_hoy.get("tareas").and_then(|v| v.as_array()) {
        let tareas_checkin_ids: Vec<i64> = tareas_checkin.iter()
            .filter_map(|t| t.get("idTarea").and_then(|v| v.as_i64()))
            .collect();
            
        tareas_sugeridas.retain(|t| {
            if let Some(id_t) = t.get("idTarea").and_then(|v| v.as_i64()) {
                !tareas_checkin_ids.contains(&id_t)
            } else {
                true
            }
        });
        
        backlog.retain(|t| {
            if let Some(id_t) = t.get("idTarea").and_then(|v| v.as_i64()) {
                !tareas_checkin_ids.contains(&id_t)
            } else {
                true
            }
        });
    }

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "bloqueosActivos": bloqueos_activos,
        "bloqueosMeCulpan": [],
        "tareasSugeridas": tareas_sugeridas,
        "backlog": backlog,
        "checkinHoy": checkin_hoy
    })))).into_response()
}

pub async fn planning_mi_asignacion(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    query_params: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let carnet = query_params
        .get("carnet")
        .cloned()
        .unwrap_or_else(|| user.carnet().to_string());

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    // 1. Get assigned projects
    let proyectos_raw = match client
        .query("EXEC sp_Planning_ObtenerProyectosAsignados_rust @P1", &[&carnet])
        .await
    {
        Ok(stream) => match stream.into_first_result().await {
            Ok(rows) => rows
                .into_iter()
                .map(|r| {
                    let progreso = r.try_get::<f64, _>("progresoProyecto").ok().flatten().unwrap_or(0.0);
                    serde_json::json!({
                        "idProyecto": r.try_get::<i32, _>("idProyecto").ok().flatten().unwrap_or(0),
                        "nombre": r.try_get::<&str, _>("nombre").ok().flatten().unwrap_or(""),
                        "progresoProyecto": progreso as i32,
                    })
                })
                .collect::<Vec<_>>(),
            Err(_) => Vec::new(),
        },
        Err(_) => Vec::new(),
    };

    // 2. Get tasks
    let tareas_raw = match client
        .query("EXEC sp_Tareas_ObtenerPorUsuario_rust @P1, NULL", &[&carnet])
        .await
    {
        Ok(stream) => match stream.into_first_result().await {
            Ok(rows) => rows
                .into_iter()
                .map(|r| {
                    let f_obj = r.try_get::<chrono::NaiveDateTime, _>("fechaObjetivo").ok().flatten();
                    let mut dias_atraso = 0;
                    if let Some(fo) = f_obj {
                        let hoy = chrono::Utc::now().naive_utc().date();
                        let fo_date = fo.date();
                        if fo_date < hoy {
                            dias_atraso = (hoy - fo_date).num_days() as i32;
                        }
                    }

                    serde_json::json!({
                        "idTarea": r.try_get::<i32, _>("idTarea").ok().flatten().unwrap_or(0),
                        "titulo": r.try_get::<&str, _>("titulo").ok().flatten().unwrap_or(""),
                        "estado": r.try_get::<&str, _>("estado").ok().flatten().unwrap_or(""),
                        "prioridad": r.try_get::<&str, _>("prioridad").ok().flatten().unwrap_or("Media"),
                        "idProyecto": r.try_get::<i32, _>("idProyecto").ok().flatten(),
                        "proyectoNombre": r.try_get::<&str, _>("proyectoNombre").ok().flatten().unwrap_or("General"),
                        "fechaObjetivo": f_obj,
                        "diasAtraso": dias_atraso,
                        "responsableCarnet": r.try_get::<&str, _>("responsableCarnet").ok().flatten().unwrap_or(""),
                        "responsableNombre": r.try_get::<&str, _>("responsableNombre").ok().flatten().unwrap_or(""),
                    })
                })
                .collect::<Vec<_>>(),
            Err(_) => Vec::new(),
        },
        Err(_) => Vec::new(),
    };

    // 3. Group tasks by project
    let mut proyecto_map: HashMap<i32, serde_json::Value> = HashMap::new();
    for p in &proyectos_raw {
        let id = p["idProyecto"].as_i64().unwrap_or(0) as i32;
        let mut proj = p.clone();
        proj.as_object_mut()
            .unwrap()
            .insert("misTareas".to_string(), serde_json::json!([]));
        proyecto_map.insert(id, proj);
    }

    let mut sin_proyecto: Vec<serde_json::Value> = Vec::new();
    let total_tareas = tareas_raw.len();
    let mut atrasadas = 0i32;
    let mut tareas_hoy = 0i32;
    let mut tareas_completadas = 0i32;
    let hoy = Utc::now().format("%Y-%m-%d").to_string();

    for t in &tareas_raw {
        let id_proy = t["idProyecto"].as_i64().unwrap_or(0) as i32;
        let fecha_obj = t["fechaObjetivo"].as_str().unwrap_or("");
        let estado = t["estado"].as_str().unwrap_or("");

        let es_finalizada = ["Hecha", "Completada", "Descartada", "Eliminada", "Archivada"].contains(&estado);
        if estado == "Hecha" || estado == "Completada" {
            tareas_completadas += 1;
        }

        if fecha_obj.len() >= 10 {
            if &fecha_obj[..10] == hoy.as_str() {
                tareas_hoy += 1;
            }
            if &fecha_obj[..10] < hoy.as_str() && !es_finalizada {
                atrasadas += 1;
            }
        }

        if id_proy > 0 {
            if let Some(proj) = proyecto_map.get_mut(&id_proy) {
                proj["misTareas"].as_array_mut().unwrap().push(t.clone());
            } else {
                sin_proyecto.push(t.clone());
            }
        } else {
            sin_proyecto.push(t.clone());
        }
    }

    let mut proyectos_final: Vec<serde_json::Value> = proyecto_map
        .into_values()
        .filter(|p| !p["misTareas"].as_array().unwrap().is_empty())
        .collect();

    if !sin_proyecto.is_empty() {
        proyectos_final.push(serde_json::json!({
            "idProyecto": 0,
            "nombre": "General / Otros Proyectos",
            "progresoProyecto": 0,
            "misTareas": sin_proyecto,
        }));
    }

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "proyectos": proyectos_final,
        "resumen": {
            "totalProyectos": proyectos_final.len(),
            "totalTareas": total_tareas,
            "tareasAtrasadas": atrasadas,
            "tareasHoy": tareas_hoy,
            "tareasCompletadas": tareas_completadas,
        }
    })))).into_response()
}

pub async fn planning_supervision(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error("DB connect error".to_string(), 500))).into_response(),
    };

    // 1. Usuarios activos Sin tareas asignadas (Paridad Nest repo)
    let usuarios_sin_tarea = crate::handlers::equipo::exec_sp_to_json(&mut client, 
        r#"
        SELECT u.idUsuario, u.nombre, u.carnet, u.gerencia, u.area, u.rolGlobal, u.correo
        FROM p_Usuarios u
        WHERE u.activo = 1
          AND u.carnet IS NOT NULL
          AND u.nombre NOT LIKE '%Admin%'
          AND NOT EXISTS (
              SELECT 1 
              FROM p_TareaAsignados ta
              JOIN p_Tareas t ON ta.idTarea = t.idTarea
              WHERE ta.carnet = u.carnet
                AND t.activo = 1
                AND t.estado NOT IN ('Hecha', 'Completada', 'Descartada', 'Eliminada', 'Cancelada', 'Archivada')
          )
        ORDER BY u.nombre ASC
        "#, &[]).await;

    // 2. Proyectos Activos SIN tareas activas
    let proyectos_sin_tarea = crate::handlers::equipo::exec_sp_to_json(&mut client,
        r#"
        SELECT p.idProyecto, p.nombre, p.tipo, p.gerencia, p.area, u.nombre as creador, p.fechaCreacion
        FROM p_Proyectos p
        LEFT JOIN p_Usuarios u ON p.idCreador = u.idUsuario
        WHERE p.estado = 'Activo'
          AND NOT EXISTS (
              SELECT 1 
              FROM p_Tareas t
              WHERE t.idProyecto = p.idProyecto
                AND t.activo = 1
                AND t.estado NOT IN ('Hecha', 'Completada', 'Descartada', 'Eliminada', 'Cancelada', 'Archivada')
          )
        ORDER BY p.nombre ASC
        "#, &[]).await;

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "usuariosSinTarea": usuarios_sin_tarea,
        "proyectosSinTarea": proyectos_sin_tarea,
    })))).into_response()
}

pub async fn planning_debug(
    _user: crate::auth::AuthUser,
) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "success": true,
        "engine": "rust-axum",
        "module": "planning",
        "timestamp": Utc::now().to_rfc3339(),
        "note": "endpoint de depuraciÃ³n temporal durante migraciÃ³n"
    }))
}

pub async fn planning_reassign(
    _user: crate::auth::AuthUser,
    Json(body): Json<PlanningReassignRequest>,
) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "success": true,
        "reassignment": {
            "idTarea": body.id_tarea,
            "idUsuarioOrigen": body.id_usuario_origen,
            "idUsuarioDestino": body.id_usuario_destino,
            "reason": body.reason,
            "status": "completed"
        }
    }))
}

// ----- MODELS -----

#[derive(Deserialize)]
pub struct PlanningPermissionRequest {
    #[serde(rename = "idTarea")]
    pub id_tarea: Option<u64>,
    #[serde(rename = "idUsuario")]
    pub id_usuario: Option<u64>,
    pub action: Option<String>,
}

#[derive(Deserialize)]
pub struct PlanningRequestChangeRequest {
    #[serde(rename = "idTarea")]
    pub id_tarea: u64,
    pub motivo: String,
    pub campo: Option<String>,
    #[serde(rename = "valorNuevo")]
    pub valor_nuevo: Option<serde_json::Value>,
}

#[derive(Deserialize)]
pub struct PlanningResolveRequest {
    #[serde(rename = "idSolicitud")]
    pub id_solicitud: Option<u64>,
    pub accion: String,
    pub comentario: Option<String>,
}

#[derive(Deserialize)]
pub struct PlanningCreatePlanRequest {
    pub nombre: String,
    pub descripcion: Option<String>,
}

#[derive(Deserialize)]
pub struct PlanningUpdateOperativeRequest {
    #[serde(rename = "idUsuario")]
    pub id_usuario: u64,
    pub disponible: bool,
}

#[derive(Deserialize)]
pub struct PlanningReassignRequest {
    #[serde(rename = "idTarea")]
    pub id_tarea: u64,
    #[serde(rename = "idUsuarioOrigen")]
    pub id_usuario_origen: u64,
    #[serde(rename = "idUsuarioDestino")]
    pub id_usuario_destino: u64,
    pub reason: Option<String>,
}

#[derive(Deserialize)]
pub struct PlanningTaskAvanceMensualRequest {
    pub year: u16,
    pub month: u8,
    pub progress: f32,
    pub comentario: Option<String>,
}

#[derive(Deserialize)]
pub struct PlanningCrearGrupoRequest {
    pub nombre: String,
    pub descripcion: Option<String>,
}

#[derive(Deserialize)]
pub struct PlanningAgregarFaseRequest {
    #[serde(rename = "idTareaNueva")]
    pub id_tarea_nueva: i32,
}

