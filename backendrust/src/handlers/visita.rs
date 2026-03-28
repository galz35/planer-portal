#![allow(dead_code)]
use axum::{extract::State, response::IntoResponse, Json};
use serde::Deserialize;
use std::collections::HashMap;

use crate::state::ApiState;

pub async fn visita_campo_agenda(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    query: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let carnet = query
        .get("carnet")
        .cloned()
        .unwrap_or_else(|| user.carnet().to_string());
    let lat: Option<f64> = query.get("lat").and_then(|v| v.parse().ok());
    let lon: Option<f64> = query.get("lon").and_then(|v| v.parse().ok());

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let res = match client
        .query(
            "EXEC sp_vc_agenda_hoy_rust @P1, @P2, @P3",
            &[&carnet, &lat, &lon],
        )
        .await
    {
        Ok(stream) => match stream.into_first_result().await {
            Ok(rows) => {
                let items: Vec<serde_json::Value> = rows
                    .into_iter()
                    .map(|r| {
                        let mut map = serde_json::Map::new();
                        for (i, col) in r.columns().iter().enumerate() {
                            let name = col.name().to_string();
                            if let Ok(Some(i_val)) = r.try_get::<i32, _>(i) {
                                map.insert(name, serde_json::json!(i_val));
                            } else if let Ok(Some(f_val)) = r.try_get::<f64, _>(i) {
                                map.insert(name, serde_json::json!(f_val));
                            } else if let Ok(Some(s_val)) = r.try_get::<&str, _>(i) {
                                map.insert(name, serde_json::json!(s_val));
                            } else if let Ok(Some(b_val)) = r.try_get::<bool, _>(i) {
                                map.insert(name, serde_json::json!(b_val));
                            } else if let Ok(Some(d_val)) = r.try_get::<chrono::NaiveDateTime, _>(i)
                            {
                                map.insert(
                                    name,
                                    serde_json::json!(d_val
                                        .format("%Y-%m-%d %H:%M:%S")
                                        .to_string()),
                                );
                            } else {
                                map.insert(name, serde_json::Value::Null);
                            }
                        }
                        serde_json::Value::Object(map)
                    })
                    .collect();
                Json(serde_json::json!({"success": true, "items": items})).into_response()
            }
            Err(e) => Json(serde_json::json!({"error": e.to_string()})).into_response(),
        },
        Err(e) => Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };
    res
}

pub async fn visita_campo_clientes(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    // Zero Inline SQL: Usar sp_Visita_ObtenerClientes
    let items = match crate::handlers::equipo::exec_sp_to_json_result(
        &mut client,
        "EXEC sp_Visita_ObtenerClientes_rust",
        &[],
    )
    .await
    {
        Ok(items) => items,
        Err(e) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e, 500)),
            )
                .into_response()
        }
    };
    (
        axum::http::StatusCode::OK,
        Json(crate::models::ApiResponse::success(items)),
    )
        .into_response()
}

pub async fn visita_campo_checkin(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let carnet = body
        .get("carnet")
        .and_then(|v| v.as_str())
        .unwrap_or(user.carnet());
    let cliente_id = body.get("cliente_id").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
    let lat = body.get("lat").and_then(|v| v.as_f64());
    let lon = body.get("lon").and_then(|v| v.as_f64());
    let accuracy = body.get("accuracy").and_then(|v| v.as_f64());
    let timestamp = body.get("timestamp").and_then(|v| v.as_str()).map(|s| {
        chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.fZ")
            .unwrap_or_else(|_| chrono::Utc::now().naive_utc())
    });
    let agenda_id = body
        .get("agenda_id")
        .and_then(|v| v.as_i64())
        .map(|i| i as i32);
    let offline_id = body.get("offline_id").and_then(|v| v.as_str());

    match client
        .execute(
            "EXEC sp_vc_checkin_rust @P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8",
            &[
                &carnet,
                &cliente_id,
                &lat,
                &lon,
                &accuracy,
                &timestamp,
                &agenda_id,
                &offline_id,
            ],
        )
        .await
    {
        Ok(_) => {
            Json(serde_json::json!({"success": true, "message": "Check-in registrado via DB"}))
                .into_response()
        }
        Err(e) => Json(serde_json::json!({"error": e.to_string()})).into_response(),
    }
}

