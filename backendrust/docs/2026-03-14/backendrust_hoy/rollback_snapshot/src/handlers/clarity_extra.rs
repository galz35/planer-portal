#![allow(dead_code)]
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::collections::HashMap;

use crate::auth::AuthUser;
use crate::state::ApiState;
use super::equipo::{exec_sp_to_json, exec_query_to_json};

// ==========================================
// FOCO DIARIO â€” 6 endpoints
// ==========================================

/// GET /foco?fecha=YYYY-MM-DD
pub async fn foco_list(
    user: AuthUser,
    State(state): State<ApiState>,
    query_params: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let fecha = query_params.get("fecha").cloned().unwrap_or_default();
    let user_id = user.user_id();
    let user_id_str = user_id.to_string();

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let query = "SELECT f.idFoco, f.idTarea, f.fecha, f.esEstrategico, f.completado, f.orden, \
                 t.nombre as tituloTarea, t.estado as estadoTarea \
                 FROM p_FocoDiario_v2 f \
                 INNER JOIN p_Tareas t ON f.idTarea = t.idTarea \
                 WHERE f.idUsuario = @P1 AND CAST(f.fecha AS DATE) = CAST(@P2 AS DATE) \
                 ORDER BY f.orden ASC";

    let rows = exec_query_to_json(&mut client, query, &[&user_id_str, &fecha]).await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

/// POST /foco
pub async fn foco_create(
    user: AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<FocoCreateRequest>,
) -> impl IntoResponse {
    let user_id = user.user_id() as i32;

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    // Check if exists
    let check = "SELECT idFoco FROM p_FocoDiario_v2 WHERE idUsuario = @P1 AND idTarea = @P2 AND CAST(fecha AS DATE) = CAST(@P3 AS DATE)";
    let existing = exec_query_to_json(&mut client, check, &[&user_id, &body.id_tarea, &body.fecha.as_str()]).await;
    if !existing.is_empty() {
        return Json(existing[0].clone()).into_response();
    }

    // Get next order
    let max_q = "SELECT COALESCE(MAX(orden), 0) + 1 as nextOrden FROM p_FocoDiario_v2 WHERE idUsuario = @P1 AND CAST(fecha AS DATE) = CAST(@P2 AS DATE)";
    let ord = exec_query_to_json(&mut client, max_q, &[&user_id, &body.fecha.as_str()]).await;
    let next_orden: i32 = ord.first().and_then(|v| v.get("nextOrden")).and_then(|v| v.as_i64()).unwrap_or(1) as i32;

    let es_estrategico = body.es_estrategico.unwrap_or(false);

    let insert = "INSERT INTO p_FocoDiario_v2 (idUsuario, idTarea, fecha, esEstrategico, completado, orden, creadoEn) \
                  VALUES (@P1, @P2, @P3, @P4, 0, @P5, GETDATE()); SELECT SCOPE_IDENTITY() as id;";

    let result = exec_query_to_json(&mut client, insert, &[&user_id, &body.id_tarea, &body.fecha.as_str(), &es_estrategico, &next_orden]).await;
    let data = result.first().cloned().unwrap_or(serde_json::json!({"success": true}));
    Json(crate::models::ApiResponse::success(data)).into_response()
}

/// PATCH /foco/:id?fecha=...
pub async fn foco_update(
    user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    query_params: axum::extract::Query<HashMap<String, String>>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let user_id = user.user_id() as i32;

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let mut updates = Vec::new();
    if body.get("esEstrategico").is_some() {
        let val = body["esEstrategico"].as_bool().unwrap_or(false);
        updates.push(format!("esEstrategico = {}", if val { 1 } else { 0 }));
    }
    if body.get("completado").is_some() {
        let val = body["completado"].as_bool().unwrap_or(false);
        updates.push(format!("completado = {}", if val { 1 } else { 0 }));
    }

    if updates.is_empty() {
        return Json(serde_json::json!({"success": true})).into_response();
    }

    let query = format!("UPDATE p_FocoDiario_v2 SET {} WHERE idFoco = @P1 AND idUsuario = @P2", updates.join(", "));
    let _ = client.execute(&*query, &[&id, &user_id]).await;

    // Return updated list if fecha present
    if let Some(fecha) = query_params.get("fecha") {
        let user_id_str = user_id.to_string();
        let list_q = "SELECT f.idFoco, f.idTarea, f.fecha, f.esEstrategico, f.completado, f.orden, \
                      t.nombre as tituloTarea, t.estado as estadoTarea \
                      FROM p_FocoDiario_v2 f INNER JOIN p_Tareas t ON f.idTarea = t.idTarea \
                      WHERE f.idUsuario = @P1 AND CAST(f.fecha AS DATE) = CAST(@P2 AS DATE) ORDER BY f.orden ASC";
        let fecha_str: &str = fecha.as_str();
        let rows = exec_query_to_json(&mut client, list_q, &[&user_id_str, &fecha_str]).await;
        return Json(rows).into_response();
    }

    Json(serde_json::json!({"success": true})).into_response()
}

/// DELETE /foco/:id
pub async fn foco_delete(
    user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let user_id = user.user_id() as i32;

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let _ = client.execute("DELETE FROM p_FocoDiario_v2 WHERE idFoco = @P1 AND idUsuario = @P2", &[&id, &user_id]).await;
    Json(serde_json::json!({"success": true})).into_response()
}

/// POST /foco/reordenar
pub async fn foco_reordenar(
    user: AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<FocoReordenarRequest>,
) -> impl IntoResponse {
    let user_id = user.user_id() as i32;

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    for (i, id) in body.ids.iter().enumerate() {
        let orden = (i + 1) as i32;
        let _ = client.execute(
            "UPDATE p_FocoDiario_v2 SET orden = @P1 WHERE idFoco = @P2 AND idUsuario = @P3",
            &[&orden, id, &user_id],
        ).await;
    }

    Json(serde_json::json!({"success": true})).into_response()
}

/// GET /foco/estadisticas?month=3&year=2026
pub async fn foco_estadisticas(
    user: AuthUser,
    State(state): State<ApiState>,
    query_params: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id = user.user_id() as i32;
    let month: i32 = query_params.get("month").and_then(|v| v.parse().ok()).unwrap_or_else(|| chrono::Utc::now().month() as i32);
    let year: i32 = query_params.get("year").and_then(|v| v.parse().ok()).unwrap_or_else(|| chrono::Utc::now().year() as i32);

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let query = "SELECT COUNT(*) as totalItems, SUM(CASE WHEN completado = 1 THEN 1 ELSE 0 END) as completados \
                 FROM p_FocoDiario_v2 WHERE idUsuario = @P1 AND MONTH(fecha) = @P2 AND YEAR(fecha) = @P3";

    let rows = exec_query_to_json(&mut client, query, &[&user_id, &month, &year]).await;
    let total = rows.first().and_then(|r| r.get("totalItems")).and_then(|v| v.as_i64()).unwrap_or(0);
    let completados = rows.first().and_then(|r| r.get("completados")).and_then(|v| v.as_i64()).unwrap_or(0);
    let efectividad = if total > 0 { (completados as f64 / total as f64) * 100.0 } else { 0.0 };
    Json(crate::models::ApiResponse::success(serde_json::json!({ "totalItems": total, "completados": completados, "efectividad": efectividad }))).into_response()
}

// ==========================================
// BLOQUEOS â€” 2 endpoints
// ==========================================

/// POST /bloqueos
pub async fn bloqueos_create(
    user: AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let carnet_origen = user.carnet().to_string();
    let id_tarea: i32 = body.get("idTarea").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
    let motivo = body.get("motivo").and_then(|v| v.as_str()).unwrap_or("");
    let destino_texto = body.get("destinoTexto").and_then(|v| v.as_str()).unwrap_or("");
    let accion_mitigacion = body.get("accionMitigacion").and_then(|v| v.as_str()).unwrap_or("");
    let carnet_destino = body.get("carnetDestino").and_then(|v| v.as_str()).unwrap_or("");

    let result = exec_sp_to_json(&mut client,
        "EXEC sp_Tarea_Bloquear_rust @P1, @P2, @P3, @P4, @P5, @P6",
        &[&id_tarea, &carnet_origen.as_str(),
          &(if carnet_destino.is_empty() { None::<&str> } else { Some(carnet_destino) }) as &dyn tiberius::ToSql,
          &motivo, &destino_texto, &accion_mitigacion],
    ).await;

    Json(result.first().cloned().unwrap_or(serde_json::json!({"success": true}))).into_response()
}

/// PATCH /bloqueos/:id/resolver
pub async fn bloqueos_resolver(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let solucion = body.get("solucion").and_then(|v| v.as_str()).unwrap_or("Resuelto manualmente");
    let _ = client.execute(
        "UPDATE p_Bloqueos SET estado = 'Resuelto', resolucion = @P1, fechaResolucion = GETDATE() WHERE idBloqueo = @P2",
        &[&solucion, &id],
    ).await;

    Json(serde_json::json!({"success": true})).into_response()
}

pub async fn checkins_upsert(
    user: AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let carnet = user.carnet().to_string();
    if carnet.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(crate::models::ApiResponse::error("Carnet requerido".to_string(), 400))).into_response();
    }

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    let fecha = body.get("fecha").and_then(|v| v.as_str()).unwrap_or("");
    let prioridad1 = body.get("prioridad1").and_then(|v| v.as_str());
    let prioridad2 = body.get("prioridad2").and_then(|v| v.as_str());
    let prioridad3 = body.get("prioridad3").and_then(|v| v.as_str());
    let entregable_texto = body.get("entregableTexto").and_then(|v| v.as_str());
    let nota = body.get("nota").and_then(|v| v.as_str());
    let link_evidencia = body.get("linkEvidencia").and_then(|v| v.as_str());
    let estado_animo = body.get("estadoAnimo").and_then(|v| v.as_str());
    let energia: Option<i32> = body.get("energia").and_then(|v| v.as_i64()).map(|v| v as i32);
    let id_nodo: Option<i32> = body.get("idNodo").and_then(|v| v.as_i64()).map(|v| v as i32);

    // Build checkin task lists
    let entrego: Vec<String> = body.get("entrego").and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| {
            if let Some(n) = v.as_i64() { Some(n.to_string()) }
            else if let Some(s) = v.as_str() { Some(s.to_string()) }
            else { None }
        }).collect())
        .unwrap_or_default();
    let avanzo: Vec<String> = body.get("avanzo").and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| {
            if let Some(n) = v.as_i64() { Some(n.to_string()) }
            else if let Some(s) = v.as_str() { Some(s.to_string()) }
            else { None }
        }).collect())
        .unwrap_or_default();
    let extras: Vec<String> = body.get("extras").and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| {
            if let Some(n) = v.as_i64() { Some(n.to_string()) }
            else if let Some(s) = v.as_str() { Some(s.to_string()) }
            else { None }
        }).collect())
        .unwrap_or_default();

    let result = exec_query_to_json(&mut client,
        "EXEC sp_Checkin_Upsert_rust @P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8, @P9, @P10, @P11",
        &[&carnet.as_str(), &fecha, &prioridad1, &prioridad2, &prioridad3,
          &entregable_texto, &nota, &link_evidencia, &estado_animo, &energia, &id_nodo],
    ).await;

    let id_checkin = result.first().and_then(|r| r.get("idCheckin")).and_then(|v| v.as_i64()).unwrap_or(0) as i32;

    if id_checkin <= 0 {
        tracing::error!("sp_Checkin_Upsert_rust no devolvió idCheckin válido para carnet={}", carnet);
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(
            "Error al guardar check-in. El SP no devolvió un ID válido.".to_string(), 500
        ))).into_response();
    }

    // Insertar tareas del checkin (el SP ya limpia las anteriores)
    for id_str in &entrego {
        let id_tarea: i32 = id_str.parse().unwrap_or(0);
        if id_tarea > 0 {
            let _ = client.execute(
                "INSERT INTO p_CheckinTareas (idCheckin, idTarea, tipo) SELECT @P1, @P2, 'Entrego' WHERE EXISTS (SELECT 1 FROM p_Tareas WHERE idTarea = @P2)",
                &[&id_checkin, &id_tarea],
            ).await;
        }
    }
    for id_str in &avanzo {
        let id_tarea: i32 = id_str.parse().unwrap_or(0);
        if id_tarea > 0 {
            let _ = client.execute(
                "INSERT INTO p_CheckinTareas (idCheckin, idTarea, tipo) SELECT @P1, @P2, 'Avanzo' WHERE EXISTS (SELECT 1 FROM p_Tareas WHERE idTarea = @P2)",
                &[&id_checkin, &id_tarea],
            ).await;
        }
    }
    for id_str in &extras {
        let id_tarea: i32 = id_str.parse().unwrap_or(0);
        if id_tarea > 0 {
            let _ = client.execute(
                "INSERT INTO p_CheckinTareas (idCheckin, idTarea, tipo) SELECT @P1, @P2, 'Extra' WHERE EXISTS (SELECT 1 FROM p_Tareas WHERE idTarea = @P2)",
                &[&id_checkin, &id_tarea],
            ).await;
        }
    }

    Json(serde_json::json!({"success": true, "idCheckin": id_checkin})).into_response()
}

