#![allow(dead_code)]
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::state::ApiState;
use crate::auth::AuthUser;

pub async fn tareas_avance_mensual(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id_tarea): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    let items = crate::handlers::equipo::exec_sp_to_json(&mut client, "EXEC sp_Tarea_ObtenerAvanceMensual_rust @P1", &[&id_tarea]).await;
    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({ "idTarea": id_tarea, "items": items })))).into_response()
}

pub async fn tareas_save_avance_mensual(
    user: AuthUser,
    State(state): State<ApiState>,
    Path(id_tarea): Path<i32>,
    Json(body): Json<TareaAvanceMensualRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    let id_usuario = user.user_id_i32();
    let comentario = "".to_string();
    let d_progress = body.progress as f64;
    let d_year = body.year as i32;
    let d_month = body.month as i32;

    match client.execute(
        "EXEC sp_UpsertAvanceMensual_rust @P1, @P2, @P3, @P4, @P5, @P6",
        &[&id_tarea, &d_year, &d_month, &d_progress, &comentario, &id_usuario],
    ).await {
        Ok(_) => (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
            "saved": {
                "idTarea": id_tarea,
                "year": body.year,
                "month": body.month,
                "progress": body.progress
            }
        })))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    }
}

pub async fn tareas_masiva(
    State(state): State<ApiState>,
    user: AuthUser,
    Json(body): Json<TareaBulkCreateRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let id_creador = user.user_id_i32();
    let iter_targets = body.id_usuarios.clone();
    
    let base = body.tarea_base;
    let titulo = base.titulo;
    let descripcion = base.descripcion;
    let id_proyecto = base.id_proyecto.map(|v| v as i32);
    let prioridad = base.prioridad.unwrap_or_else(|| "Media".to_string());
    let esfuerzo = base.esfuerzo;
    let tipo = base.tipo.unwrap_or_else(|| "Administrativa".to_string());

    // Zero Inline SQL: Usar sp_Tarea_CreacionMasiva para evitar bucle SQL manual
    let ids_csv = iter_targets.iter().map(|id| id.to_string()).collect::<Vec<_>>().join(",");
    let fecha_ini = chrono::Utc::now(); // Default si no viene
    let fecha_obj = chrono::Utc::now();

    let _ = crate::handlers::equipo::exec_sp_to_json(
        &mut client, 
        "EXEC sp_Tarea_CreacionMasiva_rust @idUsuariosCSV=@P1, @titulo=@P2, @descripcion=@P3, @idProyecto=@P4, @prioridad=@P5, @esfuerzo=@P6, @tipo=@P7, @idCreador=@P8, @fechaInicio=@P9, @fechaObjetivo=@P10",
        &[&ids_csv, &titulo, &descripcion, &id_proyecto, &prioridad, &esfuerzo, &tipo, &id_creador, &fecha_ini, &fecha_obj]
    ).await;

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "created": iter_targets.len()
    })))).into_response()
}

pub async fn tareas_get(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    tracing::info!("[API] GET /tareas/{}", id);
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    let items = crate::handlers::equipo::exec_sp_to_json(&mut client, "EXEC sp_Tarea_ObtenerDetalle_rust @P1", &[&id]).await;
    
    if let Some(tarea) = items.first() {
        (StatusCode::OK, Json(crate::models::ApiResponse::success(tarea.clone()))).into_response()
    } else {
        (StatusCode::NOT_FOUND, Json(crate::models::ApiResponse::error("Tarea no encontrada".to_string(), 404))).into_response()
    }
}

pub async fn tareas_revalidar(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    Json(body): Json<TareaRevalidarRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    // Zero Inline SQL: Usar sp_Tarea_Revalidar
    let accion = body.accion.clone().unwrap_or_default();
    let id_otro = body.id_usuario_otro;

    let res = crate::handlers::equipo::exec_sp_to_json(
        &mut client, 
        "EXEC sp_Tarea_Revalidar_rust @P1, @P2, @P3", 
        &[&id, &accion, &id_otro]
    ).await;

    let nuevo_estado = res.first().and_then(|r| r.get("nuevoEstado").and_then(|v| v.as_str())).map(|s| s.to_string());

    // Roll-up logic (merged from orphan)
    let _ = client.query("EXEC sp_Tarea_RecalcularJerarquia_rust @P1, NULL", &[&id]).await;

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "idTarea": id,
        "nuevoEstado": nuevo_estado.unwrap_or_else(|| "Mismo".to_string())
    })))).into_response()
}

