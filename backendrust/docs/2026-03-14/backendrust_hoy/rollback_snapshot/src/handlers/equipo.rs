#![allow(dead_code)]
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use std::collections::HashMap;
use futures_util::StreamExt;

use crate::auth::AuthUser;
use crate::state::ApiState;

/// Helper type alias for pool connections
type PoolConn<'a> = bb8::PooledConnection<'a, bb8_tiberius::ConnectionManager>;

/// GET /equipo/hoy?fecha=YYYY-MM-DD
pub async fn equipo_hoy(
    user: AuthUser,
    State(state): State<ApiState>,
    query_params: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let fecha = query_params.get("fecha").cloned().unwrap_or_default();
    let carnet = user.carnet().to_string();
    if carnet.is_empty() {
        return (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({ "miembros": [], "resumenAnimo": {"feliz":0,"neutral":0,"triste":0,"promedio":0} })))).into_response();
    }

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    // 1. Get visible carnets via SP
    let visible_carnets = match get_visible_carnets(&mut client, &carnet).await {
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
    drop(client); // return to pool so we can re-use connection

    // 2. Get member details, 3. Get checkins, 4. Get stats concurrently
    let (miembros, checkins, stats) = tokio::join!(
        async {
            if let Ok(mut c) = pool.get().await {
                exec_sp_to_json(&mut c, "EXEC sp_Usuarios_ObtenerDetallesPorCarnets_rust @P1", &[&csv.as_str()]).await
            } else { vec![] }
        },
        async {
            if let Ok(mut c) = pool.get().await {
                exec_sp_to_json(&mut c, "EXEC sp_Checkins_ObtenerPorEquipoFecha_rust @P1, @P2", &[&csv.as_str(), &f.as_str()]).await
            } else { vec![] }
        },
        async {
            if let Ok(mut c) = pool.get().await {
                exec_sp_to_json(&mut c, "EXEC sp_Equipo_ObtenerHoy_rust @P1, @P2", &[&csv.as_str(), &f.as_str()]).await
            } else { vec![] }
        }
    );

    // 5. Map results
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

    // Mood summary
    let animos: Vec<&str> = checkins.iter()
        .filter_map(|c| c.get("estadoAnimo").and_then(|v| v.as_str()))
        .collect();
    let feliz = animos.iter().filter(|a| **a == "Tope" || **a == "Bien").count();
    let neutral = animos.iter().filter(|a| **a == "Neutral" || a.is_empty()).count();
    let triste = animos.iter().filter(|a| **a == "Bajo").count();
    let promedio = if !result_miembros.is_empty() { (animos.len() as f64 / result_miembros.len() as f64) * 100.0 } else { 0.0 };

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "miembros": result_miembros,
        "resumenAnimo": { "feliz": feliz, "neutral": neutral, "triste": triste, "promedio": promedio }
    })))).into_response()
}


/// GET /equipo/inform?fecha=YYYY-MM-DD
pub async fn equipo_inform(
    user: AuthUser,
    State(state): State<ApiState>,
    query_params: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let fecha = query_params.get("fecha").cloned().unwrap_or_default();
    let carnet = user.carnet().to_string();
    if carnet.is_empty() {
        return (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({ "miembros": [], "resumenAnimo": {"feliz":0,"neutral":0,"triste":0,"promedio":0} })))).into_response();
    }

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let visible_carnets = match get_visible_carnets(&mut client, &carnet).await {
        Ok(v) => v,
        Err(_) => vec![carnet.clone()],
    };
    if visible_carnets.is_empty() {
        return (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({ "miembros": [], "resumenAnimo": {"feliz":0,"neutral":0,"triste":0,"promedio":0} })))).into_response();
    }

    let carnets_csv = visible_carnets.join(",");

    let miembros = exec_sp_to_json(&mut client, "EXEC sp_Usuarios_ObtenerDetallesPorCarnets_rust @P1", &[&carnets_csv.as_str()]).await;
    let checkins = exec_sp_to_json(&mut client, "EXEC sp_Checkins_ObtenerPorEquipoFecha_rust @P1, @P2", &[&carnets_csv, &fecha]).await;
    let stats = exec_sp_to_json(&mut client, "EXEC sp_Equipo_ObtenerInforme_rust @P1, @P2", &[&carnets_csv, &fecha]).await;

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

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "miembros": result_miembros,
        "resumenAnimo": { "feliz": feliz, "neutral": neutral, "triste": triste, "promedio": promedio }
    })))).into_response()
}

