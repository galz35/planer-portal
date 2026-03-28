#![allow(dead_code)]
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;

use crate::auth::AuthUser;
use crate::state::ApiState;

pub async fn jornada_resolver(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(carnet): Path<String>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };

    let response = match client
        .query("EXEC sp_jornada_resolver_rust @P1, NULL", &[&carnet])
        .await
    {
        Ok(stream) => match stream.into_first_result().await {
            Ok(rows) => {
                if let Some(r) = rows.into_iter().next() {
                    let estado = r.get::<&str, _>("estado").unwrap_or("SIN_ASIGNACION");

                    let format_time = |t: Option<chrono::NaiveTime>| {
                        t.map(|time| time.format("%H:%M:%S").to_string())
                    };

                    Json(serde_json::json!({
                        "success": true,
                        "estado": estado,
                        "fecha": r.get::<chrono::NaiveDate, _>("fecha").map(|d| d.to_string()),
                        "id_horario": r.get::<i32, _>("id_horario"),
                        "nombre_horario": r.get::<&str, _>("nombre_horario"),
                        "hora_entrada": format_time(r.get::<chrono::NaiveTime, _>("hora_entrada")),
                        "hora_salida": format_time(r.get::<chrono::NaiveTime, _>("hora_salida")),
                        "es_nocturno": r.get::<bool, _>("es_nocturno").unwrap_or(false),
                        "es_dia_libre": r.get::<i32, _>("es_dia_libre").unwrap_or(0),
                        "nro_dia_ciclo": r.get::<i32, _>("nro_dia_ciclo"),
                        "nombre_patron": r.get::<&str, _>("nombre_patron"),
                        "total_dias_ciclo": r.get::<i32, _>("total_dias_ciclo"),
                    }))
                    .into_response()
                } else {
                    Json(serde_json::json!({"estado": "SIN_ASIGNACION"})).into_response()
                }
            }
            Err(e) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response(),
        },
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"message": e.to_string()})),
        )
            .into_response(),
    };
    response
}

pub async fn jornada_semana(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(carnet): Path<String>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };

    let response = match client
        .query("EXEC sp_jornada_semana_rust @P1, NULL", &[&carnet])
        .await
    {
        Ok(stream) => match stream.into_first_result().await {
            Ok(rows) => {
                let mut semana = Vec::new();
                let format_time = |t: Option<chrono::NaiveTime>| {
                    t.map(|time| time.format("%H:%M:%S").to_string())
                };
                for r in rows {
                    semana.push(serde_json::json!({
                        "fecha": r.get::<chrono::NaiveDate, _>("fecha").map(|d| d.to_string()),
                        "dia_semana": r.get::<&str, _>("dia_semana"),
                        "estado": r.get::<&str, _>("estado"),
                        "nombre_horario": r.get::<&str, _>("nombre_horario"),
                        "hora_entrada": format_time(r.get::<chrono::NaiveTime, _>("hora_entrada")),
                        "hora_salida": format_time(r.get::<chrono::NaiveTime, _>("hora_salida")),
                        "es_nocturno": r.get::<bool, _>("es_nocturno").unwrap_or(false),
                        "es_dia_libre": r.get::<i32, _>("es_dia_libre").unwrap_or(0),
                        "nro_dia_ciclo": r.get::<i32, _>("nro_dia_ciclo"),
                        "etiqueta_dia": r.get::<&str, _>("etiqueta_dia"),
                    }));
                }
                Json(serde_json::json!(semana)).into_response()
            }
            Err(e) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response(),
        },
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"message": e.to_string()})),
        )
            .into_response(),
    };
    response
}