pub async fn visita_campo_checkout(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let visita_id = body
        .get("visita_id")
        .or(body.get("id_visita"))
        .and_then(|v| v.as_i64())
        .unwrap_or(0) as i32;
    let carnet = body
        .get("carnet")
        .and_then(|v| v.as_str())
        .unwrap_or(user.carnet());
    let lat = body.get("lat").and_then(|v| v.as_f64());
    let lon = body.get("lon").and_then(|v| v.as_f64());
    let accuracy = body.get("accuracy").and_then(|v| v.as_f64());
    let timestamp = body.get("timestamp").and_then(|v| v.as_str()).map(|s| {
        chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.fZ")
            .unwrap_or_else(|_| chrono::Utc::now().naive_utc())
    });
    let observacion = body
        .get("observacion")
        .or(body.get("notas"))
        .and_then(|v| v.as_str());
    let foto_path = body.get("foto_path").and_then(|v| v.as_str());
    let firma_path = body.get("firma_path").and_then(|v| v.as_str());

    match client
        .execute(
            "EXEC sp_vc_checkout_rust @P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8, @P9",
            &[
                &visita_id,
                &carnet,
                &lat,
                &lon,
                &accuracy,
                &timestamp,
                &observacion,
                &foto_path,
                &firma_path,
            ],
        )
        .await
    {
        Ok(_) => {
            Json(serde_json::json!({"success": true, "message": "Check-out registrado via DB"}))
                .into_response()
        }
        Err(e) => Json(serde_json::json!({"error": e.to_string()})).into_response(),
    }
}

pub async fn visita_campo_resumen(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    query: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let carnet = query
        .get("carnet")
        .cloned()
        .unwrap_or_else(|| user.carnet().to_string());
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let res = match client
        .query("EXEC sp_vc_resumen_dia_rust @P1, NULL", &[&carnet])
        .await
    {
        Ok(s) => match s.into_first_result().await {
            Ok(rows) => {
                if let Some(r) = rows.into_iter().next() {
                    let v_comp = r
                        .try_get::<i32, _>("visitas_completadas")
                        .ok()
                        .flatten()
                        .unwrap_or(0);
                    let v_pend = r
                        .try_get::<i32, _>("visitas_pendientes")
                        .ok()
                        .flatten()
                        .unwrap_or(0);
                    let efectividad = r
                        .try_get::<f64, _>("efectividad")
                        .ok()
                        .flatten()
                        .unwrap_or(0.0);

                    Json(serde_json::json!({
                        "success": true,
                        "visitas_completadas": v_comp,
                        "visitas_pendientes": v_pend,
                        "efectividad": efectividad,
                    }))
                    .into_response()
                } else {
                    Json(serde_json::json!({"success": true, "visitas_completadas": 0}))
                        .into_response()
                }
            }
            Err(_) => {
                Json(serde_json::json!({"success": true, "visitas_completadas": 0})).into_response()
            }
        },
        Err(_) => {
            Json(serde_json::json!({"success": true, "visitas_completadas": 0})).into_response()
        }
    };
    res
}

pub async fn visita_campo_tracking_batch(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };
    let carnet = user.carnet();
    let puntos = body
        .get("puntos")
        .unwrap_or(&serde_json::json!([]))
        .to_string();

    match client
        .execute(
            "EXEC sp_vc_tracking_batch_rust @P1, @P2",
            &[&carnet, &puntos],
        )
        .await
    {
        Ok(_) => Json(serde_json::json!({"success": true})).into_response(),
        Err(e) => Json(serde_json::json!({"error": e.to_string()})).into_response(),
    }
}

pub async fn visita_campo_stats_km(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    query: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };
    let carnet = user.carnet();
    let fecha = query.get("fecha").cloned();

    match client
        .query(
            "EXEC sp_vc_calculo_km_dia_rust @P1, @P2",
            &[&carnet, &fecha],
        )
        .await
    {
        Ok(s) => match s.into_first_result().await {
            Ok(rows) => {
                if let Some(r) = rows.into_iter().next() {
                    return Json(crate::handlers::equipo::row_to_json(&r)).into_response();
                }
            }
            Err(_) => {}
        },
        Err(_) => {}
    }
    Json(serde_json::json!({"km_total": 0})).into_response()
}

