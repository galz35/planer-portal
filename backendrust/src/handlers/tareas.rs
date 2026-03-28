#![allow(dead_code)]
use axum::{
    extract::{OriginalUri, Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::auth::AuthUser;
use crate::state::ApiState;

type SqlConnection<'a> = bb8::PooledConnection<'a, bb8_tiberius::ConnectionManager>;

async fn load_tarea_detalle(client: &mut SqlConnection<'_>, id: i32) -> Option<serde_json::Value> {
    let items = crate::handlers::equipo::exec_sp_to_json(
        client,
        "EXEC sp_Tarea_ObtenerDetalle_rust @P1",
        &[&id],
    )
    .await;
    let mut tarea = items.first().cloned()?;

    if let Some(obj) = tarea.as_object_mut() {
        let nombre = obj
            .get("creadorNombre")
            .cloned()
            .unwrap_or(serde_json::Value::Null);
        let correo = obj
            .get("creadorCorreo")
            .cloned()
            .unwrap_or(serde_json::Value::Null);
        obj.insert(
            "creador".to_string(),
            serde_json::json!({
                "nombre": nombre,
                "correo": correo
            }),
        );

        let subtareas = crate::handlers::equipo::exec_query_to_json(
            client,
            "SELECT idTarea, nombre as titulo, estado, prioridad, porcentaje as progreso FROM p_Tareas WHERE idTareaPadre = @P1 AND activo = 1 ORDER BY orden ASC",
            &[&id],
        ).await;
        obj.insert("subtareas".to_string(), serde_json::json!(subtareas));

        let avances_raw = crate::handlers::equipo::exec_query_to_json(
            client,
            "SELECT a.idLog, a.idTarea, a.idUsuario, a.progreso, a.comentario, a.fecha, u.nombre as usuarioNombre \
             FROM p_TareaAvances a \
             LEFT JOIN p_Usuarios u ON a.idUsuario = u.idUsuario \
             WHERE a.idTarea = @P1 \
             ORDER BY a.fecha DESC",
            &[&id],
        ).await;

        let avances: Vec<serde_json::Value> = avances_raw
            .into_iter()
            .map(|a| {
                let mut val = a.clone();
                if let Some(avance) = val.as_object_mut() {
                    if !avance.contains_key("usuarioNombre") {
                        avance.insert("usuarioNombre".to_string(), serde_json::json!("Usuario"));
                    }
                }
                val
            })
            .collect();
        obj.insert("avances".to_string(), serde_json::json!(avances));

        let asignados_raw = crate::handlers::equipo::exec_query_to_json(
            client,
            "SELECT ta.id, ta.idTarea, ta.idUsuario, ta.tipo, ta.carnet, u.nombreCompleto as usuarioNombre, u.cargo as usuarioCargo \
             FROM p_TareaAsignados ta LEFT JOIN p_Usuarios u ON ta.idUsuario = u.idUsuario \
             WHERE ta.idTarea = @P1 AND ta.tipo = 'Colaborador'",
            &[&id],
        ).await;

        let asignados: Vec<serde_json::Value> = asignados_raw
            .into_iter()
            .map(|a| {
                serde_json::json!({
                    "idAsignacion": a.get("id"),
                    "idTarea": a.get("idTarea"),
                    "idUsuario": a.get("idUsuario"),
                    "tipo": a.get("tipo"),
                    "usuario": {
                        "idUsuario": a.get("idUsuario"),
                        "nombreCompleto": a.get("usuarioNombre"),
                        "carnet": a.get("carnet"),
                        "cargo": a.get("usuarioCargo")
                    }
                })
            })
            .collect();
        obj.insert("asignados".to_string(), serde_json::json!(asignados));

        if !obj.contains_key("titulo") {
            if let Some(nombre) = obj.get("nombre").cloned() {
                obj.insert("titulo".to_string(), nombre);
            }
        }
        if !obj.contains_key("nombre") {
            if let Some(titulo) = obj.get("titulo").cloned() {
                obj.insert("nombre".to_string(), titulo);
            }
        }
        if !obj.contains_key("progreso") {
            if let Some(porcentaje) = obj.get("porcentaje").cloned() {
                obj.insert("progreso".to_string(), porcentaje);
            }
        }
    }

    Some(tarea)
}

fn is_admin_role_name(role: &str) -> bool {
    matches!(role.trim(), "Admin" | "Administrador" | "SuperAdmin")
}

pub async fn tareas_avance_mensual(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id_tarea): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    };

    let query = r#"
        SELECT
            anio as [year],
            mes as [month],
            CAST(porcentajeMes AS FLOAT) as [progress],
            comentario,
            CAST(SUM(porcentajeMes) OVER (ORDER BY anio, mes) AS FLOAT) as [acumulado]
        FROM p_TareaAvanceMensual
        WHERE idTarea = @P1
        ORDER BY anio, mes
    "#;

    let mut historial = vec![];
    let mut acumulado_total = 0.0;

    if let Ok(stream) = client.query(query, &[&id_tarea]).await {
        if let Ok(rows) = stream.into_first_result().await {
            for r in rows {
                let prog_acum = r
                    .try_get::<f64, _>("acumulado")
                    .ok()
                    .flatten()
                    .unwrap_or(0.0);
                acumulado_total = prog_acum;
                historial.push(serde_json::json!({
                    "year": r.try_get::<i32, _>("year").ok().flatten().unwrap_or(0),
                    "month": r.try_get::<i32, _>("month").ok().flatten().unwrap_or(0),
                    "progress": r.try_get::<f64, _>("progress").ok().flatten().unwrap_or(0.0),
                    "comentario": r.try_get::<&str, _>("comentario").ok().flatten().unwrap_or(""),
                    "acumulado": prog_acum
                }));
            }
        }
    }

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "historial": historial,
            "acumulado": acumulado_total
        }))),
    )
        .into_response()
}