pub async fn tareas_participantes(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    Json(body): Json<TareaParticipantesRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    // Zero Inline SQL: Usar sp_Tarea_ActualizarParticipantes
    let participantes_csv = body.participantes.iter().map(|id| id.to_string()).collect::<Vec<_>>().join(",");
    
    let _ = crate::handlers::equipo::exec_sp_to_json(
        &mut client, 
        "EXEC sp_Tarea_ActualizarParticipantes_rust @P1, @P2", 
        &[&id, &participantes_csv]
    ).await;

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "idTarea": id
    })))).into_response()
}

pub async fn tareas_recordatorio(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    Json(body): Json<TareaRecordatorioRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    let msg = body.message.unwrap_or_else(|| "Recordatorio automÃ¡tico".to_string());
    
    let _ = crate::handlers::equipo::exec_sp_to_json(
        &mut client, 
        "EXEC sp_Tarea_UpsertRecordatorio_rust @P1, @P2", 
        &[&id, &msg]
    ).await;

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "idTarea": id
    })))).into_response()
}

pub async fn tareas_historico(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(carnet): Path<String>,
    query_params: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let dias: i32 = query_params
        .get("dias")
        .and_then(|v| v.parse().ok())
        .unwrap_or(30);

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let items = crate::handlers::equipo::exec_sp_to_json(&mut client, "EXEC sp_Tarea_ObtenerHistorico_rust @P1, @P2", &[&carnet, &dias]).await;
    (StatusCode::OK, Json(crate::models::ApiResponse::success(items))).into_response()
}

pub async fn tareas_delete(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    match client
        .execute(
            "EXEC sp_Tarea_Eliminar_rust @P1, '500708', 'EliminaciÃ³n desde Rust'",
            &[&id],
        )
        .await
    {
        Ok(_) => (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({ "deleted": id })))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    }
}

pub async fn tareas_descartar(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    Json(body): Json<TareaSimpleActionRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let motivo = body.comment.unwrap_or_else(|| "Descarte manual".to_string());
    let carnet = user.carnet().to_string(); 

    match client.execute(
        "EXEC sp_Tarea_DescartarConSubtareas_rust @P1, @P2, @P3",
        &[&id, &carnet, &motivo],
    ).await {
        Ok(_) => Json(serde_json::json!({"success": true, "idTarea": id, "action": "descartar", "comment": motivo})).into_response(),
        Err(e) => Json(serde_json::json!({"error": e.to_string()})).into_response(),
    }
}

pub async fn tareas_mover(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    Json(body): Json<TareaMoverRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let id_proy = body.id_proyecto_destino as i32;
    // TODO: real ejecutor ID
    let id_ejecutor = 1i32; 
    let mover_sub = true;

    match client.execute(
        "EXEC sp_Tarea_MoverAProyecto_rust @P1, @P2, @P3, @P4",
        &[&id, &id_proy, &id_ejecutor, &mover_sub],
    ).await {
        Ok(_) => Json(serde_json::json!({"success": true, "idTarea": id, "idProyectoDestino": body.id_proyecto_destino})).into_response(),
        Err(e) => Json(serde_json::json!({"error": e.to_string()})).into_response(),
    }
}

pub async fn tareas_avance(
    user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    Json(body): Json<TareaAvanceRequest>,
) -> impl IntoResponse {
    let carnet = user.carnet();
    let id_usuario = user.user_id_i32();
    
    tracing::info!(
        "[API] POST /tareas/{}/avance - User: {} ({}) - Payload: porcentaje={}, comentario={:?}",
        id, id_usuario, carnet, body.porcentaje, body.comentario
    );

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    let id_usuario = user.user_id_i32();
    let p_float = body.porcentaje;
    let p_int = p_float as i32;
    let com = body.comentario.unwrap_or_default();
    let es_completa = p_float >= 100.0;
    
    // Zero Inline SQL: Usar sp_Tarea_GestionarAvance (AtÃ³mico)
    let _ = crate::handlers::equipo::exec_sp_to_json(
        &mut client, 
        "EXEC sp_Tarea_GestionarAvance_rust @idTarea=@P1, @idUsuario=@P2, @progreso=@P3, @comentario=@P4, @esCompleta=@P5",
        &[&id, &id_usuario, &p_float, &com, &es_completa]
    ).await;

    // Roll-up (Sincronizar con SP si es posible, o llamar aquÃ­)
    let _ = client.query("EXEC sp_Tarea_RecalcularJerarquia_rust @P1, NULL", &[&id]).await;

    // TODO: Disparar notificaciones si el usuario no es el responsable (Requiere fetch previo del responsable)

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({"idTarea": id, "progreso": p_int})))).into_response()
}