pub async fn jornada_horarios(_user: AuthUser, State(state): State<ApiState>) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };

    let response = match client
        .query(
            "SELECT * FROM marcaje_horarios WHERE activo = 1 ORDER BY nombre",
            &[],
        )
        .await
    {
        Ok(stream) => match stream.into_first_result().await {
            Ok(rows) => {
                let mut items = Vec::new();
                let format_time = |t: Option<chrono::NaiveTime>| {
                    t.map(|time| time.format("%H:%M:%S").to_string())
                };
                for r in rows {
                    let row_json = crate::handlers::equipo::row_to_json(&r);
                    let duracion_horas = row_json
                        .get("duracion_horas")
                        .and_then(|value| match value {
                            serde_json::Value::Number(number) => number.as_f64(),
                            serde_json::Value::String(raw) => raw.parse::<f64>().ok(),
                            _ => None,
                        });
                    items.push(serde_json::json!({
                        "id_horario": r.get::<i32, _>("id_horario"),
                        "nombre": r.get::<&str, _>("nombre"),
                        "hora_entrada": format_time(r.get::<chrono::NaiveTime, _>("hora_entrada")),
                        "hora_salida": format_time(r.get::<chrono::NaiveTime, _>("hora_salida")),
                        "duracion_horas": duracion_horas,
                        "es_nocturno": r.get::<bool, _>("es_nocturno").unwrap_or(false),
                        "tolerancia_min": r.get::<i32, _>("tolerancia_min"),
                        "descanso_min": r.get::<i32, _>("descanso_min"),
                        "activo": r.get::<bool, _>("activo").unwrap_or(true),
                    }));
                }
                Json(serde_json::json!(items)).into_response()
            }
            Err(e) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response(),
        },
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"message": e.to_string()})),
        )
            .into_response(),
    };
    response
}

pub async fn jornada_patrones(_user: AuthUser, State(state): State<ApiState>) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };

    let rows = match client
        .query(
            "SELECT * FROM marcaje_patrones WHERE activo = 1 ORDER BY nombre",
            &[],
        )
        .await
    {
        Ok(stream) => match stream.into_first_result().await {
            Ok(rows) => rows,
            Err(e) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"message": e.to_string()})),
                )
                    .into_response()
            }
        },
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };

    let mut items = Vec::new();
    for r in rows {
        let id_patron = r.get::<i32, _>("id_patron").unwrap_or(0);
        let detalle_query = "
            SELECT d.*, h.nombre AS nombre_horario, h.hora_entrada, h.hora_salida, h.es_nocturno
            FROM marcaje_patrones_detalle d
            LEFT JOIN marcaje_horarios h ON h.id_horario = d.id_horario
            WHERE d.id_patron = @P1
            ORDER BY d.nro_dia
        ";

        let detalle = match client.query(detalle_query, &[&id_patron]).await {
            Ok(stream) => match stream.into_first_result().await {
                Ok(detalle_rows) => {
                    let format_time = |t: Option<chrono::NaiveTime>| {
                        t.map(|time| time.format("%H:%M:%S").to_string())
                    };
                    detalle_rows
                        .into_iter()
                        .map(|detalle_row| {
                            serde_json::json!({
                                "id_detalle": detalle_row.try_get::<i32, _>("id").ok().flatten(),
                                "id_patron": detalle_row.get::<i32, _>("id_patron"),
                                "nro_dia": detalle_row.get::<i32, _>("nro_dia"),
                                "id_horario": detalle_row.get::<i32, _>("id_horario"),
                                "etiqueta": detalle_row.get::<&str, _>("etiqueta"),
                                "nombre_horario": detalle_row.get::<&str, _>("nombre_horario"),
                                "hora_entrada": format_time(detalle_row.get::<chrono::NaiveTime, _>("hora_entrada")),
                                "hora_salida": format_time(detalle_row.get::<chrono::NaiveTime, _>("hora_salida")),
                                "es_nocturno": detalle_row.get::<bool, _>("es_nocturno").unwrap_or(false),
                            })
                        })
                        .collect::<Vec<_>>()
                }
                Err(_) => Vec::new(),
            },
            Err(_) => Vec::new(),
        };

        items.push(serde_json::json!({
            "id_patron": id_patron,
            "nombre": r.get::<&str, _>("nombre"),
            "total_dias": r.get::<i32, _>("total_dias"),
            "descripcion": r.get::<&str, _>("descripcion"),
            "detalle": detalle,
        }));
    }

    let response = Json(serde_json::json!(items)).into_response();
    response
}