// ==========================================
// KPIs â€” 1 endpoint
// ==========================================

/// GET /kpis/dashboard
use crate::handlers::equipo::exec_sp_multi_to_json;

pub async fn kpis_dashboard(
    user: AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let carnet = user.carnet().to_string();

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    // sp_Dashboard_Kpis returns 2 resultsets: [0] Summary, [1] Projects
    let recordsets: Vec<Vec<serde_json::Value>> = exec_sp_multi_to_json(&mut client, "EXEC sp_Dashboard_Kpis_rust @P1", &[&carnet.as_str()]).await;
    
    let resumen = recordsets.get(0).and_then(|rs: &Vec<serde_json::Value>| rs.first()).cloned().unwrap_or(serde_json::json!({
        "total": 0, "hechas": 0, "pendientes": 0, "bloqueadas": 0, "promedioAvance": 0
    }));

    let proyectos = recordsets.get(1).cloned().unwrap_or_default();

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "resumen": resumen, 
        "proyectos": proyectos, 
        "avanceMensual": [] 
    })))).into_response()
}

// ==========================================
// VISIBILIDAD â€” 6 endpoints
// ==========================================

/// GET /visibilidad/:carnet
pub async fn visibilidad_carnets(
    State(state): State<ApiState>,
    Path(carnet): Path<String>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let carnets = match super::equipo::get_visible_carnets(&mut client, &carnet).await {
        Ok(v) => v,
        Err(_) => vec![carnet.clone()],
    };
    Json(serde_json::json!({"visibles": carnets, "total": carnets.len()})).into_response()
}