pub async fn tareas_delete_avance(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id_log): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    // Zero Inline SQL: Usar sp_Tarea_EliminarAvance
    let _ = crate::handlers::equipo::exec_sp_to_json(&mut client, "EXEC sp_Tarea_EliminarAvance_rust @P1", &[&id_log]).await;
    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({"deletedAvance": id_log})))).into_response()
}

pub async fn tareas_solicitud_cambio(
    State(state): State<ApiState>,
    user: AuthUser,
    Json(body): Json<TareaSolicitudCambioRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let id_usuario_solicitante = user.user_id_i32();

    let id_tarea = body.id_tarea as i32;
    let motivo = body.motivo.unwrap_or_else(|| "".to_string());
    let campo = body.campo;
    let valor_ant = "0".to_string(); // Idealmente se consultarÃ­a el valor anterior
    let valor_nuevo = body.valor_nuevo;

    // Zero Inline SQL: Usar sp_SolicitudCambio_Crear
    let res = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_SolicitudCambio_Crear_rust @idTarea=@P1, @idUsuarioSolicitante=@P2, @campo=@P3, @valorAnterior=@P4, @valorNuevo=@P5, @motivo=@P6",
        &[&id_tarea, &id_usuario_solicitante, &campo, &valor_ant, &valor_nuevo, &motivo],
    ).await;

    if let Some(result) = res.first() {
        Json(serde_json::json!({
            "success": true,
            "request": result
        })).into_response()
    } else {
        Json(serde_json::json!({"error": "Failed to create change request" })).into_response()
    }
}

pub async fn tareas_solicitud_cambio_pendientes(
    _user: AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    // Zero Inline SQL: Usar sp_SolicitudCambio_ObtenerPendientes
    let items = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_SolicitudCambio_ObtenerPendientes_rust",
        &[],
    ).await;
    
    Json(serde_json::json!({"success": true, "items": items})).into_response()
}

pub async fn tareas_solicitud_cambio_resolver(
    State(state): State<ApiState>,
    user: AuthUser,
    Path(id): Path<i32>,
    Json(body): Json<TareaResolverSolicitudRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let id_usuario_resolutor = user.user_id_i32();
    let estado = if body.approved { "Aprobado" } else { "Rechazado" };
    let comentario = body.comment.unwrap_or_else(|| estado.to_string());

    // Zero Inline SQL: Usar sp_SolicitudCambio_Resolver
    let res = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_SolicitudCambio_Resolver_rust @idSolicitud=@P1, @estado=@P2, @idUsuarioResolutor=@P3, @comentarioResolucion=@P4",
        &[&id, &estado, &id_usuario_resolutor, &comentario],
    ).await;

    if let Some(result) = res.first() {
        Json(serde_json::json!({
            "success": true,
            "resolved": result
        })).into_response()
    } else {
        Json(serde_json::json!({"error": "Failed to resolve change request" })).into_response()
    }
}