pub async fn visita_campo_tracking_raw(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    query: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };
    let carnet = query
        .get("carnet")
        .cloned()
        .unwrap_or_else(|| user.carnet().to_string());
    let fecha = query.get("fecha").cloned();

    match client
        .query(
            "EXEC sp_vc_tracking_por_dia_rust @P1, @P2",
            &[&carnet, &fecha],
        )
        .await
    {
        Ok(s) => match s.into_first_result().await {
            Ok(rows) => {
                let items: Vec<serde_json::Value> = rows
                    .into_iter()
                    .map(|r| crate::handlers::equipo::row_to_json(&r))
                    .collect();
                return Json(items).into_response();
            }
            Err(_) => {}
        },
        Err(_) => {}
    }
    Json(serde_json::json!([])).into_response()
}

pub async fn visita_campo_usuarios_tracking(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    match client
        .query("EXEC sp_vc_usuarios_con_tracking_rust", &[])
        .await
    {
        Ok(s) => match s.into_first_result().await {
            Ok(rows) => {
                let items: Vec<serde_json::Value> = rows
                    .into_iter()
                    .map(|r| crate::handlers::equipo::row_to_json(&r))
                    .collect();
                return (
                    axum::http::StatusCode::OK,
                    Json(crate::models::ApiResponse::success(items)),
                )
                    .into_response();
            }
            Err(_) => {}
        },
        Err(_) => {}
    }
    (
        axum::http::StatusCode::OK,
        Json(crate::models::ApiResponse::success(Vec::<serde_json::Value>::new())),
    )
        .into_response()
}

pub async fn visita_admin_dashboard(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    query: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let fecha = query.get("fecha").cloned();
    let stats = match crate::handlers::equipo::exec_sp_to_json_result(
        &mut client,
        "EXEC sp_Visita_ObtenerStats_rust @fecha=@P1",
        &[&fecha],
    )
    .await
    {
        Ok(items) => items,
        Err(e) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e })),
            )
                .into_response()
        }
    };

    Json(
        stats
            .into_iter()
            .next()
            .unwrap_or_else(|| serde_json::json!({})),
    )
    .into_response()
}

pub async fn visita_admin_visitas(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    query: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let fecha = query.get("fecha").cloned();
    let top = 500_i32;
    let items = match crate::handlers::equipo::exec_sp_to_json_result(
        &mut client,
        "EXEC sp_Visita_ObtenerListado_rust @top=@P1, @fecha=@P2",
        &[&top, &fecha],
    )
    .await
    {
        Ok(items) => items,
        Err(e) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e })),
            )
                .into_response()
        }
    };
    Json(items).into_response()
}