/// GET /equipo/bloqueos?fecha=YYYY-MM-DD
pub async fn equipo_bloqueos(
    user: AuthUser,
    State(state): State<ApiState>,
    _query_params: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let carnet = user.carnet().to_string();
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let visible_carnets = match get_visible_carnets(&mut client, &carnet).await {
        Ok(v) => v,
        Err(_) => return Json(serde_json::json!([])).into_response(),
    };
    if visible_carnets.is_empty() {
        return Json(serde_json::json!([])).into_response();
    }

    let carnets_csv = visible_carnets.join(",");

    // Get idUsuarios for these carnets
    let query = format!(
        "SELECT b.*, u1.nombre as origenNombre, u2.nombre as destinoNombre, \
         t.nombre as tareaNombre, t.idProyecto, p.nombre as proyectoNombre \
         FROM p_Bloqueos b \
         LEFT JOIN p_Usuarios u1 ON b.idOrigenUsuario = u1.idUsuario \
         LEFT JOIN p_Usuarios u2 ON b.idDestinoUsuario = u2.idUsuario \
         LEFT JOIN p_Tareas t ON b.idTarea = t.idTarea \
         LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto \
         WHERE b.estado = 'Activo' \
         AND (u1.carnet IN (SELECT value FROM STRING_SPLIT(@P1, ',')) \
              OR u2.carnet IN (SELECT value FROM STRING_SPLIT(@P1, ','))) \
         ORDER BY b.creadoEn DESC"
    );

    let rows = exec_query_to_json(&mut client, &query, &[&carnets_csv.as_str()]).await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

/// GET /equipo/backlog
pub async fn equipo_backlog(
    user: AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let carnet = user.carnet().to_string();
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let visible_carnets = match get_visible_carnets(&mut client, &carnet).await {
        Ok(v) => v,
        Err(_) => return Json(serde_json::json!([])).into_response(),
    };
    if visible_carnets.is_empty() {
        return Json(serde_json::json!([])).into_response();
    }

    let carnets_csv = visible_carnets.join(",");

    let query = "SELECT t.idTarea, t.nombre, t.fechaObjetivo, t.prioridad, t.estado, \
                 u.nombre as responsable, u.carnet \
                 FROM p_Tareas t \
                 INNER JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea \
                 INNER JOIN p_Usuarios u ON ta.idUsuario = u.idUsuario \
                 WHERE u.carnet IN (SELECT value FROM STRING_SPLIT(@P1, ',')) \
                   AND t.activo = 1 \
                   AND t.estado IN ('Pendiente', 'EnCurso') \
                   AND (t.fechaObjetivo IS NULL OR t.fechaObjetivo < CAST(GETDATE() AS DATE)) \
                 ORDER BY t.fechaObjetivo ASC";

    let rows = exec_query_to_json(&mut client, query, &[&carnets_csv.as_str()]).await;
    Json(rows).into_response()
}

/// GET /equipo/miembro/:idUsuario
pub async fn equipo_miembro(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id_usuario): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    // Get carnet of the member
    let member_carnet = get_carnet_by_id(&mut client, id_usuario).await;
    if member_carnet.is_empty() {
        return (StatusCode::NOT_FOUND, Json(serde_json::json!({"message": "Miembro no encontrado"}))).into_response();
    }

    let details = exec_sp_to_json(&mut client, "EXEC sp_Usuarios_ObtenerDetallesPorCarnets_rust @P1", &[&member_carnet.as_str()]).await;
    if let Some(mut emp) = details.into_iter().next() {
        // Renombrar subgerencia a area para la compatibilidad con el frontend
        if let Some(sub) = emp.get("subgerencia").cloned() {
            emp.as_object_mut().unwrap().insert("area".to_string(), sub);
        }
        (StatusCode::OK, Json(crate::models::ApiResponse::success(emp))).into_response()
    } else {
        (StatusCode::NOT_FOUND, Json(crate::models::ApiResponse::error("Detalles de miembro no encontrados".to_string(), 404))).into_response()
    }
}


/// GET /equipo/miembro/:idUsuario/tareas
pub async fn equipo_miembro_tareas(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id_usuario): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let member_carnet = get_carnet_by_id(&mut client, id_usuario).await;
    if member_carnet.is_empty() {
        return Json(serde_json::json!([])).into_response();
    }

    let tareas = exec_sp_to_json(&mut client, "EXEC sp_Tareas_ObtenerPorUsuario_rust @P1, NULL, NULL, NULL, NULL, NULL", &[&member_carnet.as_str()]).await;
    Json(tareas).into_response()
}