pub async fn tareas_set_recurrencia(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    Json(body): Json<TareaRecurrenciaRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    // TODO: real User ID
    let id_creador = 1i32;

    // Map `frecuencia` to 'SEMANAL' or 'MENSUAL' based on the request
    let tipo_recurrencia = match body.frecuencia.to_uppercase().as_str() {
        "MENSUAL" => "MENSUAL",
        _ => "SEMANAL", // Default to weekly if invalid
    };

    // Using defaults if not provided in request struct. Assuming basic request structure.
    let dias_semana: Option<String> = if tipo_recurrencia == "SEMANAL" { Some("1,2,3,4,5".to_string()) } else { None };
    let dia_mes: Option<i32> = if tipo_recurrencia == "MENSUAL" { Some(1) } else { None };
    let fecha_inicio = chrono::Utc::now().naive_utc().date();
    let fecha_fin: Option<chrono::NaiveDate> = None;

    match client.execute(
        "EXEC sp_Recurrencia_Crear_rust @P1, @P2, @P3, @P4, @P5, @P6, @P7",
        &[&id, &tipo_recurrencia, &dias_semana, &dia_mes, &fecha_inicio, &fecha_fin, &id_creador],
    ).await {
        Ok(_) => Json(serde_json::json!({
            "success": true,
            "idTarea": id,
            "recurrencia": {"frecuencia": body.frecuencia, "intervalo": body.intervalo}
        })).into_response(),
        Err(e) => Json(serde_json::json!({"error": e.to_string()})).into_response(),
    }
}

pub async fn tareas_get_recurrencia(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let res = match client.query("EXEC sp_Recurrencia_ObtenerPorTarea_rust @P1", &[&id]).await {
        Ok(s) => match s.into_first_result().await {
            Ok(rows) => {
                if let Some(r) = rows.into_iter().next() {
                    Json(serde_json::json!({
                        "success": true,
                        "idTarea": id,
                        "recurrencia": {
                            "frecuencia": r.get::<&str, _>("tipoRecurrencia").unwrap_or("semanal").to_lowercase(),
                            "intervalo": 1, // Defaulting if not in DB
                            "diasSemana": r.get::<&str, _>("diasSemana"),
                            "diaMes": r.get::<i32, _>("diaMes"),
                        }
                    })).into_response()
                } else {
                    Json(serde_json::json!({"success": false, "message": "No recurrence found"})).into_response()
                }
            }
            Err(e) => Json(serde_json::json!({"error": e.to_string()})).into_response(),
        },
        Err(e) => Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };
    res
}

pub async fn tareas_crear_instancia(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let fecha_prog = chrono::Utc::now().naive_utc().date();
    let estado = "PENDIENTE";

    let res = match client.query(
        "EXEC sp_Instancia_Upsert_rust @P1, NULL, @P2, @P3, NULL, NULL, NULL",
        &[&id, &fecha_prog, &estado],
    ).await {
        Ok(s) => match s.into_first_result().await {
            Ok(rows) => {
                let id_inst = rows.into_iter().next().and_then(|r| r.get::<i32, _>("id")).unwrap_or(0);
                Json(serde_json::json!({"success": true, "idTarea": id, "idInstancia": id_inst})).into_response()
            }
            Err(e) => Json(serde_json::json!({"error": e.to_string()})).into_response(),
        },
        Err(e) => Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };
    res
}

pub async fn tareas_list_instancias(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let limit = 30i32;

    let res = match client.query(
        "SELECT TOP (@P2) id as idInstancia, estadoInstancia as estado, fechaProgramada, fechaEjecucion, fechaReprogramada, comentario \
         FROM p_TareaInstancia WHERE idTarea = @P1 ORDER BY fechaProgramada DESC",
        &[&id, &limit],
    ).await {
        Ok(s) => match s.into_first_result().await {
            Ok(rows) => {
                let items: Vec<serde_json::Value> = rows.into_iter().map(|r| {
                    serde_json::json!({
                        "idInstancia": r.get::<i32, _>("idInstancia").unwrap_or(0),
                        "estado": r.get::<&str, _>("estado").unwrap_or(""),
                        "fechaProgramada": r.get::<chrono::NaiveDate, _>("fechaProgramada"),
                        "fechaEjecucion": r.get::<chrono::NaiveDateTime, _>("fechaEjecucion"),
                        "fechaReprogramada": r.get::<chrono::NaiveDate, _>("fechaReprogramada"),
                        "comentario": r.get::<&str, _>("comentario"),
                    })
                }).collect();
                Json(serde_json::json!({"success": true, "idTarea": id, "instancias": items})).into_response()
            }
            Err(_) => Json(serde_json::json!({"success": true, "idTarea": id, "instancias": []})).into_response(),
        },
        Err(e) => Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };
    res
}