pub async fn jornada_asignaciones(
    _user: AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };

    let query =
        "SELECT a.*, p.nombre AS nombre_patron, p.total_dias, c.nombre AS nombre_colaborador 
                 FROM marcaje_asignacion a 
                 INNER JOIN marcaje_patrones p ON p.id_patron = a.id_patron 
                 LEFT JOIN p_Usuarios c ON c.carnet = a.carnet 
                 WHERE a.activo = 1 ORDER BY c.nombre";

    let response = match client.query(query, &[]).await {
        Ok(stream) => match stream.into_first_result().await {
            Ok(rows) => {
                let mut items = Vec::new();
                for r in rows {
                    items.push(serde_json::json!({
                            "id_asignacion": r.try_get::<i32, _>("id_asignacion").ok().flatten(),
                            "carnet": r.try_get::<&str, _>("carnet").ok().flatten().map(|s| s.trim().to_string()),
                            "id_patron": r.try_get::<i32, _>("id_patron").ok().flatten(),
                            "fecha_inicio": r.try_get::<chrono::NaiveDate, _>("fecha_inicio").ok().flatten().map(|d| d.to_string()),
                            "fecha_fin": r.try_get::<chrono::NaiveDate, _>("fecha_fin").ok().flatten().map(|d| d.to_string()),
                            "activo": r.try_get::<bool, _>("activo").ok().flatten().unwrap_or(true),
                            "nombre_patron": r.try_get::<&str, _>("nombre_patron").ok().flatten().map(|s| s.to_string()),
                            "total_dias": r.try_get::<i32, _>("total_dias").ok().flatten(),
                            "nombre_colaborador": r.try_get::<&str, _>("nombre_colaborador").ok().flatten().map(|s| s.trim().to_string()),
                        }));
                }
                Json(serde_json::json!(items)).into_response()
            }
            Err(e) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response(),
        },
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"message": e.to_string()})),
        )
            .into_response(),
    };
    response
}

// ----- HORARIOS CRUD -----

pub async fn jornada_crear_horario(
    _user: AuthUser,
    State(state): State<ApiState>,
    Json(dto): Json<JornadaHorarioDto>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };
    let duracion = dto.duracion_horas.unwrap_or(8.0) as f32;
    let nocturno = if dto.es_nocturno.unwrap_or(false) {
        1_i32
    } else {
        0_i32
    };
    let tolerancia = dto.tolerancia_min.unwrap_or(10);
    let descanso = dto.descanso_min.unwrap_or(60);

    let query = "
        INSERT INTO marcaje_horarios (nombre, hora_entrada, hora_salida, duracion_horas, es_nocturno, tolerancia_min, descanso_min)
        OUTPUT INSERTED.*
        VALUES (@P1, @P2, @P3, @P4, @P5, @P6, @P7)
    ";

    match client
        .query(
            query,
            &[
                &dto.nombre,
                &dto.hora_entrada,
                &dto.hora_salida,
                &duracion,
                &nocturno,
                &tolerancia,
                &descanso,
            ],
        )
        .await
    {
        Ok(st) => {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.into_iter().next() {
                    let row_json = crate::handlers::equipo::row_to_json(&r);
                    let duracion_horas = row_json
                        .get("duracion_horas")
                        .and_then(|value| match value {
                            serde_json::Value::Number(number) => number.as_f64(),
                            serde_json::Value::String(raw) => raw.parse::<f64>().ok(),
                            _ => None,
                        });
                    let format_time = |t: Option<chrono::NaiveTime>| {
                        t.map(|time| time.format("%H:%M:%S").to_string())
                    };
                    return (
                        StatusCode::OK,
                        Json(serde_json::json!({
                            "id_horario": r.get::<i32, _>("id_horario"),
                            "nombre": r.get::<&str, _>("nombre"),
                            "hora_entrada": format_time(r.get::<chrono::NaiveTime, _>("hora_entrada")),
                            "hora_salida": format_time(r.get::<chrono::NaiveTime, _>("hora_salida")),
                            "duracion_horas": duracion_horas,
                            "es_nocturno": r.get::<bool, _>("es_nocturno").unwrap_or(false),
                            "tolerancia_min": r.get::<i32, _>("tolerancia_min"),
                            "descanso_min": r.get::<i32, _>("descanso_min"),
                            "activo": r.get::<bool, _>("activo").unwrap_or(true),
                        })),
                    )
                        .into_response();
                }
            }
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    }
    (StatusCode::OK, Json(serde_json::json!({}))).into_response()
}