/// GET /equipo/miembro/:idUsuario/bloqueos
pub async fn equipo_miembro_bloqueos(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id_usuario): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let query = "SELECT b.*, u1.nombre as origenNombre, u2.nombre as destinoNombre \
                 FROM p_Bloqueos b \
                 LEFT JOIN p_Usuarios u1 ON b.idOrigenUsuario = u1.idUsuario \
                 LEFT JOIN p_Usuarios u2 ON b.idDestinoUsuario = u2.idUsuario \
                 WHERE b.estado = 'Activo' AND (b.idOrigenUsuario = @P1 OR b.idDestinoUsuario = @P1) \
                 ORDER BY b.creadoEn DESC";

    let id_str = id_usuario.to_string();
    let rows = exec_query_to_json(&mut client, query, &[&id_str]).await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

/// GET /equipo/actividad?page=1&limit=50&query=...
pub async fn equipo_actividad(
    user: AuthUser,
    State(state): State<ApiState>,
    query_params: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let carnet = user.carnet().to_string();
    let page: i32 = query_params.get("page").and_then(|v| v.parse().ok()).unwrap_or(1);
    let limit: i32 = query_params.get("limit").and_then(|v| v.parse().ok()).unwrap_or(50);
    let search = query_params.get("query").cloned().unwrap_or_default();

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let visible_carnets = match get_visible_carnets(&mut client, &carnet).await {
        Ok(v) => v,
        Err(_) => vec![carnet.clone()],
    };
    let carnets_csv = visible_carnets.join(",");

    let offset = (page - 1) * limit;
    let query = format!(
        "SELECT al.*, u.nombre as usuarioNombre, u.carnet as usuarioCarnet \
         FROM p_AuditLogs al \
         LEFT JOIN p_Usuarios u ON al.idUsuario = u.idUsuario \
         WHERE u.carnet IN (SELECT value FROM STRING_SPLIT(@P1, ',')) \
         {} \
         ORDER BY al.fecha DESC \
         OFFSET {} ROWS FETCH NEXT {} ROWS ONLY",
        if !search.is_empty() { format!("AND (al.accion LIKE '%{}%' OR al.detalle LIKE '%{}%')", search, search) } else { String::new() },
        offset, limit
    );

    let rows = exec_query_to_json(&mut client, &query, &[&carnets_csv.as_str()]).await;
    Json(crate::models::ApiResponse::success(serde_json::json!({ "items": rows, "total": rows.len(), "page": page, "limit": limit }))).into_response()
}

/// GET /equipo/actividad/:id
pub async fn equipo_actividad_detail(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"message": e.to_string()}))).into_response(),
    };

    let id_str = id.to_string();
    let rows = exec_query_to_json(&mut client, "SELECT * FROM p_AuditLogs WHERE idLog = @P1", &[&id_str]).await;
    Json(rows.into_iter().next().unwrap_or(serde_json::json!(null))).into_response()
}

// ==========================================
// HELPERS — reusable across this module
// ==========================================

use tiberius::Row;

/// Get visible carnets for a user via SP
pub async fn get_visible_carnets(
    client: &mut PoolConn<'_>,
    carnet: &str,
) -> Result<Vec<String>, String> {
    let stream = client.query("EXEC sp_Visibilidad_ObtenerCarnets_rust @P1", &[&carnet])
        .await.map_err(|e: tiberius::error::Error| e.to_string())?;
    let rows: Vec<Row> = stream.into_first_result()
        .await.map_err(|e: tiberius::error::Error| e.to_string())?;
    let mut carnets: Vec<String> = rows.iter().filter_map(|r: &Row| {
        r.try_get::<&str, _>("carnet").ok().flatten().map(|s: &str| s.trim().to_string()).filter(|s: &String| !s.is_empty())
    }).collect();
    carnets.sort();
    carnets.dedup();
    Ok(carnets)
}

/// Get carnet by user ID
pub async fn get_carnet_by_id(
    client: &mut PoolConn<'_>,
    id_usuario: i32,
) -> String {
    match client.query("SELECT carnet FROM p_Usuarios WHERE idUsuario = @P1", &[&id_usuario]).await {
        Ok(stream) => {
            let rows: Result<Vec<Row>, _> = stream.into_first_result().await;
            match rows {
                Ok(rows) => rows.into_iter().next()
                    .and_then(|r: Row| r.try_get::<&str, _>("carnet").ok().flatten().map(|s: &str| s.trim().to_string()))
                    .unwrap_or_default(),
                Err(_) => String::new(),
            }
        },
        Err(_) => String::new(),
    }
}