pub async fn asignaciones_create(
    _user: AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<AsignacionRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    let _ = client.query(
        "EXEC sp_Tarea_AsignarResponsable_rust @P1, @P2, @P3, 0", 
        &[&body.id_tarea, &body.carnet, &body.tipo]
    ).await;

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "success": true,
        "message": "Usuario asignado"
    })))).into_response()
}

pub async fn tareas_bloqueos(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    let mut bloqueos = Vec::new();
    if let Ok(st) = client.query("SELECT * FROM p_Bloqueos WHERE idTareaAfectada=@P1 ORDER BY fechaCreacion DESC", &[&id]).await {
        if let Ok(rows) = st.into_first_result().await {
            bloqueos = rows.iter().map(crate::handlers::equipo::row_to_json).collect();
        }
    }

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!(bloqueos)))).into_response()
}

// ----- MODELS -----

#[derive(Deserialize)]
pub struct TareaAvanceMensualRequest {
    pub year: u16,
    pub month: u8,
    pub progress: f32,
}

#[derive(Deserialize)]
pub struct TareaBulkCreateRequest {
    #[serde(rename = "tareaBase")]
    pub tarea_base: TareaBaseDto,
    #[serde(rename = "idUsuarios")]
    pub id_usuarios: Vec<i32>,
}

#[derive(Deserialize, Clone)]
pub struct TareaBaseDto {
    pub titulo: String,
    pub descripcion: Option<String>,
    #[serde(rename = "idProyecto")]
    pub id_proyecto: Option<u64>,
    pub prioridad: Option<String>,
    pub esfuerzo: Option<String>,
    pub tipo: Option<String>,
}

#[derive(Deserialize)]
pub struct TareaSimpleActionRequest {
    pub comment: Option<String>,
}

#[derive(Deserialize)]
pub struct AsignacionRequest {
    #[serde(rename = "idTarea")]
    pub id_tarea: i32,
    pub carnet: String,
    pub tipo: String,
}

#[derive(Deserialize)]
pub struct TareaRevalidarRequest {
    pub accion: Option<String>,
    #[serde(rename = "idUsuarioOtro")]
    pub id_usuario_otro: Option<i32>,
    pub razon: Option<String>,
}

#[derive(Deserialize)]
pub struct TareaParticipantesRequest {
    pub participantes: Vec<u64>,
}

#[derive(Deserialize)]
pub struct TareaRecordatorioRequest {
    pub message: Option<String>,
}

#[derive(Deserialize)]
pub struct TareaMoverRequest {
    #[serde(rename = "idProyectoDestino")]
    pub id_proyecto_destino: u64,
}

#[derive(Deserialize, Debug)]
pub struct TareaAvanceRequest {
    #[serde(alias = "progreso")]
    pub porcentaje: f32,
    pub comentario: Option<String>,
}

#[derive(Deserialize)]
pub struct TareaSolicitudCambioRequest {
    #[serde(rename = "idTarea")]
    pub id_tarea: u64,
    pub campo: String,
    #[serde(rename = "valorNuevo")]
    pub valor_nuevo: String,
    pub motivo: Option<String>,
}

#[derive(Deserialize)]
pub struct TareaResolverSolicitudRequest {
    pub approved: bool,
    pub comment: Option<String>,
}

#[derive(Deserialize)]
pub struct TareaRecurrenciaRequest {
    pub frecuencia: String,
    pub intervalo: u16,
}

// ==========================================
// CREAR TAREA RAPIDA (POST /tareas/rapida)
// ==========================================

#[derive(Deserialize)]
pub struct TareaCrearRapidaRequest {
    pub titulo: Option<String>,
    #[serde(rename = "idUsuario")]
    pub id_usuario: Option<i32>,
    #[serde(rename = "idProyecto")]
    pub id_proyecto: Option<i32>,
    pub descripcion: Option<String>,
    pub prioridad: Option<String>,
    pub esfuerzo: Option<String>,
    pub tipo: Option<String>,
    #[serde(rename = "fechaInicioPlanificada")]
    pub fecha_inicio_planificada: Option<String>,
    #[serde(rename = "fechaObjetivo")]
    pub fecha_objetivo: Option<String>,
    pub comportamiento: Option<String>,
    #[serde(rename = "idResponsable")]
    pub id_responsable: Option<i32>,
    #[serde(rename = "idTareaPadre")]
    pub id_tarea_padre: Option<i32>,
    pub coasignados: Option<Vec<i32>>,
}