/// GET /visibilidad/:carnet/empleados
pub async fn visibilidad_empleados(
    State(state): State<ApiState>,
    Path(carnet): Path<String>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let carnets = match super::equipo::get_visible_carnets(&mut client, &carnet).await {
        Ok(v) => v,
        Err(_) => return Json(serde_json::json!([])).into_response(),
    };
    if carnets.is_empty() {
        return Json(serde_json::json!([])).into_response();
    }

    let csv = carnets.join(",");
    let rows = exec_sp_to_json(&mut client, "EXEC sp_Usuarios_ObtenerDetallesPorCarnets_rust @P1", &[&csv]).await;
    // Map 'nombre' or 'nombreCompleto' for compatibility
    let mapped_rows: Vec<serde_json::Value> = rows.into_iter().map(|mut r| {
        if let Some(n) = r.get("nombre").cloned().or_else(|| r.get("nombreCompleto").cloned()) {
             r.as_object_mut().unwrap().insert("nombreCompleto".to_string(), n);
        }
        r
    }).collect();

    Json(serde_json::json!({"total": mapped_rows.len(), "empleados": mapped_rows})).into_response()
}

/// GET /visibilidad/:carnet/actores
pub async fn visibilidad_actores(
    State(state): State<ApiState>,
    Path(carnet): Path<String>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let delegaciones = exec_sp_to_json(&mut client, "EXEC sp_DelegacionVisibilidad_ObtenerActivas_rust @P1", &[&carnet.as_str()]).await;
    let mut actores = vec![carnet.clone()];
    for d in &delegaciones {
        if let Some(c) = d.get("carnet_delegante").and_then(|v| v.as_str()) {
            if !c.is_empty() && !actores.contains(&c.to_string()) {
                actores.push(c.to_string());
            }
        }
    }
    Json(serde_json::json!({"carnets": actores, "total": actores.len()})).into_response()
}

/// GET /visibilidad/:carnet/puede-ver/:carnetObjetivo
pub async fn visibilidad_puede_ver(
    State(state): State<ApiState>,
    Path((carnet, carnet_objetivo)): Path<(String, String)>,
) -> impl IntoResponse {
    if carnet == carnet_objetivo {
        return Json(serde_json::json!({"puedeVer": true})).into_response();
    }

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let carnets = match super::equipo::get_visible_carnets(&mut client, &carnet).await {
        Ok(v) => v,
        Err(_) => return Json(serde_json::json!({"puedeVer": false, "razon": "Error obteniendo visibilidad"})).into_response(),
    };
    let puede = carnets.contains(&carnet_objetivo);
    Json(serde_json::json!({
        "puedeVer": puede,
        "razon": if puede { "Acceso concedido por jerarquía o permisos" } else { "No tiene permisos para ver a este colaborador" }
    })).into_response()
}