pub async fn tareas_save_avance_mensual(
    user: AuthUser,
    State(state): State<ApiState>,
    Path(id_tarea): Path<i32>,
    Json(body): Json<TareaAvanceMensualRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    };

    let id_usuario = user.user_id_i32();
    let comentario = body.comentario.clone().unwrap_or_default();
    let d_progress = body.progress as f64;
    let d_year = body.year as i32;
    let d_month = body.month as i32;

    if let Err(e) = client
        .execute(
            "EXEC sp_UpsertAvanceMensual_rust @P1, @P2, @P3, @P4, @P5, @P6",
            &[
                &id_tarea,
                &d_year,
                &d_month,
                &d_progress,
                &comentario,
                &id_usuario,
            ],
        )
        .await
    {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(crate::models::ApiResponse::error(e.to_string(), 500)),
        )
            .into_response();
    }

    // Retornar el historial actualizado directamente para que el frontend lo refresque
    let query = r#"
        SELECT
            anio as [year],
            mes as [month],
            CAST(porcentajeMes AS FLOAT) as [progress],
            comentario,
            CAST(SUM(porcentajeMes) OVER (ORDER BY anio, mes) AS FLOAT) as [acumulado]
        FROM p_TareaAvanceMensual
        WHERE idTarea = @P1
        ORDER BY anio, mes
    "#;

    let mut historial = vec![];
    let mut acumulado_total = 0.0;

    if let Ok(stream) = client.query(query, &[&id_tarea]).await {
        if let Ok(rows) = stream.into_first_result().await {
            for r in rows {
                let prog_acum = r
                    .try_get::<f64, _>("acumulado")
                    .ok()
                    .flatten()
                    .unwrap_or(0.0);
                acumulado_total = prog_acum;
                historial.push(serde_json::json!({
                    "year": r.try_get::<i32, _>("year").ok().flatten().unwrap_or(0),
                    "month": r.try_get::<i32, _>("month").ok().flatten().unwrap_or(0),
                    "progress": r.try_get::<f64, _>("progress").ok().flatten().unwrap_or(0.0),
                    "comentario": r.try_get::<&str, _>("comentario").ok().flatten().unwrap_or(""),
                    "acumulado": prog_acum
                }));
            }
        }
    }

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "historial": historial,
            "acumulado": acumulado_total
        }))),
    )
        .into_response()
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
    let ids_csv = iter_targets
        .iter()
        .map(|id| id.to_string())
        .collect::<Vec<_>>()
        .join(",");
    let fecha_ini = chrono::Utc::now(); // Default si no viene
    let fecha_obj = chrono::Utc::now();

    if let Err(e) = crate::handlers::equipo::exec_sp_to_json_result(
        &mut client,
        "EXEC sp_Tarea_CreacionMasiva_rust @idUsuariosCSV=@P1, @titulo=@P2, @descripcion=@P3, @idProyecto=@P4, @prioridad=@P5, @esfuerzo=@P6, @tipo=@P7, @idCreador=@P8, @fechaInicio=@P9, @fechaObjetivo=@P10",
        &[&ids_csv, &titulo, &descripcion, &id_proyecto, &prioridad, &esfuerzo, &tipo, &id_creador, &fecha_ini, &fecha_obj]
    ).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(crate::models::ApiResponse::error(e, 500)),
        )
            .into_response();
    }

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "created": iter_targets.len()
        }))),
    )
        .into_response()
}

pub async fn tareas_get(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    tracing::info!("[API] GET /tareas/{}", id);
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    };

    match load_tarea_detalle(&mut client, id).await {
        Some(tarea) => (
            StatusCode::OK,
            Json(crate::models::ApiResponse::success(tarea)),
        )
            .into_response(),
        None => (
            StatusCode::NOT_FOUND,
            Json(crate::models::ApiResponse::error(
                "Tarea no encontrada".to_string(),
                404,
            )),
        )
            .into_response(),
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
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    };

    // Zero Inline SQL: Usar sp_Tarea_Revalidar
    let accion = body.accion.clone().unwrap_or_default();
    let id_otro = body.id_usuario_otro;

    let res = match crate::handlers::equipo::exec_sp_to_json_result(
        &mut client,
        "EXEC sp_Tarea_Revalidar_rust @P1, @P2, @P3",
        &[&id, &accion, &id_otro],
    )
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e, 500)),
            )
                .into_response();
        }
    };

    let nuevo_estado = res
        .first()
        .and_then(|r| r.get("nuevoEstado").and_then(|v| v.as_str()))
        .map(|s| s.to_string());

    if let Err(e) = client
        .query("EXEC sp_Tarea_RecalcularJerarquia_rust @P1, NULL", &[&id])
        .await
    {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(crate::models::ApiResponse::error(e.to_string(), 500)),
        )
            .into_response();
    }

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "idTarea": id,
            "nuevoEstado": nuevo_estado.unwrap_or_else(|| "Mismo".to_string())
        }))),
    )
        .into_response()
}