pub async fn tareas_crear_rapida(
    user: AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<TareaCrearRapidaRequest>,
) -> impl IntoResponse {
    let titulo = body.titulo.unwrap_or_else(|| "Sin tÃ­tulo".to_string());
    let id_creador = body.id_usuario.unwrap_or(user.user_id_i32());
    let id_responsable = body.id_responsable.unwrap_or(id_creador);

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    // Ejecutar SP sp_Tarea_CrearCompleta_v2 â€” mismo que NestJS
    let sql = r#"
        EXEC sp_Tarea_CrearCompleta_rust 
            @nombre = @P1,
            @idUsuario = @P2,
            @idProyecto = @P3,
            @descripcion = @P4,
            @estado = @P5,
            @prioridad = @P6,
            @esfuerzo = @P7,
            @tipo = @P8,
            @fechaInicioPlanificada = @P9,
            @fechaObjetivo = @P10,
            @porcentaje = @P11,
            @orden = @P12,
            @comportamiento = @P13,
            @idTareaPadre = @P14,
            @idResponsable = @P15,
            @requiereEvidencia = @P16,
            @idEntregable = @P17,
            @semana = @P18
    "#;

    let estado = "Pendiente".to_string();
    let prioridad = body.prioridad.unwrap_or_else(|| "Media".to_string());
    let esfuerzo = body.esfuerzo.unwrap_or_else(|| "".to_string());
    let tipo = body.tipo.unwrap_or_else(|| "Administrativa".to_string());
    let descripcion = body.descripcion.unwrap_or_default();
    let comportamiento = body.comportamiento.unwrap_or_default();
    
    let now = chrono::Utc::now().naive_utc();
    let fecha_inicio: chrono::NaiveDateTime = body.fecha_inicio_planificada
        .as_ref()
        .and_then(|s| chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok())
        .map(|d| d.and_hms_opt(0, 0, 0).unwrap())
        .unwrap_or(now);
    let fecha_objetivo: chrono::NaiveDateTime = body.fecha_objetivo
        .as_ref()
        .and_then(|s| chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok())
        .map(|d| d.and_hms_opt(0, 0, 0).unwrap())
        .unwrap_or(now);

    let porcentaje: i32 = 0;
    let orden: i32 = 0;
    let req_evidencia: bool = false;
    let entregable: Option<i32> = None;
    let semana: Option<i32> = None;
    let mut id_tarea_opt = None;
    if let Ok(stream) = client.query(
        sql,
        &[
            &titulo as &dyn tiberius::ToSql,
            &id_creador,
            &body.id_proyecto,
            &descripcion,
            &estado,
            &prioridad,
            &esfuerzo,
            &tipo,
            &fecha_inicio,
            &fecha_objetivo,
            &porcentaje,
            &orden,
            &comportamiento,
            &body.id_tarea_padre,
            &id_responsable,
            &req_evidencia,
            &entregable,
            &semana,
        ],
    ).await {
        if let Ok(rows) = stream.into_first_result().await {
            if let Some(row) = rows.first() {
                id_tarea_opt = Some(row.try_get::<i32, _>("idTarea").ok().flatten().unwrap_or(0));
            }
        }
    }

    if let Some(id_tarea) = id_tarea_opt {
        // Hacer un query adicional para traer la tarea completa
        let query_result = client.query("EXEC sp_Tareas_ObtenerPorId_rust @P1", &[&id_tarea]).await;
        if let Ok(st) = query_result {
            if let Ok(task_rows) = st.into_first_result().await {
                if let Some(tr) = task_rows.first() {
                    let mut json_tarea = crate::handlers::equipo::row_to_json(tr);
                    
                    if let Some(obj) = json_tarea.as_object_mut() {
                        obj.insert("message".to_string(), serde_json::json!("Tarea creada exitosamente"));
                    }
                    return (StatusCode::CREATED, Json(crate::models::ApiResponse::success(json_tarea))).into_response();
                }
            }
        }

        // Fallback si falla
        (StatusCode::CREATED, Json(crate::models::ApiResponse::success(serde_json::json!({
            "idTarea": id_tarea,
            "titulo": titulo,
            "estado": "Pendiente",
            "message": "Tarea creada exitosamente (fallback)"
        })))).into_response()
    } else {
        (StatusCode::CREATED, Json(crate::models::ApiResponse::success(serde_json::json!({
            "message": "Tarea creada (sin ID retornado o fallida)"
        })))).into_response()
    }
}