/// GET /visibilidad/:carnet/quien-puede-verme
pub async fn visibilidad_quien_puede_verme(
    State(_state): State<ApiState>,
    Path(_carnet): Path<String>,
) -> impl IntoResponse {
    // This is a stub in NestJS too (returns [])
    Json(serde_json::json!([])).into_response()
}

/// GET /visibilidad/organizacion/:idorg/subarbol
pub async fn visibilidad_subarbol(
    State(state): State<ApiState>,
    Path(idorg): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let query = "WITH Subarbol AS ( \
                 SELECT id, nombre, idPadre FROM p_OrganizacionNodos WHERE id = @P1 AND activo = 1 \
                 UNION ALL \
                 SELECT n.id, n.nombre, n.idPadre FROM p_OrganizacionNodos n \
                 INNER JOIN Subarbol s ON n.idPadre = s.id WHERE n.activo = 1) \
                 SELECT * FROM Subarbol ORDER BY nombre";

    let rows = exec_query_to_json(&mut client, query, &[&idorg]).await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

// ==========================================
// ACCESO EXTENDED â€” New endpoints
// ==========================================

/// GET /acceso/empleados
pub async fn acceso_empleados_list(
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let query = "SELECT idUsuario, nombre as nombreCompleto, nombre, correo, carnet, cargo, departamento, rolGlobal, pais, activo \
                 FROM p_Usuarios WHERE activo = 1 ORDER BY nombre";
    let rows = exec_query_to_json(&mut client, query, &[]).await;
    (StatusCode::OK, Json(crate::models::ApiResponse::success(rows))).into_response()
}

/// GET /acceso/empleados/buscar?q=texto
pub async fn acceso_empleados_buscar(
    State(state): State<ApiState>,
    query_params: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let q = query_params.get("q").or(query_params.get("query")).cloned().unwrap_or_default();
    if q.is_empty() {
        return Json(serde_json::json!([])).into_response();
    }

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let rows = exec_sp_to_json(&mut client, "EXEC sp_Usuarios_Buscar_rust @P1", &[&q]).await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

/// GET /acceso/empleado/email/:correo
pub async fn acceso_empleado_email(
    State(state): State<ApiState>,
    Path(correo): Path<String>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let query = "SELECT idUsuario, nombre as nombreCompleto, nombre, correo, carnet, cargo, departamento, gerencia, subgerencia, orgDepartamento as area \
                 FROM p_Usuarios WHERE correo = @P1 AND activo = 1";
    let rows = exec_query_to_json(&mut client, query, &[&correo]).await;
    let row = rows.first().cloned();
    let success = row.is_some();
    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "encontrado": success,
        "empleado": row.unwrap_or(serde_json::Value::Null)
    })))).into_response()
}

/// GET /acceso/empleados/gerencia/:nombre
pub async fn acceso_empleados_gerencia(
    State(state): State<ApiState>,
    Path(nombre): Path<String>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let query = "SELECT idUsuario, nombre, correo, carnet, cargo, departamento \
                 FROM p_Usuarios WHERE activo = 1 AND (orgGerencia = @P1 OR orgDepartamento = @P1) \
                 ORDER BY nombre";
    let rows = exec_query_to_json(&mut client, query, &[&nombre]).await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

/// GET /acceso/organizacion/buscar?q=texto
pub async fn acceso_organizacion_buscar(
    State(state): State<ApiState>,
    query_params: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let q = query_params.get("q").or(query_params.get("query")).cloned().unwrap_or_default();
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let search = format!("%{}%", q);
    let query = "SELECT id, nombre, idPadre FROM p_OrganizacionNodos WHERE activo = 1 AND nombre LIKE @P1 ORDER BY nombre";
    let rows = exec_query_to_json(&mut client, query, &[&search]).await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

/// GET /acceso/organizacion/nodo/:idOrg
pub async fn acceso_organizacion_nodo(
    State(state): State<ApiState>,
    Path(id_org): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let query = "SELECT id, nombre, idPadre FROM p_OrganizacionNodos WHERE id = @P1 AND activo = 1";
    let rows = exec_query_to_json(&mut client, query, &[&id_org]).await;
    Json(rows.first().cloned().unwrap_or(serde_json::Value::Null)).into_response()
}

/// GET /acceso/organizacion/nodo/:idOrg/preview
pub async fn acceso_organizacion_nodo_preview(
    State(state): State<ApiState>,
    Path(id_org): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let query = "SELECT u.idUsuario, u.nombre, u.correo, u.carnet, u.cargo \
                 FROM p_Usuarios u WHERE u.idOrg = @P1 AND u.activo = 1 ORDER BY u.nombre";
    let rows = exec_query_to_json(&mut client, query, &[&id_org]).await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

// ==========================================
// DELEGACION â€” 5 endpoints
// ==========================================

/// GET /acceso/delegacion
pub async fn acceso_delegacion_list(
    user: AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let carnet = user.carnet().to_string();
    let rows = exec_sp_to_json(&mut client, "EXEC sp_DelegacionVisibilidad_ObtenerActivas_rust @P1", &[&carnet.as_str()]).await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

/// POST /acceso/delegacion
pub async fn acceso_delegacion_create(
    _user: AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let carnet_delegante = body.get("carnetDelegante").and_then(|v| v.as_str()).unwrap_or("");
    let carnet_delegado = body.get("carnetDelegado").and_then(|v| v.as_str()).unwrap_or("");

    if carnet_delegante.is_empty() || carnet_delegado.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"message": "carnetDelegante y carnetDelegado requeridos"}))).into_response();
    }

    let result = exec_sp_to_json(&mut client, "EXEC sp_DelegacionVisibilidad_Crear_rust @P1, @P2",
        &[&carnet_delegante, &carnet_delegado]).await;
    Json(result.first().cloned().unwrap_or(serde_json::json!({"success": true}))).into_response()
}