pub async fn tareas_participantes(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    Json(body): Json<TareaParticipantesRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    };

    let participantes_csv = body
        .participantes
        .iter()
        .map(|id| id.to_string())
        .collect::<Vec<_>>()
        .join(",");

    let _ = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Tarea_ActualizarParticipantes_rust @P1, @P2",
        &[&id, &participantes_csv],
    )
    .await;

    if let Some(tarea) = load_tarea_detalle(&mut client, id).await {
        (
            StatusCode::OK,
            Json(crate::models::ApiResponse::success(tarea)),
        )
            .into_response()
    } else {
        (
            StatusCode::OK,
            Json(crate::models::ApiResponse::success(serde_json::json!({
                "idTarea": id
            }))),
        )
            .into_response()
    }
}

pub async fn tareas_recordatorio(
    user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    Json(body): Json<TareaRecordatorioRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    };

    if load_tarea_detalle(&mut client, id).await.is_none() {
        return (
            StatusCode::NOT_FOUND,
            Json(crate::models::ApiResponse::error(
                "Tarea no encontrada".to_string(),
                404,
            )),
        )
            .into_response();
    }

    let fecha_hora_raw = match body.fecha_hora.clone() {
        Some(value) if !value.trim().is_empty() => value,
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                Json(crate::models::ApiResponse::error(
                    "Fecha/hora invalida".to_string(),
                    400,
                )),
            )
                .into_response();
        }
    };

    let fecha_hora = match chrono::DateTime::parse_from_rfc3339(&fecha_hora_raw) {
        Ok(dt) => dt.with_timezone(&chrono::Utc).naive_utc(),
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(crate::models::ApiResponse::error(
                    "Fecha/hora invalida".to_string(),
                    400,
                )),
            )
                .into_response();
        }
    };

    if fecha_hora <= chrono::Utc::now().naive_utc() {
        return (
            StatusCode::BAD_REQUEST,
            Json(crate::models::ApiResponse::error(
                "La fecha del recordatorio debe ser en el futuro".to_string(),
                400,
            )),
        )
            .into_response();
    }

    let nota = body.nota.clone();
    let id_usuario = user.user_id_i32();

    let res = match crate::handlers::equipo::exec_sp_to_json_result(
        &mut client,
        "EXEC sp_Tarea_UpsertRecordatorio_rust @P1, @P2, @P3, @P4",
        &[&id, &id_usuario, &fecha_hora, &nota],
    )
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e, 500)),
            )
                .into_response();
        }
    };

    let id_recordatorio = res
        .first()
        .and_then(|row| row.get("id"))
        .and_then(|value| value.as_i64())
        .unwrap_or(0);

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "success": true,
            "idRecordatorio": id_recordatorio,
            "fechaHoraRecordatorio": fecha_hora.and_utc().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
        }))),
    )
        .into_response()
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

    let items = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Tarea_ObtenerHistorico_rust @P1, @P2",
        &[&carnet, &dias],
    )
    .await;
    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(items)),
    )
        .into_response()
}

pub async fn tareas_delete(
    user: AuthUser,
    State(state): State<ApiState>,
    OriginalUri(original_uri): OriginalUri,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };
    let carnet = user.carnet().to_string();

    match client
        .execute(
            "EXEC sp_Tarea_Eliminar_rust @P1, @P2, @P3",
            &[&id, &carnet, &"Eliminacion desde Rust"],
        )
        .await
    {
        Ok(_) => (
            StatusCode::OK,
            Json(crate::models::ApiResponse::success_with_status(
                serde_json::json!({ "success": true }),
                200,
                original_uri.path(),
            )),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(crate::models::ApiResponse::error(e.to_string(), 500)),
        )
            .into_response(),
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

    let motivo = body
        .comment
        .unwrap_or_else(|| "Descarte manual".to_string());
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
    user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    Json(body): Json<TareaMoverRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let id_proy = body.id_proyecto_destino as i32;
    let id_ejecutor = user.user_id_i32();
    let mover_sub = body.mover_subtareas.unwrap_or(true);

    match client
        .execute(
            "EXEC sp_Tarea_MoverAProyecto_rust @P1, @P2, @P3, @P4",
            &[&id, &id_proy, &id_ejecutor, &mover_sub],
        )
        .await
    {
        Ok(_) => Json(crate::models::ApiResponse::success(serde_json::json!({
            "success": true,
            "message": format!("Tarea movida a {}", body.id_proyecto_destino)
        })))
        .into_response(),
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
        id,
        id_usuario,
        carnet,
        body.porcentaje,
        body.comentario
    );

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    };

    let id_usuario = user.user_id_i32();
    let p_float = body.porcentaje;
    let p_int = p_float as i32;
    let com = body.comentario.unwrap_or_default();
    let es_completa = p_float >= 100.0;

    // Zero Inline SQL: Usar sp_Tarea_GestionarAvance (AtÃ³mico)
    match client.execute(
        "EXEC sp_Tarea_GestionarAvance_rust @idTarea=@P1, @idUsuario=@P2, @progreso=@P3, @comentario=@P4, @esCompleta=@P5",
        &[&id, &id_usuario, &p_float, &com, &es_completa]
    ).await {
        Ok(_) => {
            // Roll-up
            let _ = client.query("EXEC sp_Tarea_RecalcularJerarquia_rust @P1, NULL", &[&id]).await;
            (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({"idTarea": id, "progreso": p_int})))).into_response()
        },
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response()
    }
}