// ==========================================
// TAREAS MIAS (GET /tareas/mias y /tasks/me)
// ==========================================
pub async fn tareas_mias(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    query_params: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let carnet = query_params.get("carnet").cloned().unwrap_or_else(|| user.carnet().to_string());
    let estado = query_params.get("estado").map(|s| s.as_str());
    let _id_proyecto = query_params.get("idProyecto").and_then(|s| s.parse::<i32>().ok()).map(|i| i as i64); 
    // SP expects int, tokio expects matching types. SQL Server int maps to i32 in rust tiberius.
    let id_proyecto_i32 = query_params.get("idProyecto").and_then(|s| s.parse::<i32>().ok());
    let query_text = query_params.get("query").map(|s| s.as_str());
    let start_date = query_params.get("startDate").map(|s| s.as_str());
    let end_date = query_params.get("endDate").map(|s| s.as_str());

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let params: Vec<&dyn tiberius::ToSql> = vec![
        &carnet,
        &estado,
        &id_proyecto_i32,
        &query_text,
        &start_date,
        &end_date,
    ];

    let mut tareas = crate::handlers::equipo::exec_sp_to_json(&mut client, "EXEC sp_Tareas_ObtenerPorUsuario_rust @P1, @P2, @P3, @P4, @P5, @P6", &params).await;

    // Post-procesamiento similar a NestJS:
    // Si la tarea tiene responsable y no es el usuario actual, agregar sufijo
    for t in tareas.iter_mut() {
        if let Some(obj) = t.as_object_mut() {
            let resp_carnet = obj.get("responsableCarnet").and_then(|v| v.as_str()).unwrap_or("").trim();
            if !resp_carnet.is_empty() && resp_carnet != carnet.trim() {
                let current_title = obj.get("titulo").or(obj.get("nombre")).and_then(|v| v.as_str()).unwrap_or("Sin TÃ­tulo").to_string();
                let resp_nombre = obj.get("responsableNombre").and_then(|v| v.as_str()).unwrap_or("Otro");
                let short_name = resp_nombre.split(' ').take(2).collect::<Vec<_>>().join(" ");
                let new_title = format!("{} (Asig: {})", current_title, short_name);
                
                obj.insert("titulo".to_string(), serde_json::json!(new_title.clone()));
                obj.insert("nombre".to_string(), serde_json::json!(new_title));
            } else if let Some(tit) = obj.get("titulo").cloned() {
                // Asegurar que nombre = titulo para compatibilidad
                obj.insert("nombre".to_string(), tit);
            }
        }
    }

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!(tareas)))).into_response()
}

// ==========================================
// TAREAS UPDATE (PATCH /tareas/:id y /tasks/:id)
// ==========================================
#[derive(Deserialize, Serialize, Default, Debug)]
pub struct TareasUpdateRequest {
    pub titulo: Option<String>,
    pub nombre: Option<String>,
    pub descripcion: Option<String>,
    pub estado: Option<String>,
    pub prioridad: Option<String>,
    #[serde(alias = "progreso")]
    pub porcentaje: Option<u8>,
    #[serde(rename = "fechaObjetivo")]
    pub fecha_objetivo: Option<String>,
    #[serde(rename = "fechaInicioPlanificada")]
    pub fecha_inicio_planificada: Option<String>,
    #[serde(rename = "linkEvidencia")]
    pub link_evidencia: Option<String>,
    #[serde(rename = "idTareaPadre")]
    pub id_tarea_padre: Option<i32>,
    pub tipo: Option<String>,
    pub esfuerzo: Option<String>,
    pub comportamiento: Option<String>,
    #[serde(rename = "idResponsable")]
    pub id_responsable: Option<i32>,
    #[serde(rename = "idProyecto")]
    pub id_proyecto: Option<u64>,
}