pub async fn visita_admin_reportes_km(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    query: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let fecha_inicio = match query.get("fecha_inicio").cloned() {
        Some(value) if !value.trim().is_empty() => value,
        _ => {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                Json(crate::models::ApiResponse::error(
                    "fecha_inicio es requerido".to_string(),
                    400,
                )),
            )
                .into_response()
        }
    };
    let fecha_fin = match query.get("fecha_fin").cloned() {
        Some(value) if !value.trim().is_empty() => value,
        _ => {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                Json(crate::models::ApiResponse::error(
                    "fecha_fin es requerido".to_string(),
                    400,
                )),
            )
                .into_response()
        }
    };

    let start = match chrono::NaiveDate::parse_from_str(&fecha_inicio, "%Y-%m-%d") {
        Ok(date) => date,
        Err(_) => {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                Json(crate::models::ApiResponse::error(
                    "fecha_inicio invalida".to_string(),
                    400,
                )),
            )
                .into_response()
        }
    };
    let end = match chrono::NaiveDate::parse_from_str(&fecha_fin, "%Y-%m-%d") {
        Ok(date) => date,
        Err(_) => {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                Json(crate::models::ApiResponse::error(
                    "fecha_fin invalida".to_string(),
                    400,
                )),
            )
                .into_response()
        }
    };

    if end < start {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(crate::models::ApiResponse::error(
                "fecha_fin no puede ser menor que fecha_inicio".to_string(),
                400,
            )),
        )
            .into_response();
    }

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    };

    let usuarios = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_vc_usuarios_con_tracking_rust",
        &[],
    )
    .await;

    let mut reporte = Vec::new();
    let mut fecha_cursor = start;
    while fecha_cursor <= end {
        let fecha_texto = fecha_cursor.format("%Y-%m-%d").to_string();
        for usuario in &usuarios {
            let carnet = usuario.get("carnet").and_then(|v| v.as_str()).unwrap_or("");
            if carnet.is_empty() {
                continue;
            }

            let diario = crate::handlers::equipo::exec_sp_to_json(
                &mut client,
                "EXEC sp_vc_calculo_km_dia_rust @P1, @P2",
                &[&carnet, &fecha_texto.as_str()],
            )
            .await;

            if let Some(stats) = diario.first() {
                let km_total = stats
                    .get("km_total")
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.0);
                let puntos_totales = stats
                    .get("puntos_totales")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(0);
                if km_total > 0.0 || puntos_totales > 0 {
                    reporte.push(serde_json::json!({
                        "fecha": fecha_texto,
                        "carnet": carnet,
                        "nombre": usuario.get("nombre_empleado").or_else(|| usuario.get("nombre")).cloned().unwrap_or(serde_json::json!("No registrado")),
                        "km_total": format!("{:.2}", km_total),
                        "tramo_valido": stats.get("segmentos_validos").and_then(|v| v.as_i64()).unwrap_or(0),
                        "puntos_totales": puntos_totales,
                    }));
                }
            }
        }
        fecha_cursor = fecha_cursor.succ_opt().unwrap_or(fecha_cursor);
        if fecha_cursor <= end && fecha_cursor == end.succ_opt().unwrap_or(end) {
            break;
        }
    }

    (
        axum::http::StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!(
            reporte
        ))),
    )
        .into_response()
}

pub async fn visita_admin_importar_clientes(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };

    let clientes_json = body
        .get("clientes")
        .unwrap_or(&serde_json::json!([]))
        .to_string();

    match client
        .execute("EXEC sp_vc_importar_clientes_rust @P1", &[&clientes_json])
        .await
    {
        Ok(_) => (
            axum::http::StatusCode::OK,
            Json(serde_json::json!({"ok": true})),
        )
            .into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn visita_admin_crear_cliente(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Json(dto): Json<VisitaAdminClienteDto>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };

    let lat = dto.lat.unwrap_or(0.0) as f32;
    let long = dto.long.unwrap_or(0.0) as f32;
    let radio_metros = dto.radio_metros.unwrap_or(100);

    match client
        .query(
            "EXEC sp_vc_cliente_crear_rust @P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8, @P9",
            &[
                &dto.codigo,
                &dto.nombre,
                &dto.direccion,
                &dto.telefono,
                &dto.contacto,
                &lat,
                &long,
                &radio_metros,
                &dto.zona,
            ],
        )
        .await
    {
        Ok(st) => {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.into_iter().next() {
                    return (
                        axum::http::StatusCode::OK,
                        Json(crate::handlers::equipo::row_to_json(&r)),
                    )
                        .into_response();
                }
            }
        }
        Err(e) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    }
    (axum::http::StatusCode::OK, Json(serde_json::json!({}))).into_response()
}

pub async fn visita_admin_actualizar_cliente(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    axum::extract::Path(id): axum::extract::Path<i32>,
    Json(dto): Json<VisitaAdminClienteDto>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };

    let lat = dto.lat.map(|v| v as f32);
    let long = dto.long.map(|v| v as f32);
    let radio_metros = dto.radio_metros.unwrap_or(100);
    let activo = dto.activo.unwrap_or(true);
    let activo_i32 = if activo { 1_i32 } else { 0_i32 };

    match client.query("EXEC sp_vc_cliente_actualizar_rust @P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8, @P9, @P10, @P11",
        &[&id, &dto.codigo, &dto.nombre, &dto.direccion, &dto.telefono, &dto.contacto, &lat, &long, &radio_metros, &dto.zona, &activo_i32]).await {
        Ok(st) => {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.into_iter().next() {
                    return (axum::http::StatusCode::OK, Json(crate::handlers::equipo::row_to_json(&r))).into_response();
                }
            }
        }
        Err(e) => return (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))).into_response(),
    }
    (axum::http::StatusCode::OK, Json(serde_json::json!({}))).into_response()
}