pub async fn tareas_delete_avance(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id_log): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    };

    // Zero Inline SQL: Usar sp_Tarea_EliminarAvance
    let _ = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Tarea_EliminarAvance_rust @P1",
        &[&id_log],
    )
    .await;
    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(
            serde_json::json!({"success": true}),
        )),
    )
        .into_response()
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
        }))
        .into_response()
    } else {
        Json(serde_json::json!({"error": "Failed to create change request" })).into_response()
    }
}

pub async fn tareas_solicitud_cambio_pendientes(
    user: AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let mut is_admin = is_admin_role_name(user.rol());
    if !is_admin {
        let role_rows = crate::handlers::equipo::exec_query_to_json(
            &mut client,
            "SELECT rolGlobal FROM p_Usuarios WHERE idUsuario = @P1 AND activo = 1",
            &[&user.user_id_i32()],
        )
        .await;
        is_admin = role_rows
            .first()
            .and_then(|row| row.get("rolGlobal"))
            .and_then(|value| value.as_str())
            .map(is_admin_role_name)
            .unwrap_or(false);
    }

    let items = if is_admin {
        crate::handlers::equipo::exec_sp_to_json(
            &mut client,
            "EXEC sp_SolicitudCambio_ObtenerPendientes_rust",
            &[],
        )
        .await
    } else {
        let jefe_carnet = user.carnet().trim();
        if jefe_carnet.is_empty() || jefe_carnet == "UNKNOWN" {
            vec![]
        } else {
            let team_rows = crate::handlers::equipo::exec_query_to_json(
                &mut client,
                "SELECT carnet FROM p_Usuarios WHERE jefeCarnet = @P1 AND activo = 1 ORDER BY nombre ASC",
                &[&jefe_carnet],
            )
            .await;
            let mut team_carnets: Vec<String> = team_rows
                .iter()
                .filter_map(|row| row.get("carnet").and_then(|value| value.as_str()))
                .map(|carnet| carnet.trim().to_string())
                .filter(|carnet| !carnet.is_empty())
                .collect();
            team_carnets.sort();
            team_carnets.dedup();

            if team_carnets.is_empty() {
                vec![]
            } else {
                let carnets_csv = team_carnets.join(",");
                crate::handlers::equipo::exec_sp_to_json(
                    &mut client,
                    "EXEC sp_SolicitudCambio_ObtenerPendientesPorCarnets_rust @P1",
                    &[&carnets_csv],
                )
                .await
            }
        }
    };

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(items)),
    )
        .into_response()
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
    let approved = body
        .approved
        .unwrap_or_else(|| matches!(body.accion.as_deref(), Some("Aprobar")));
    let estado = if approved { "Aprobado" } else { "Rechazado" };
    let comentario = body
        .comentario
        .clone()
        .or_else(|| body.comment.clone())
        .unwrap_or_else(|| estado.to_string());

    // Zero Inline SQL: Usar sp_SolicitudCambio_Resolver
    let res = match crate::handlers::equipo::exec_sp_to_json_result(
        &mut client,
        "EXEC sp_SolicitudCambio_Resolver_rust @idSolicitud=@P1, @estado=@P2, @idUsuarioResolutor=@P3, @comentarioResolucion=@P4",
        &[&id, &estado, &id_usuario_resolutor, &comentario],
    ).await {
        Ok(res) => res,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e, 500)),
            )
                .into_response()
        }
    };

    if let Some(result) = res.first() {
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "mensaje": if approved {
                "Solicitud aprobada y cambio aplicado correctamente"
            } else {
                "Solicitud rechazada"
            },
            "resolved": result
        })))
        .into_response()
    } else {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(crate::models::ApiResponse::error(
                "Failed to resolve change request".to_string(),
                500,
            )),
        )
            .into_response()
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
    let dias_semana: Option<String> = if tipo_recurrencia == "SEMANAL" {
        Some("1,2,3,4,5".to_string())
    } else {
        None
    };
    let dia_mes: Option<i32> = if tipo_recurrencia == "MENSUAL" {
        Some(1)
    } else {
        None
    };
    let fecha_inicio = chrono::Utc::now().naive_utc().date();
    let fecha_fin: Option<chrono::NaiveDate> = None;

    match client
        .execute(
            "EXEC sp_Recurrencia_Crear_rust @P1, @P2, @P3, @P4, @P5, @P6, @P7",
            &[
                &id,
                &tipo_recurrencia,
                &dias_semana,
                &dia_mes,
                &fecha_inicio,
                &fecha_fin,
                &id_creador,
            ],
        )
        .await
    {
        Ok(_) => Json(serde_json::json!({
            "success": true,
            "idTarea": id,
            "recurrencia": {"frecuencia": body.frecuencia, "intervalo": body.intervalo}
        }))
        .into_response(),
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

    let res = match client
        .query("EXEC sp_Recurrencia_ObtenerPorTarea_rust @P1", &[&id])
        .await
    {
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
                    Json(serde_json::json!({"success": false, "message": "No recurrence found"}))
                        .into_response()
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

    let res = match client
        .query(
            "EXEC sp_Instancia_Upsert_rust @P1, NULL, @P2, @P3, NULL, NULL, NULL",
            &[&id, &fecha_prog, &estado],
        )
        .await
    {
        Ok(s) => match s.into_first_result().await {
            Ok(rows) => {
                let id_inst = rows
                    .into_iter()
                    .next()
                    .and_then(|r| r.get::<i32, _>("id"))
                    .unwrap_or(0);
                Json(serde_json::json!({"success": true, "idTarea": id, "idInstancia": id_inst}))
                    .into_response()
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
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    };

    let mut carnet = body.carnet.clone().unwrap_or_default();
    if carnet.trim().is_empty() {
        if let Some(id_usuario) = body.id_usuario_asignado {
            if let Ok(stream) = client
                .query(
                    "SELECT carnet FROM p_Usuarios WHERE idUsuario = @P1 AND activo = 1",
                    &[&id_usuario],
                )
                .await
            {
                if let Ok(rows) = stream.into_first_result().await {
                    if let Some(row) = rows.into_iter().next() {
                        carnet = row
                            .try_get::<&str, _>("carnet")
                            .ok()
                            .flatten()
                            .unwrap_or("")
                            .to_string();
                    }
                }
            }
        }
    }

    if carnet.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(crate::models::ApiResponse::error(
                "Usuario asignado invalido".to_string(),
                400,
            )),
        )
            .into_response();
    }

    let tipo = body
        .tipo
        .clone()
        .unwrap_or_else(|| "Responsable".to_string());
    let _ = client
        .query(
            "EXEC sp_Tarea_AsignarResponsable_rust @P1, @P2, @P3, 0",
            &[&body.id_tarea, &carnet, &tipo],
        )
        .await;

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "success": true,
            "message": "Usuario asignado"
        }))),
    )
        .into_response()
}