pub async fn jornada_actualizar_horario(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    Json(dto): Json<JornadaHorarioDto>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };

    // Simplification for partial updates: Update all provided, default the rest. In a real scenario, building a dynamic query is better but more verbose.
    // For Rust with Tiberius, updating known fields directly or dynamic query building.
    // Let's do a simple approach with ISNULL emulation or dynamic
    let _sets = vec!["actualizado_en = GETDATE()".to_string()];

    // We will do simple coalescing in SQL to update conditionally
    // But since Tiberius typing requires exact matches, it's safer to just do dynamic SQL or pass explicit Options.
    let dur_f32 = dto.duracion_horas.map(|v| v as f32);
    let noc_i32 = dto.es_nocturno.map(|v| if v { 1_i32 } else { 0_i32 });

    let query = "
        UPDATE marcaje_horarios SET 
            nombre = ISNULL(@P1, nombre),
            hora_entrada = ISNULL(@P2, hora_entrada),
            hora_salida = ISNULL(@P3, hora_salida),
            duracion_horas = ISNULL(@P4, duracion_horas),
            es_nocturno = ISNULL(@P5, es_nocturno),
            tolerancia_min = ISNULL(@P6, tolerancia_min),
            descanso_min = ISNULL(@P7, descanso_min),
            actualizado_en = GETDATE()
        WHERE id_horario = @P8
    ";

    match client
        .execute(
            query,
            &[
                &dto.nombre,
                &dto.hora_entrada,
                &dto.hora_salida,
                &dur_f32,
                &noc_i32,
                &dto.tolerancia_min,
                &dto.descanso_min,
                &id,
            ],
        )
        .await
    {
        Ok(_) => (StatusCode::OK, Json(serde_json::json!({"ok": true}))).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn jornada_eliminar_horario(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };
    match client.execute("UPDATE marcaje_horarios SET activo = 0, actualizado_en = GETDATE() WHERE id_horario = @P1", &[&id]).await {
        Ok(_) => (StatusCode::OK, Json(serde_json::json!({"ok": true}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))).into_response(),
    }
}

// ----- PATRONES CRUD -----

pub async fn jornada_crear_patron(
    _user: AuthUser,
    State(state): State<ApiState>,
    Json(dto): Json<JornadaPatronDto>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };

    // 1. Create Pattern
    let query_patron = "
        INSERT INTO marcaje_patrones (nombre, total_dias, descripcion)
        OUTPUT INSERTED.id_patron
        VALUES (@P1, @P2, @P3)
    ";

    let mut id_patron: i32 = 0;
    match client
        .query(
            query_patron,
            &[&dto.nombre, &dto.total_dias, &dto.descripcion],
        )
        .await
    {
        Ok(st) => {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.into_iter().next() {
                    id_patron = r.get::<i32, _>("id_patron").unwrap_or(0);
                }
            }
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    }

    if id_patron == 0 {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Failed to create patron"})),
        )
            .into_response();
    }

    // 2. Details
    if let Some(detalles) = dto.detalle {
        for d in detalles {
            let _ = client.execute(
                "INSERT INTO marcaje_patrones_detalle (id_patron, nro_dia, id_horario, etiqueta) VALUES (@P1, @P2, @P3, @P4)",
                &[&id_patron, &d.nro_dia, &d.id_horario, &d.etiqueta]
            ).await;
        }
    }
    let response = match client
        .query(
            "SELECT TOP 1 * FROM marcaje_patrones WHERE id_patron = @P1",
            &[&id_patron],
        )
        .await
    {
        Ok(st) => {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.into_iter().next() {
                    (
                        StatusCode::OK,
                        Json(crate::handlers::equipo::row_to_json(&r)),
                    )
                        .into_response()
                } else {
                    (
                        StatusCode::OK,
                        Json(serde_json::json!({"id_patron": id_patron})),
                    )
                        .into_response()
                }
            } else {
                (
                    StatusCode::OK,
                    Json(serde_json::json!({"id_patron": id_patron})),
                )
                    .into_response()
            }
        }
        Err(_) => (
            StatusCode::OK,
            Json(serde_json::json!({"id_patron": id_patron})),
        )
            .into_response(),
    };
    response
}