/// DELETE /acceso/delegacion/:id
pub async fn acceso_delegacion_delete(
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let _ = client.execute("EXEC sp_DelegacionVisibilidad_Eliminar_rust @P1", &[&id]).await;
    Json(serde_json::json!({"success": true})).into_response()
}

/// GET /acceso/delegacion/delegado/:carnetDelegado
pub async fn acceso_delegacion_delegado(
    State(state): State<ApiState>,
    Path(carnet): Path<String>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let rows = exec_sp_to_json(&mut client, "EXEC sp_DelegacionVisibilidad_ObtenerActivas_rust @P1", &[&carnet.as_str()]).await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

/// GET /acceso/delegacion/delegante/:carnetDelegante
pub async fn acceso_delegacion_delegante(
    State(state): State<ApiState>,
    Path(carnet): Path<String>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let query = "SELECT * FROM p_DelegacionVisibilidad WHERE carnetDelegante = @P1 AND activo = 1";
    let rows = exec_query_to_json(&mut client, query, &[&carnet]).await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

// ==========================================
// PERMISOS â€” 4 endpoints
// ==========================================

/// GET /acceso/permiso-area
pub async fn acceso_permiso_area_list(State(state): State<ApiState>) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };
    let rows = exec_sp_to_json(&mut client, "EXEC sp_PermisoArea_ListarActivos", &[]).await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

/// GET /acceso/permiso-area/:carnetRecibe
pub async fn acceso_permiso_area_por_carnet(
    State(state): State<ApiState>,
    Path(carnet_recibe): Path<String>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };
    let rows = exec_sp_to_json(
        &mut client,
        "EXEC sp_PermisoArea_ObtenerActivosPorRecibe @P1",
        &[&carnet_recibe],
    ).await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

/// POST /acceso/permiso-area
pub async fn acceso_permiso_area_create(
    State(state): State<ApiState>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let carnet_otorga = body.get("carnetOtorga").and_then(|v| v.as_str());
    let carnet_recibe = body.get("carnetRecibe").and_then(|v| v.as_str()).unwrap_or("");
    let id_org_raiz = body.get("idOrgRaiz")
        .and_then(|v| v.as_str().map(|s| s.parse::<i64>().ok()).flatten().or_else(|| v.as_i64()))
        .unwrap_or(0_i64);
    let alcance = body.get("alcance").and_then(|v| v.as_str()).unwrap_or("SUBARBOL");
    let motivo = body.get("motivo").and_then(|v| v.as_str());
    let tipo_acceso = body.get("tipoAcceso").and_then(|v| v.as_str()).unwrap_or("ALLOW");
    let nombre_area = body.get("nombreArea").and_then(|v| v.as_str());
    let tipo_nivel = body.get("tipoNivel").and_then(|v| v.as_str()).unwrap_or("GERENCIA");

    match client.execute(
        "EXEC sp_PermisoArea_Crear @P1, @P2, @P3, @P4, @P5, NULL, @P6, @P7, @P8",
        &[
            &carnet_otorga,
            &carnet_recibe,
            &id_org_raiz,
            &alcance,
            &motivo,
            &tipo_acceso,
            &nombre_area,
            &tipo_nivel,
        ],
    ).await {
        Ok(_) => Json(crate::models::ApiResponse::success(serde_json::json!({
            "success": true,
            "message": "Permiso creado"
        }))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    }
}

/// GET /acceso/permiso-empleado
pub async fn acceso_permiso_empleado_list(State(state): State<ApiState>) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };
    let rows = exec_sp_to_json(&mut client, "EXEC sp_PermisoEmpleado_ListarActivos", &[]).await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

/// GET /acceso/permiso-empleado/:carnetRecibe
pub async fn acceso_permiso_empleado_por_carnet(
    State(state): State<ApiState>,
    Path(carnet_recibe): Path<String>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };
    let rows = exec_sp_to_json(
        &mut client,
        "EXEC sp_PermisoEmpleado_ObtenerActivosPorRecibe @P1",
        &[&carnet_recibe],
    ).await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

/// POST /acceso/permiso-empleado
pub async fn acceso_permiso_empleado_create(
    State(state): State<ApiState>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let carnet_otorga = body.get("carnetOtorga").and_then(|v| v.as_str());
    let carnet_recibe = body.get("carnetRecibe").and_then(|v| v.as_str()).unwrap_or("");
    let carnet_objetivo = body.get("carnetObjetivo").and_then(|v| v.as_str()).unwrap_or("");
    let tipo_acceso = body.get("tipoAcceso").and_then(|v| v.as_str()).unwrap_or("ALLOW");
    let motivo = body.get("motivo").and_then(|v| v.as_str());

    match client.execute(
        "EXEC sp_PermisoEmpleado_Crear @P1, @P2, @P3, @P4, @P5",
        &[&carnet_otorga, &carnet_recibe, &carnet_objetivo, &tipo_acceso, &motivo],
    ).await {
        Ok(_) => Json(crate::models::ApiResponse::success(serde_json::json!({
            "success": true
        }))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    }
}

/// DELETE /acceso/permiso-area/:id | /acceso/permiso-empleado/:id
pub async fn acceso_permiso_delete(
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    axum::extract::OriginalUri(uri): axum::extract::OriginalUri,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let query = if uri.path().contains("permiso-area") {
        "EXEC sp_PermisoArea_Desactivar @P1"
    } else {
        "EXEC sp_PermisoEmpleado_Desactivar @P1"
    };
    match client.execute(query, &[&id]).await {
        Ok(_) => Json(crate::models::ApiResponse::success(serde_json::json!({
            "success": true
        }))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    }
}

// ==========================================
// AGENDA / AUDIT / MISC
// ==========================================

/// GET /agenda/:targetCarnet?fecha=...
pub async fn agenda_target(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(target_carnet): Path<String>,
    query_params: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let _fecha = query_params.get("fecha").cloned().unwrap_or_default();
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let tareas = exec_sp_to_json(&mut client, "EXEC sp_Tareas_ObtenerPorUsuario_rust @P1, NULL, NULL, NULL, NULL, NULL", &[&target_carnet.as_str()]).await;
    Json(tareas).into_response()
}

/// GET /audit-logs/task/:idTarea
pub async fn audit_logs_task(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id_tarea): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let query = "SELECT al.*, u.nombre as usuarioNombre FROM p_AuditLogs al \
                 LEFT JOIN p_Usuarios u ON al.idUsuario = u.idUsuario \
                 WHERE al.entidadTipo = 'Tarea' AND al.entidadId = @P1 ORDER BY al.fecha DESC";
    let rows = exec_query_to_json(&mut client, query, &[&id_tarea]).await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

/// GET /organizacion/catalogo
pub async fn organizacion_catalogo(
    _user: AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    // Use official SP from NestJS
    let rows = exec_sp_to_json(&mut client, "EXEC sp_Organizacion_ObtenerCatalogo_rust", &[]).await;
    
    // NestJS maps index+1 as ID
    let mapped: Vec<serde_json::Value> = rows.into_iter().enumerate().map(|(i, row)| {
        let mut r = row.clone();
        r["id"] = serde_json::json!(i + 1);
        r
    }).collect();

    (StatusCode::OK, Json(crate::models::ApiResponse::success(mapped))).into_response()
}

/// GET /organizacion/estructura-usuarios
pub async fn organizacion_estructura_usuarios(
    _user: AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    // Use official SP from NestJS: sp_Organizacion_ObtenerEstructura
    let rows = exec_sp_to_json(&mut client, "EXEC sp_Organizacion_ObtenerEstructura_rust", &[]).await;
    
    // Ensure format matches { gerencia, subgerencia, area }
    let mapped: Vec<serde_json::Value> = rows.into_iter().map(|row| {
        let mut r = row.clone();
        if let Some(og) = r.get("ogerencia") {
            r["gerencia"] = og.clone();
        }
        r
    }).collect();

    (StatusCode::OK, Json(crate::models::ApiResponse::success(mapped))).into_response()
}

/// GET /recordatorios
pub async fn recordatorios_list(
    user: AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let user_id = user.user_id() as i32;
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let query = "SELECT r.*, t.nombre as tareaTitulo FROM p_Recordatorios r \
                 LEFT JOIN p_Tareas t ON r.idTarea = t.idTarea \
                 WHERE r.idUsuario = @P1 AND r.activo = 1 ORDER BY r.fechaHora ASC";
    let rows = exec_query_to_json(&mut client, query, &[&user_id]).await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

/// DELETE /recordatorios/:id
pub async fn recordatorios_delete(
    user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let user_id = user.user_id() as i32;
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let _ = client.execute(
        "UPDATE p_Recordatorios SET activo = 0 WHERE id = @P1 AND idUsuario = @P2",
        &[&id, &user_id],
    ).await;
    Json(serde_json::json!({"success": true})).into_response()
}

/// GET /reportes/productividad
pub async fn reportes_productividad(
    user: AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let carnet = user.carnet().to_string();
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let query = "SELECT estado, COUNT(*) as total FROM p_Tareas t \
                 INNER JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea \
                 WHERE ta.carnet = @P1 AND t.activo = 1 GROUP BY estado";
    let rows = exec_query_to_json(&mut client, query, &[&carnet.as_str()]).await;
    Json(serde_json::json!({"porEstado": rows})).into_response()
}

/// GET /reportes/bloqueos-trend
pub async fn reportes_bloqueos_trend(
    _user: AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let query = "SELECT CAST(creadoEn AS DATE) as fecha, COUNT(*) as total, \
                 SUM(CASE WHEN estado='Activo' THEN 1 ELSE 0 END) as activos, \
                 SUM(CASE WHEN estado='Resuelto' THEN 1 ELSE 0 END) as resueltos \
                 FROM p_Bloqueos WHERE creadoEn >= DATEADD(day, -30, GETDATE()) \
                 GROUP BY CAST(creadoEn AS DATE) ORDER BY fecha";
    let rows = exec_query_to_json(&mut client, query, &[]).await;
    (StatusCode::OK, Json(crate::models::ApiResponse::success(rows))).into_response()
}

/// GET /reportes/equipo-performance
pub async fn reportes_equipo_performance(
    user: AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let carnet = user.carnet().to_string();
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let visible_carnets = match super::equipo::get_visible_carnets(&mut client, &carnet).await {
        Ok(v) => v,
        Err(_) => return Json(serde_json::json!([])).into_response(),
    };
    let csv = visible_carnets.join(",");

    let query = "SELECT u.nombre, u.carnet, \
                 SUM(CASE WHEN t.estado = 'Hecha' THEN 1 ELSE 0 END) as completadas, \
                 SUM(CASE WHEN t.estado IN ('Pendiente','EnCurso') THEN 1 ELSE 0 END) as pendientes, \
                 COUNT(*) as total \
                 FROM p_Usuarios u \
                 INNER JOIN p_TareaAsignados ta ON u.carnet = ta.carnet \
                 INNER JOIN p_Tareas t ON ta.idTarea = t.idTarea \
                 WHERE u.carnet IN (SELECT value FROM STRING_SPLIT(@P1, ',')) AND t.activo = 1 \
                 GROUP BY u.nombre, u.carnet ORDER BY completadas DESC";
    let rows = exec_query_to_json(&mut client, query, &[&csv]).await;
    (StatusCode::OK, Json(crate::models::ApiResponse::success(rows))).into_response()
}

/// GET /reportes/exportar
pub async fn reportes_exportar(
    user: AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    // Simple export: return all tasks for user
    let carnet = user.carnet().to_string();
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let rows = exec_sp_to_json(&mut client, "EXEC sp_Tareas_ObtenerPorUsuario_rust @P1, NULL, NULL, NULL, NULL, NULL", &[&carnet.as_str()]).await;
    Json(serde_json::json!({"tareas": rows, "total": rows.len()})).into_response()
}

/// GET /reports/agenda-compliance
pub async fn reports_agenda_compliance(
    user: AuthUser,
    State(state): State<ApiState>,
    query_params: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let fecha = query_params.get("fecha").cloned().unwrap_or_else(|| chrono::Utc::now().format("%Y-%m-%d").to_string());
    let carnet = user.carnet().to_string();
    if carnet.is_empty() {
        return (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({ "miembros": [], "resumenAnimo": {"feliz":0,"neutral":0,"triste":0,"promedio":0} })))).into_response();
    }

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let visible_carnets = match super::equipo::get_visible_carnets(&mut client, &carnet).await {
        Ok(v) => v,
        Err(_) => vec![carnet.clone()],
    };
    if visible_carnets.is_empty() {
        return (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({ "miembros": [], "resumenAnimo": {"feliz":0,"neutral":0,"triste":0,"promedio":0} })))).into_response();
    }
    
    let carnets_csv = visible_carnets.join(",");
    let pool = state.pool.clone();
    let csv = carnets_csv.clone();
    let f = fecha.clone();
    drop(client); // re-use connection in tokio::join

    let (miembros, checkins, stats) = tokio::join!(
        async {
            if let Ok(mut c) = pool.get().await {
                super::equipo::exec_sp_to_json(&mut c, "EXEC sp_Usuarios_ObtenerDetallesPorCarnets_rust @P1", &[&csv.as_str()]).await
            } else { vec![] }
        },
        async {
            if let Ok(mut c) = pool.get().await {
                super::equipo::exec_sp_to_json(&mut c, "EXEC sp_Checkins_ObtenerPorEquipoFecha_rust @P1, @P2", &[&csv.as_str(), &f.as_str()]).await
            } else { vec![] }
        },
        async {
            if let Ok(mut c) = pool.get().await {
                super::equipo::exec_sp_to_json(&mut c, "EXEC sp_Equipo_ObtenerHoy_rust @P1, @P2", &[&csv.as_str(), &f.as_str()]).await
            } else { vec![] }
        }
    );

    let result_miembros: Vec<serde_json::Value> = miembros.iter().map(|m| {
        let m_carnet = m.get("carnet").and_then(|v| v.as_str()).unwrap_or("");
        let checkin = checkins.iter().find(|c| c.get("usuarioCarnet").and_then(|v| v.as_str()).unwrap_or("") == m_carnet);
        let user_stats = stats.iter().find(|s| s.get("carnet").and_then(|v| v.as_str()).unwrap_or("") == m_carnet);

        serde_json::json!({
            "usuario": {
                "idUsuario": m.get("idUsuario"),
                "nombre": m.get("nombre").or(m.get("nombreCompleto")),
                "correo": m.get("correo"),
                "carnet": m_carnet,
                "area": m.get("subgerencia").or(m.get("departamento")).or(m.get("orgDepartamento")).unwrap_or(&serde_json::json!("General")),
                "rol": { "nombre": m.get("rolNombre").or(m.get("cargo")).unwrap_or(&serde_json::json!("General")) }
            },
            "checkin": checkin.map(|c| serde_json::json!({
                "idCheckin": c.get("idCheckin"),
                "fecha": c.get("fecha"),
                "estadoAnimo": c.get("estadoAnimo"),
                "nota": c.get("nota"),
                "entregableTexto": c.get("entregableTexto"),
            })),
            "estadisticas": {
                "retrasadas": user_stats.and_then(|s| s.get("retrasadas")).unwrap_or(&serde_json::json!(0)),
                "hoy": user_stats.and_then(|s| s.get("planificadas")).unwrap_or(&serde_json::json!(0)),
                "hechas": user_stats.and_then(|s| s.get("hechas")).unwrap_or(&serde_json::json!(0)),
                "enCurso": user_stats.and_then(|s| s.get("enCurso")).unwrap_or(&serde_json::json!(0)),
                "bloqueadas": user_stats.and_then(|s| s.get("bloqueadas")).unwrap_or(&serde_json::json!(0)),
                "descartadas": user_stats.and_then(|s| s.get("descartadas")).unwrap_or(&serde_json::json!(0)),
            }
        })
    }).collect();

    let animos: Vec<&str> = checkins.iter()
        .filter_map(|c| c.get("estadoAnimo").and_then(|v| v.as_str()))
        .collect();
    let feliz = animos.iter().filter(|a| **a == "Tope" || **a == "Bien").count();
    let neutral = animos.iter().filter(|a| **a == "Neutral" || a.is_empty()).count();
    let triste = animos.iter().filter(|a| **a == "Bajo").count();
    let promedio = if !result_miembros.is_empty() { (animos.len() as f64 / result_miembros.len() as f64) * 100.0 } else { 0.0 };

    Json(crate::models::ApiResponse::success(serde_json::json!({
        "miembros": result_miembros,
        "resumenAnimo": { "feliz": feliz, "neutral": neutral, "triste": triste, "promedio": promedio }
    }))).into_response()
}