pub async fn tareas_bloqueos(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    };

    let mut bloqueos = Vec::new();
    if let Ok(st) = client
        .query(
            "SELECT * FROM p_Bloqueos WHERE idTareaAfectada=@P1 ORDER BY fechaCreacion DESC",
            &[&id],
        )
        .await
    {
        if let Ok(rows) = st.into_first_result().await {
            bloqueos = rows
                .iter()
                .map(crate::handlers::equipo::row_to_json)
                .collect();
        }
    }

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!(
            bloqueos
        ))),
    )
        .into_response()
}

// ----- MODELS -----

#[derive(Deserialize)]
pub struct TareaAvanceMensualRequest {
    #[serde(rename = "anio", alias = "year")]
    pub year: u16,
    #[serde(rename = "mes", alias = "month")]
    pub month: u8,
    #[serde(rename = "porcentajeMes", alias = "progress")]
    pub progress: f32,
    pub comentario: Option<String>,
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
    #[serde(alias = "motivo")]
    pub comment: Option<String>,
}

#[derive(Deserialize)]
pub struct AsignacionRequest {
    #[serde(rename = "idTarea")]
    pub id_tarea: i32,
    #[serde(rename = "idUsuarioAsignado")]
    pub id_usuario_asignado: Option<i32>,
    pub carnet: Option<String>,
    pub tipo: Option<String>,
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
    #[serde(rename = "coasignados", alias = "participantes")]
    pub participantes: Vec<u64>,
}

#[derive(Deserialize)]
pub struct TareaRecordatorioRequest {
    #[serde(rename = "fechaHora", alias = "fecha_hora", alias = "message")]
    pub fecha_hora: Option<String>,
    pub nota: Option<String>,
}

#[derive(Deserialize)]
pub struct TareaMoverRequest {
    #[serde(rename = "idProyectoDestino")]
    pub id_proyecto_destino: u64,
    #[serde(rename = "moverSubtareas")]
    pub mover_subtareas: Option<bool>,
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
    pub approved: Option<bool>,
    pub accion: Option<String>,
    pub comentario: Option<String>,
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

fn tareas_validate_quick_choice(
    field: &str,
    value: Option<&str>,
    allowed: &[&str],
) -> Result<(), String> {
    if let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) {
        if !allowed.iter().any(|allowed_value| allowed_value == &value) {
            return Err(format!(
                "{} must be one of the following values: {}",
                field,
                allowed.join(", ")
            ));
        }
    }
    Ok(())
}