pub async fn visita_admin_eliminar_cliente(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    axum::extract::Path(id): axum::extract::Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };
    match client
        .execute("EXEC sp_vc_cliente_eliminar_rust @P1", &[&id])
        .await
    {
        Ok(_) => (
            axum::http::StatusCode::OK,
            Json(serde_json::json!({"ok": true})),
        )
            .into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": e.to_string()})),
        )
            .into_response(),
    }
}
#[derive(Deserialize)]
pub struct VisitaCheckinRequest {
    #[serde(rename = "cliente_id")]
    pub cliente_id: i32,
    pub lat: Option<f64>,
    pub lon: Option<f64>,
    pub notas: Option<String>,
}

pub async fn visita_admin_tracking_usuario(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    axum::extract::Path(carnet): axum::extract::Path<String>,
    query: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };
    let fecha = query.get("fecha").cloned();

    match client
        .query(
            "EXEC sp_vc_tracking_por_dia_rust @P1, @P2",
            &[&carnet, &fecha],
        )
        .await
    {
        Ok(st) => {
            if let Ok(rows) = st.into_first_result().await {
                let items: Vec<serde_json::Value> = rows
                    .into_iter()
                    .map(|r| crate::handlers::equipo::row_to_json(&r))
                    .collect();
                return (axum::http::StatusCode::OK, Json(items)).into_response();
            }
        }
        Err(e) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    }
    (axum::http::StatusCode::OK, Json(serde_json::json!([]))).into_response()
}

pub async fn visita_admin_listar_agenda(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    axum::extract::Path(carnet): axum::extract::Path<String>,
    query: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };
    let fecha = query.get("fecha").cloned();
    let sql = "SELECT a.*, c.nombre as clienteNombre, c.codigo as clienteCodigo, c.direccion as clienteDireccion \
               FROM vc_agenda a LEFT JOIN vc_clientes c ON a.cliente_id = c.id \
               WHERE a.carnet = @P1 AND (@P2 IS NULL OR CAST(a.fecha AS DATE) = CAST(@P2 AS DATE)) \
               ORDER BY a.fecha ASC, a.orden ASC";
    match client.query(sql, &[&carnet, &fecha]).await {
        Ok(st) => {
            if let Ok(rows) = st.into_first_result().await {
                let items: Vec<serde_json::Value> = rows
                    .into_iter()
                    .map(|r| crate::handlers::equipo::row_to_json(&r))
                    .collect();
                return (axum::http::StatusCode::OK, Json(items)).into_response();
            }
        }
        Err(e) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    }
    (axum::http::StatusCode::OK, Json(serde_json::json!([]))).into_response()
}

pub async fn visita_admin_crear_agenda(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Json(dto): Json<VisitaAdminAgendaDto>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };

    let fecha_dt = match chrono::NaiveDateTime::parse_from_str(
        &format!("{} 00:00:00", dto.fecha),
        "%Y-%m-%d %H:%M:%S",
    ) {
        Ok(f) => f,
        Err(_) => {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                Json(serde_json::json!({"error": "Invalid date"})),
            )
                .into_response()
        }
    };

    match client
        .query(
            "EXEC sp_vc_agenda_crear_rust @P1, @P2, @P3, @P4, @P5",
            &[
                &dto.carnet,
                &dto.cliente_id,
                &fecha_dt,
                &dto.orden,
                &dto.notas,
            ],
        )
        .await
    {
        Ok(st) => {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.into_iter().next() {
                    return (
                        axum::http::StatusCode::OK,
                        Json(crate::handlers::equipo::row_to_json(&r)),
                    )
                        .into_response();
                }
            }
        }
        Err(e) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    }
    (axum::http::StatusCode::OK, Json(serde_json::json!({}))).into_response()
}