/// GET /gerencia/resumen
pub async fn gerencia_resumen(
    user: AuthUser, State(state): State<ApiState>,
) -> impl IntoResponse {
    let carnet = user.carnet().to_string();
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let visible_carnets = match super::equipo::get_visible_carnets(&mut client, &carnet).await {
        Ok(v) => v,
        Err(_) => return Json(serde_json::json!({})).into_response(),
    };

    Json(serde_json::json!({
        "totalMiembros": visible_carnets.len(),
        "carnets": visible_carnets
    })).into_response()
}

/// GET /software/dashboard-stats
pub async fn software_dashboard_stats(
    _user: AuthUser, State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let q = "SELECT (SELECT COUNT(*) FROM p_Usuarios WHERE activo = 1) as totalUsuarios, \
             (SELECT COUNT(*) FROM p_Tareas WHERE activo = 1) as totalTareas, \
             (SELECT COUNT(*) FROM p_Proyectos WHERE activo = 1) as totalProyectos, \
             (SELECT COUNT(*) FROM p_Checkins WHERE fecha >= DATEADD(day, -7, GETDATE())) as checkinsUltimaSemana";
    let rows = exec_query_to_json(&mut client, q, &[]).await;
    Json(rows.first().cloned().unwrap_or(serde_json::json!({}))).into_response()
}