fn tareas_parse_quick_task_date(
    raw: Option<&str>,
    field: &str,
    default: chrono::NaiveDateTime,
) -> Result<chrono::NaiveDateTime, String> {
    let Some(raw) = raw.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(default);
    };

    chrono::NaiveDate::parse_from_str(raw, "%Y-%m-%d")
        .ok()
        .and_then(|date| date.and_hms_opt(0, 0, 0))
        .or_else(|| {
            chrono::DateTime::parse_from_rfc3339(raw)
                .ok()
                .map(|value| value.naive_utc())
        })
        .or_else(|| chrono::NaiveDateTime::parse_from_str(raw, "%Y-%m-%d %H:%M:%S").ok())
        .ok_or_else(|| format!("{} must be a valid ISO 8601 date string", field))
}

fn tareas_validate_quick_create_request(body: &TareaCrearRapidaRequest) -> Result<String, String> {
    let titulo = body
        .titulo
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "titulo should not be empty".to_string())?;

    if titulo.len() > 220 {
        return Err("titulo must be shorter than or equal to 220 characters".to_string());
    }

    tareas_validate_quick_choice(
        "prioridad",
        body.prioridad.as_deref(),
        &["Alta", "Media", "Baja"],
    )?;
    tareas_validate_quick_choice("esfuerzo", body.esfuerzo.as_deref(), &["S", "M", "L"])?;
    tareas_validate_quick_choice(
        "tipo",
        body.tipo.as_deref(),
        &[
            "Logistica",
            "Administrativa",
            "administrativo",
            "Estrategica",
            "Estrategico",
            "AMX",
            "Otros",
            "CENAM",
            "Operativo",
        ],
    )?;
    tareas_validate_quick_choice(
        "comportamiento",
        body.comportamiento.as_deref(),
        &["SIMPLE", "RECURRENTE", "LARGA"],
    )?;

    Ok(titulo.to_string())
}

fn tareas_quick_validation_error_response(message: String) -> axum::response::Response {
    (
        StatusCode::BAD_REQUEST,
        Json(serde_json::json!({
            "success": false,
            "statusCode": 400,
            "errorCode": "BAD_REQUEST",
            "message": [message],
            "timestamp": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
            "path": "/api/tareas/rapida"
        })),
    )
        .into_response()
}