/// Execute SP and return results as Vec<serde_json::Value>
pub async fn exec_sp_to_json(
    client: &mut PoolConn<'_>,
    sp_call: &str,
    params: &[&dyn tiberius::ToSql],
) -> Vec<serde_json::Value> {
    match client.query(sp_call, params).await {
        Ok(stream) => {
            let rows: Result<Vec<Row>, _> = stream.into_first_result().await;
            match rows {
                Ok(rows) => rows.iter().map(|r: &Row| row_to_json(r)).collect(),
                Err(e) => {
                    tracing::error!("Error procesando resultado de SP {}: {}", sp_call, e);
                    vec![]
                }
            }
        },
        Err(e) => {
            tracing::error!("Error ejecutando SP {}: {}", sp_call, e);
            vec![]
        }
    }
}

/// Execute SP and return multiple recordsets
pub async fn exec_sp_multi_to_json(
    client: &mut PoolConn<'_>,
    sp_call: &str,
    params: &[&dyn tiberius::ToSql],
) -> Vec<Vec<serde_json::Value>> {
    let mut results = Vec::new();
    let mut current_rs = Vec::new();
    
    match client.query(sp_call, params).await {
        Ok(mut stream) => {
            while let Some(item) = stream.next().await {
                match item {
                    Ok(tiberius::QueryItem::Row(row)) => {
                        current_rs.push(row_to_json(&row));
                    }
                    Ok(_) => {
                        // Al terminar un resultset o recibir otro tipo de item (Metadata/Done)
                        if !current_rs.is_empty() {
                            results.push(std::mem::take(&mut current_rs));
                        }
                    }
                    Err(_) => break,
                }
            }
            if !current_rs.is_empty() {
                results.push(current_rs);
            }
        },
        Err(_) => {}
    }
    results
}

/// Execute raw query and return results as Vec<serde_json::Value>
pub async fn exec_query_to_json(
    client: &mut PoolConn<'_>,
    query: &str,
    params: &[&dyn tiberius::ToSql],
) -> Vec<serde_json::Value> {
    match client.query(query, params).await {
        Ok(stream) => {
            let rows: Result<Vec<Row>, _> = stream.into_first_result().await;
            match rows {
                Ok(rows) => rows.iter().map(|r: &Row| row_to_json(r)).collect(),
                Err(_) => vec![],
            }
        },
        Err(_) => vec![],
    }
}

/// Convert a tiberius Row to serde_json::Value using column metadata
pub fn row_to_json(row: &Row) -> serde_json::Value {
    let mut map = serde_json::Map::new();
    for (i, col) in row.columns().iter().enumerate() {
        let name = col.name().to_string();
        let val: serde_json::Value = match col.column_type() {
            tiberius::ColumnType::Int4 | tiberius::ColumnType::Int2 | tiberius::ColumnType::Int1 => {
                row.try_get::<i32, _>(i).ok().flatten().map(serde_json::Value::from).unwrap_or(serde_json::Value::Null)
            }
            tiberius::ColumnType::Int8 | tiberius::ColumnType::Intn => {
                // Try i64 first, fallback to i32
                if let Ok(Some(v)) = row.try_get::<i64, _>(i) {
                    serde_json::Value::from(v)
                } else if let Ok(Some(v)) = row.try_get::<i32, _>(i) {
                    serde_json::Value::from(v)
                } else {
                    serde_json::Value::Null
                }
            }
            tiberius::ColumnType::Bit | tiberius::ColumnType::Bitn => {
                row.try_get::<bool, _>(i).ok().flatten().map(serde_json::Value::from).unwrap_or(serde_json::Value::Null)
            }
            tiberius::ColumnType::Float4 | tiberius::ColumnType::Float8 | tiberius::ColumnType::Floatn => {
                row.try_get::<f64, _>(i).ok().flatten().map(serde_json::Value::from).unwrap_or(serde_json::Value::Null)
            }
            // Catch-all for dates, strings and any other types
            _ => {
                if let Ok(Some(dt)) = row.try_get::<chrono::NaiveDateTime, _>(i) {
                    serde_json::Value::String(dt.format("%Y-%m-%dT%H:%M:%S").to_string())
                } else if let Ok(Some(d)) = row.try_get::<chrono::NaiveDate, _>(i) {
                    serde_json::Value::String(d.format("%Y-%m-%d").to_string())
                } else if let Ok(Some(s)) = row.try_get::<&str, _>(i) {
                    serde_json::Value::String(s.to_string())
                } else {
                    serde_json::Value::Null
                }
            }
        };
        map.insert(name, val);
    }
    serde_json::Value::Object(map)
}