pub async fn visita_admin_reordenar_agenda(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    axum::extract::Path(id): axum::extract::Path<i32>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };
    let nuevo_orden = body
        .get("nuevo_orden")
        .and_then(|v| v.as_i64())
        .unwrap_or(0) as i32;
    let res = match client
        .execute(
            "EXEC sp_vc_agenda_reordenar_rust @P1, @P2",
            &[&id, &nuevo_orden],
        )
        .await
    {
        Ok(_) => (
            axum::http::StatusCode::OK,
            Json(serde_json::json!({"ok": true})),
        )
            .into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": e.to_string()})),
        )
            .into_response(),
    };
    res
}

pub async fn visita_admin_eliminar_agenda(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    axum::extract::Path(id): axum::extract::Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };
    let res = match client
        .execute("EXEC sp_vc_agenda_eliminar_rust @P1", &[&id])
        .await
    {
        Ok(_) => (
            axum::http::StatusCode::OK,
            Json(serde_json::json!({"ok": true})),
        )
            .into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": e.to_string()})),
        )
            .into_response(),
    };
    res
}

pub async fn visita_admin_listar_metas(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    query: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };
    // Zero Inline SQL: Usar sp_Visita_ObtenerMetas
    let carnet = query.get("carnet").cloned();
    let items = match crate::handlers::equipo::exec_sp_to_json_result(
        &mut client,
        "EXEC sp_Visita_ObtenerMetas_rust @carnet=@P1",
        &[&carnet],
    )
    .await
    {
        Ok(items) => items,
        Err(e) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e })),
            )
                .into_response()
        }
    };
    (axum::http::StatusCode::OK, Json(items)).into_response()
}

pub async fn visita_admin_set_meta(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Json(dto): Json<VisitaAdminMetaDto>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };

    let costo_km = dto.costo_km.unwrap_or(0.0) as f32; // Assuming sp expects decimal/float mappings which f32 can accommodate often for 10,4

    let vd = dto.vigente_desde.and_then(|d| {
        chrono::NaiveDate::parse_from_str(&d, "%Y-%m-%d")
            .ok()
            .map(|dt| dt.and_hms_opt(0, 0, 0).unwrap())
    });
    let vh = dto.vigente_hasta.and_then(|d| {
        chrono::NaiveDate::parse_from_str(&d, "%Y-%m-%d")
            .ok()
            .map(|dt| dt.and_hms_opt(0, 0, 0).unwrap())
    });

    match client
        .query(
            "EXEC sp_vc_meta_set_rust @P1, @P2, @P3, @P4, @P5",
            &[&dto.carnet, &dto.meta_visitas, &costo_km, &vd, &vh],
        )
        .await
    {
        Ok(st) => {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.into_iter().next() {
                    return (
                        axum::http::StatusCode::OK,
                        Json(crate::handlers::equipo::row_to_json(&r)),
                    )
                        .into_response();
                }
            }
        }
        Err(e) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    }
    (axum::http::StatusCode::OK, Json(serde_json::json!({}))).into_response()
}

#[derive(Deserialize)]
pub struct VisitaCheckoutRequest {
    #[serde(rename = "id_visita")]
    pub id_visita: i32,
    pub lat: Option<f64>,
    pub lon: Option<f64>,
    pub notas: Option<String>,
}

#[derive(Deserialize)]
pub struct VisitaAdminClienteDto {
    pub codigo: Option<String>,
    pub nombre: Option<String>,
    pub direccion: Option<String>,
    pub telefono: Option<String>,
    pub contacto: Option<String>,
    pub lat: Option<f64>,
    pub long: Option<f64>,
    pub radio_metros: Option<i32>,
    pub zona: Option<String>,
    pub activo: Option<bool>,
}

#[derive(Deserialize)]
pub struct VisitaAdminAgendaDto {
    pub carnet: String,
    pub cliente_id: i32,
    pub fecha: String,
    pub orden: Option<i32>,
    pub notas: Option<String>,
}

#[derive(Deserialize)]
pub struct VisitaAdminMetaDto {
    pub carnet: String,
    pub meta_visitas: i32,
    pub costo_km: Option<f64>,
    pub vigente_desde: Option<String>,
    pub vigente_hasta: Option<String>,
}