pub async fn tareas_crear_rapida(
    user: AuthUser,
    State(state): State<ApiState>,
    OriginalUri(original_uri): OriginalUri,
    Json(body): Json<TareaCrearRapidaRequest>,
) -> impl IntoResponse {
    let coasignados = body.coasignados.clone().unwrap_or_default();
    let titulo = match tareas_validate_quick_create_request(&body) {
        Ok(value) => value,
        Err(message) => return tareas_quick_validation_error_response(message),
    };
    let id_creador = body.id_usuario.unwrap_or(user.user_id_i32());
    let id_responsable = body.id_responsable.unwrap_or(id_creador);

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    };

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
    let fecha_inicio = match tareas_parse_quick_task_date(
        body.fecha_inicio_planificada.as_deref(),
        "fechaInicioPlanificada",
        now,
    ) {
        Ok(value) => value,
        Err(message) => return tareas_quick_validation_error_response(message),
    };
    let fecha_objetivo =
        match tareas_parse_quick_task_date(body.fecha_objetivo.as_deref(), "fechaObjetivo", now) {
            Ok(value) => value,
            Err(message) => return tareas_quick_validation_error_response(message),
        };

    let porcentaje: i32 = 0;
    let orden: i32 = 0;
    let req_evidencia: bool = false;
    let entregable: Option<i32> = None;
    let semana: Option<i32> = None;
    let mut id_tarea_opt = None;
    if let Ok(stream) = client
        .query(
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
        )
        .await
    {
        if let Ok(rows) = stream.into_first_result().await {
            if let Some(row) = rows.first() {
                id_tarea_opt = Some(row.try_get::<i32, _>("idTarea").ok().flatten().unwrap_or(0));
            }
        }
    }

    if let Some(id_tarea) = id_tarea_opt {
        let mut participantes = coasignados;
        participantes
            .retain(|id_colaborador| *id_colaborador > 0 && *id_colaborador != id_responsable);
        participantes.sort_unstable();
        participantes.dedup();

        if !participantes.is_empty() {
            let participantes_csv = participantes
                .iter()
                .map(|id_colaborador| id_colaborador.to_string())
                .collect::<Vec<_>>()
                .join(",");
            let _ = crate::handlers::equipo::exec_sp_to_json(
                &mut client,
                "EXEC sp_Tarea_ActualizarParticipantes_rust @P1, @P2",
                &[&id_tarea, &participantes_csv],
            )
            .await;
        }

        if let Some(mut tarea) = load_tarea_detalle(&mut client, id_tarea).await {
            if let Some(obj) = tarea.as_object_mut() {
                obj.insert(
                    "message".to_string(),
                    serde_json::json!("Tarea creada exitosamente"),
                );
            }
            return (
                StatusCode::CREATED,
                Json(crate::models::ApiResponse::success_with_status(
                    tarea,
                    201,
                    original_uri.path(),
                )),
            )
                .into_response();
        }

        (
            StatusCode::CREATED,
            Json(crate::models::ApiResponse::success_with_status(
                serde_json::json!({
                    "idTarea": id_tarea,
                    "titulo": titulo,
                    "estado": "Pendiente",
                    "message": "Tarea creada exitosamente (fallback)"
                }),
                201,
                original_uri.path(),
            )),
        )
            .into_response()
    } else {
        (
            StatusCode::CREATED,
            Json(crate::models::ApiResponse::success_with_status(
                serde_json::json!({
                    "message": "Tarea creada (sin ID retornado o fallida)"
                }),
                201,
                original_uri.path(),
            )),
        )
            .into_response()
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
    let carnet = query_params
        .get("carnet")
        .cloned()
        .unwrap_or_else(|| user.carnet().to_string());
    let estado = query_params.get("estado").map(|s| s.as_str());

    let id_proyecto_i32 = query_params
        .get("idProyecto")
        .and_then(|s| s.parse::<i32>().ok());
    let query_text = query_params.get("query").map(|s| s.as_str());
    let start_date = query_params.get("startDate").map(|s| s.as_str());
    let end_date = query_params.get("endDate").map(|s| s.as_str());

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    };

    let params: Vec<&dyn tiberius::ToSql> = vec![
        &carnet,
        &estado,
        &id_proyecto_i32,
        &query_text,
        &start_date,
        &end_date,
    ];

    let mut tareas = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Tareas_ObtenerPorUsuario_rust @P1, @P2, @P3, @P4, @P5, @P6",
        &params,
    )
    .await;

    for t in tareas.iter_mut() {
        if let Some(obj) = t.as_object_mut() {
            let resp_carnet = obj
                .get("responsableCarnet")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim();
            if !resp_carnet.is_empty() && resp_carnet != carnet.trim() {
                let current_title = obj
                    .get("titulo")
                    .or(obj.get("nombre"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("Sin TÃ­tulo")
                    .to_string();
                let resp_nombre = obj
                    .get("responsableNombre")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Otro");
                let short_name = resp_nombre.split(' ').take(2).collect::<Vec<_>>().join(" ");
                let new_title = format!("{} (Asig: {})", current_title, short_name);

                obj.insert("titulo".to_string(), serde_json::json!(new_title.clone()));
                obj.insert("nombre".to_string(), serde_json::json!(new_title));
            } else if let Some(tit) = obj.get("titulo").cloned() {
                obj.insert("nombre".to_string(), tit);
            }
        }
    }

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!(
            tareas
        ))),
    )
        .into_response()
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
        "[API] PATCH /tareas/{} - User: {} ({}) - Body: {:?}",
        id,
        id_usuario,
        carnet,
        body
    );

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    };

    let current_task_rows = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Tareas_ObtenerPorId_rust @P1",
        &[&id],
    )
    .await;
    let old_parent = current_task_rows
        .first()
        .and_then(|task| task.get("idTareaPadre"))
        .and_then(|value| value.as_i64())
        .map(|value| value as i32);

    if let Some(task) = current_task_rows.first() {
        let is_estrategica =
            task.get("tipo").and_then(|v| v.as_str()).unwrap_or("") == "EstratÃ©gica";
        let es_proyecto = task.get("idProyecto").and_then(|v| v.as_i64()).unwrap_or(0) > 0;

        let sensitive_change = body.fecha_objetivo.is_some()
            || body.titulo.is_some()
            || body.nombre.is_some()
            || body.id_responsable.is_some()
            || body.esfuerzo.is_some();

        if (is_estrategica || es_proyecto) && sensitive_change && !user.is_admin() {
            return (
                StatusCode::ACCEPTED,
                Json(crate::models::ApiResponse::error(
                    "Esta tarea requiere aprobaciÃ³n para cambios sensibles".to_string(),
                    202,
                )),
            )
                .into_response();
        }
    }

    let titulo = body.titulo.clone().or_else(|| body.nombre.clone());
    let mut progreso = body.porcentaje.map(|v| v as i32);
    if body.estado.as_deref() == Some("Hecha") {
        progreso = Some(100);
    }

    let f_objetivo = parse_optional_datetime(body.fecha_objetivo.as_deref());
    let f_inicio = parse_optional_datetime(body.fecha_inicio_planificada.as_deref());
    let id_proy = body.id_proyecto.map(|v| v as i32);

    let _ = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Tarea_Actualizar_rust @idTarea=@P1, @titulo=@P2, @descripcion=@P3, @estado=@P4, @prioridad=@P5, @progreso=@P6, @idProyecto=@P7, @idResponsable=@P8, @fechaObjetivo=@P9, @fechaInicioPlanificada=@P10, @linkEvidencia=@P11, @idTareaPadre=@P12, @tipo=@P13, @esfuerzo=@P14, @comportamiento=@P15",
        &[
            &id, &titulo, &body.descripcion, &body.estado, &body.prioridad, &progreso,
            &id_proy, &body.id_responsable, &f_objetivo, &f_inicio, &body.link_evidencia,
            &body.id_tarea_padre, &body.tipo, &body.esfuerzo, &body.comportamiento,
        ],
    ).await;

    if body.estado.as_deref() == Some("Hecha") {
        let _ = client.execute(
            "UPDATE p_Tareas SET porcentaje = 100, fechaCompletado = ISNULL(fechaCompletado, GETDATE()) WHERE idTarea = @P1",
            &[&id],
        ).await;
    }

    let padre_cambio = body.id_tarea_padre.is_some() && body.id_tarea_padre != old_parent;
    let metrics_cambio = body.porcentaje.is_some() || body.estado.is_some();

    if padre_cambio {
        if let Some(id_padre_anterior) = old_parent {
            let _ = client
                .query(
                    "EXEC sp_Tarea_RecalcularJerarquia_rust NULL, @P1",
                    &[&id_padre_anterior],
                )
                .await;
        }
        if body.id_tarea_padre.is_some() {
            let _ = client
                .query("EXEC sp_Tarea_RecalcularJerarquia_rust @P1, NULL", &[&id])
                .await;
        }
    } else if metrics_cambio && old_parent.is_some() {
        let _ = client
            .query("EXEC sp_Tarea_RecalcularJerarquia_rust @P1, NULL", &[&id])
            .await;
    }

    if let Some(tarea) = load_tarea_detalle(&mut client, id).await {
        (
            StatusCode::OK,
            Json(crate::models::ApiResponse::success(tarea)),
        )
            .into_response()
    } else {
        (
            StatusCode::OK,
            Json(crate::models::ApiResponse::success(
                serde_json::json!({"idTarea": id, "success": true}),
            )),
        )
            .into_response()
    }
}