pub async fn tareas_update(
    user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    Json(body): Json<TareasUpdateRequest>,
) -> impl IntoResponse {
    let carnet = user.carnet();
    let id_usuario = user.user_id_i32();

    tracing::info!(
        "[API] PATCH /tareas/{} - User: {} ({}) - Body: {}",
        id, id_usuario, carnet, serde_json::to_string(&body).unwrap_or_default()
    );

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    // 1. Check if update requires approval (Approval Flow Bypass Prevention)
    let current_task_rows = crate::handlers::equipo::exec_sp_to_json(&mut client, "EXEC sp_Tareas_ObtenerPorId_rust @P1", &[&id]).await;
    if let Some(task) = current_task_rows.first() {
        let is_estrategica = task.get("tipo").and_then(|v| v.as_str()).unwrap_or("") == "EstratÃ©gica";
        let es_proyecto = task.get("idProyecto").and_then(|v| v.as_i64()).unwrap_or(0) > 0;
        
        // Campos sensibles: Fecha, TÃ­tulo, Responsable, Esfuerzo
        let sensitive_change = body.fecha_objetivo.is_some() || body.titulo.is_some() || body.nombre.is_some() || body.id_responsable.is_some() || body.esfuerzo.is_some();
        
        // Si es estratÃ©gica o de proyecto y hay cambio sensible -> 202 (Accepted but needs approval flow in front)
        if (is_estrategica || es_proyecto) && sensitive_change {
            return (StatusCode::ACCEPTED, Json(crate::models::ApiResponse::error("Esta tarea requiere aprobaciÃ³n para cambios sensibles".to_string(), 202))).into_response();
        }
    }

    // 2. Procede con el Update si pasÃ³ la validaciÃ³n
    let _ = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Tarea_Actualizar_rust @idTarea=@P1, @titulo=@P2, @descripcion=@P3, @estado=@P4, @prioridad=@P5, @progreso=@P6, @idProyecto=@P7, @idResponsable=@P8, @fechaObjetivo=@P9, @fechaInicioPlanificada=@P10, @linkEvidencia=@P11, @idTareaPadre=@P12, @tipo=@P13, @esfuerzo=@P14, @comportamiento=@P15",
        &[
            &id, 
            &body.titulo.clone().or(body.nombre.clone()), 
            &body.descripcion, 
            &body.estado, 
            &body.prioridad, 
            &body.porcentaje.map(|v| v as i32), 
            &body.id_proyecto.map(|v| v as i32),
            &body.id_responsable,
            &body.fecha_objetivo,
            &body.fecha_inicio_planificada,
            &body.link_evidencia,
            &body.id_tarea_padre,
            &body.tipo,
            &body.esfuerzo,
            &body.comportamiento,
        ]
    ).await;

    // Log de AuditorÃ­a
    let _ = client.execute("INSERT INTO p_Logs (idUsuario, accion, entidad, datos, fecha) VALUES (@P1, 'UPDATE', 'Tareas', @P2, GETDATE())", 
        &[&user.user_id_i32(), &serde_json::to_string(&body).unwrap_or_default()]).await;

    // Recalcular JerarquÃ­a
    if body.estado.is_some() || body.porcentaje.is_some() || body.id_tarea_padre.is_some() {
        let pid = body.id_tarea_padre.unwrap_or(0);
        let _ = client.query("EXEC sp_Tarea_RecalcularJerarquia_rust @P1, @P2", &[&id, &if pid > 0 { Some(pid) } else { None }]).await;
    }

    match client.query("EXEC sp_Tareas_ObtenerPorId_rust @P1", &[&id]).await {
        Ok(st) => {
            if let Ok(task_rows) = st.into_first_result().await {
                if let Some(tr) = task_rows.first() {
                    let mut json_tarea = crate::handlers::equipo::row_to_json(tr);
                    if let Some(obj) = json_tarea.as_object_mut() {
                        obj.insert("message".to_string(), serde_json::json!("Tarea actualizada exitosamente"));
                    }
                    return (StatusCode::OK, Json(crate::models::ApiResponse::success(json_tarea))).into_response();
                }
            }
        }
        Err(_) => {}
    }

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "idTarea": id,
        "message": "Tarea actualizada (fallback sin objeto)"
    })))).into_response()
}