// ----- ASIGNACIONES CRUD -----

pub async fn jornada_crear_asignacion(
    _user: AuthUser,
    State(state): State<ApiState>,
    Json(dto): Json<JornadaAsignacionDto>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };

    if dto.carnet.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "carnet es requerido"})),
        )
            .into_response();
    }

    if dto.carnet.trim().chars().count() > 20 {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "carnet excede el maximo de 20 caracteres"})),
        )
            .into_response();
    }

    let _ = client.execute("UPDATE marcaje_asignacion SET activo = 0, actualizado_en = GETDATE() WHERE carnet = @P1 AND activo = 1", &[&dto.carnet]).await;

    let fecha_inicio = match chrono::NaiveDate::parse_from_str(&dto.fecha_inicio, "%Y-%m-%d") {
        Ok(f) => f,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({"error": "Invalid date"})),
            )
                .into_response()
        }
    };

    let fecha_fin = dto.fecha_fin.and_then(|f| {
        chrono::NaiveDate::parse_from_str(&f, "%Y-%m-%d")
            .ok()
    });

    match client
        .execute(
            "INSERT INTO marcaje_asignacion (carnet, id_patron, fecha_inicio, fecha_fin) VALUES (@P1, @P2, @P3, @P4)",
            &[&dto.carnet, &dto.id_patron, &fecha_inicio, &fecha_fin],
        )
        .await
    {
        Ok(_) => {}
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    }

    match client
        .query(
            "SELECT TOP 1 * FROM marcaje_asignacion WHERE carnet = @P1 ORDER BY id_asignacion DESC",
            &[&dto.carnet],
        )
        .await
    {
        Ok(st) => {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.into_iter().next() {
                    return (
                        StatusCode::OK,
                        Json(crate::handlers::equipo::row_to_json(&r)),
                    )
                        .into_response();
                }
            }
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    }

    (StatusCode::OK, Json(serde_json::json!({"ok": true}))).into_response()
}

pub async fn jornada_eliminar_asignacion(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };
    match client.execute("UPDATE marcaje_asignacion SET activo = 0, actualizado_en = GETDATE() WHERE id_asignacion = @P1", &[&id]).await {
        Ok(_) => (StatusCode::OK, Json(serde_json::json!({"ok": true}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))).into_response(),
    }
}

// ----- MODELS -----

#[derive(Deserialize)]
pub struct JornadaHorarioDto {
    pub nombre: Option<String>,
    pub hora_entrada: Option<String>,
    pub hora_salida: Option<String>,
    pub duracion_horas: Option<f64>,
    pub es_nocturno: Option<bool>,
    pub tolerancia_min: Option<i32>,
    pub descanso_min: Option<i32>,
}

#[derive(Deserialize)]
pub struct JornadaPatronDto {
    pub nombre: String,
    pub total_dias: i32,
    pub descripcion: Option<String>,
    pub detalle: Option<Vec<JornadaPatronDetalleDto>>,
}

#[derive(Deserialize)]
pub struct JornadaPatronDetalleDto {
    pub nro_dia: i32,
    pub id_horario: Option<i32>,
    pub etiqueta: Option<String>,
}

#[derive(Deserialize)]
pub struct JornadaAsignacionDto {
    pub carnet: String,
    pub id_patron: i32,
    pub fecha_inicio: String,
    pub fecha_fin: Option<String>,
}