fn parse_optional_datetime(value: Option<&str>) -> Option<chrono::NaiveDateTime> {
    value.and_then(|s| {
        if s.is_empty() {
            return None;
        }
        // Try different formats
        chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S")
            .ok()
            .or_else(|| chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.fZ").ok())
            .or_else(|| {
                chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d")
                    .ok()
                    .map(|d| d.and_hms_opt(0, 0, 0).unwrap())
            })
            .or_else(|| chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S").ok())
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tareas_validate_quick_create_rejects_invalid_enums_and_empty_title() {
        let invalid_title = TareaCrearRapidaRequest {
            titulo: Some("   ".to_string()),
            id_usuario: Some(23),
            id_proyecto: None,
            descripcion: None,
            prioridad: Some("Media".to_string()),
            esfuerzo: Some("S".to_string()),
            tipo: Some("Administrativa".to_string()),
            fecha_inicio_planificada: None,
            fecha_objetivo: None,
            comportamiento: None,
            id_responsable: Some(23),
            id_tarea_padre: None,
            coasignados: None,
        };
        assert!(tareas_validate_quick_create_request(&invalid_title).is_err());

        let invalid_effort = TareaCrearRapidaRequest {
            esfuerzo: Some("Baja".to_string()),
            ..invalid_title.clone_with_title("Titulo valido")
        };
        assert_eq!(
            tareas_validate_quick_create_request(&invalid_effort).unwrap_err(),
            "esfuerzo must be one of the following values: S, M, L"
        );
    }

    #[test]
    fn tareas_parse_quick_task_date_accepts_frontend_and_iso_inputs() {
        let default = chrono::NaiveDate::from_ymd_opt(2026, 3, 27)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap();
        assert_eq!(
            tareas_parse_quick_task_date(Some("2026-03-27"), "fechaObjetivo", default).unwrap(),
            default
        );
        assert!(tareas_parse_quick_task_date(
            Some("2026-03-27T10:15:00.000Z"),
            "fechaObjetivo",
            default
        )
        .is_ok());
        assert!(tareas_parse_quick_task_date(Some("nope"), "fechaObjetivo", default).is_err());
    }

    trait QuickTaskClone {
        fn clone_with_title(&self, title: &str) -> Self;
    }

    impl QuickTaskClone for TareaCrearRapidaRequest {
        fn clone_with_title(&self, title: &str) -> Self {
            Self {
                titulo: Some(title.to_string()),
                id_usuario: self.id_usuario,
                id_proyecto: self.id_proyecto,
                descripcion: self.descripcion.clone(),
                prioridad: self.prioridad.clone(),
                esfuerzo: self.esfuerzo.clone(),
                tipo: self.tipo.clone(),
                fecha_inicio_planificada: self.fecha_inicio_planificada.clone(),
                fecha_objetivo: self.fecha_objetivo.clone(),
                comportamiento: self.comportamiento.clone(),
                id_responsable: self.id_responsable,
                id_tarea_padre: self.id_tarea_padre,
                coasignados: self.coasignados.clone(),
            }
        }
    }
}