// ==========================================
// CONFIG — GET/POST /config (agendaConfig)
// ==========================================

/// GET /config — retorna vistaPreferida, rutinas, agendaConfig
pub async fn config_get(
    user: AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let user_id = user.user_id() as i32;

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let query = "SELECT agendaConfig FROM p_UsuariosConfig WHERE idUsuario = @P1";
    let rows = exec_query_to_json(&mut client, query, &[&user_id]).await;

    let agenda_config = rows.first()
        .and_then(|r| r.get("agendaConfig"))
        .and_then(|v| v.as_str())
        .and_then(|s| serde_json::from_str::<serde_json::Value>(s).ok())
        .unwrap_or(serde_json::json!({"showGestion": true, "showRapida": true}));

    Json(serde_json::json!({
        "vistaPreferida": "Cards",
        "rutinas": "[]",
        "agendaConfig": agenda_config
    })).into_response()
}

/// POST /config — guardar agendaConfig
pub async fn config_post(
    user: AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let user_id = user.user_id() as i32;

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    if let Some(agenda_config) = body.get("agendaConfig") {
        let config_json = serde_json::to_string(agenda_config).unwrap_or_default();

        // MERGE/Upsert
        let sql = "IF EXISTS (SELECT 1 FROM p_UsuariosConfig WHERE idUsuario = @P1) \
                   UPDATE p_UsuariosConfig SET agendaConfig = @P2, fechaActualizacion = GETDATE() WHERE idUsuario = @P1 \
                   ELSE \
                   INSERT INTO p_UsuariosConfig (idUsuario, agendaConfig, fechaActualizacion) VALUES (@P1, @P2, GETDATE())";
        let _ = client.execute(sql, &[&user_id, &config_json.as_str()]).await;
    }

    Json(serde_json::json!({"success": true})).into_response()
}

// ==========================================
// AGENDA RECURRENTE — GET /agenda-recurrente
// ==========================================

/// GET /agenda-recurrente?fecha=YYYY-MM-DD
pub async fn agenda_recurrente(
    user: AuthUser,
    State(state): State<ApiState>,
    query_params: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let carnet = user.carnet().to_string();
    let fecha = query_params.get("fecha").cloned()
        .unwrap_or_else(|| chrono::Utc::now().format("%Y-%m-%d").to_string());

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let sql = "\
        SET DATEFIRST 1; \
        WITH Inst AS ( \
            SELECT i.idTarea, i.estadoInstancia, i.fechaEjecucion, i.fechaReprogramada, i.comentario, \
                   CAST(1 AS BIT) AS esInstanciaReal \
            FROM p_TareaInstancia i WHERE i.fechaProgramada = @P1 \
        ), \
        RecAplica AS ( \
            SELECT r.idTarea, r.id as idRecurrencia FROM p_TareaRecurrencia r \
            WHERE r.activo = 1 AND @P1 >= r.fechaInicioVigencia \
              AND (@P1 <= r.fechaFinVigencia OR r.fechaFinVigencia IS NULL) \
              AND ( \
                  (r.tipoRecurrencia = 'SEMANAL' \
                   AND CHARINDEX(',' + CAST(DATEPART(WEEKDAY, @P1) AS VARCHAR(2)) + ',', ',' + r.diasSemana + ',') > 0) \
                  OR (r.tipoRecurrencia = 'MENSUAL' AND DAY(@P1) = r.diaMes) \
              ) \
        ) \
        SELECT t.idTarea, t.nombre AS titulo, t.comportamiento, @P1 AS fechaProgramada, \
               COALESCE(inst.estadoInstancia, 'PENDIENTE') AS estadoInstancia, \
               inst.fechaEjecucion, inst.fechaReprogramada, inst.comentario, \
               COALESCE(inst.esInstanciaReal, CAST(0 AS BIT)) AS esInstanciaReal, \
               ra.idRecurrencia \
        FROM p_Tareas t \
        LEFT JOIN Inst inst ON inst.idTarea = t.idTarea \
        LEFT JOIN RecAplica ra ON ra.idTarea = t.idTarea \
        WHERE t.creadorCarnet = @P2 AND t.comportamiento = 'RECURRENTE' \
          AND (inst.idTarea IS NOT NULL OR ra.idTarea IS NOT NULL) \
        ORDER BY CASE COALESCE(inst.estadoInstancia, 'PENDIENTE') \
                 WHEN 'PENDIENTE' THEN 1 WHEN 'REPROGRAMADA' THEN 2 \
                 WHEN 'HECHA' THEN 3 WHEN 'OMITIDA' THEN 4 ELSE 9 END";

    let rows = exec_query_to_json(&mut client, sql, &[&fecha.as_str(), &carnet.as_str()]).await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

// ==========================================
// MODELS
// ==========================================

#[derive(Deserialize)]
pub struct FocoCreateRequest {
    #[serde(rename = "idTarea")]
    pub id_tarea: i32,
    pub fecha: String,
    #[serde(rename = "esEstrategico")]
    pub es_estrategico: Option<bool>,
}

#[derive(Deserialize)]
pub struct FocoReordenarRequest {
    pub ids: Vec<i32>,
}

use chrono::Datelike;


