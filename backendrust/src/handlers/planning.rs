#![allow(dead_code)]
use axum::{
    extract::{OriginalUri, Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::Utc;
use serde::Deserialize;
use std::collections::HashMap;

use crate::state::ApiState;

type SqlConnection<'a> = bb8::PooledConnection<'a, bb8_tiberius::ConnectionManager>;

fn is_admin_role_name(role: &str) -> bool {
    matches!(role.trim(), "Admin" | "Administrador" | "SuperAdmin")
}

async fn planning_is_admin_user(
    client: &mut SqlConnection<'_>,
    user: &crate::auth::AuthUser,
) -> bool {
    if is_admin_role_name(user.rol()) || user.is_admin() {
        return true;
    }

    let rows = crate::handlers::equipo::exec_query_to_json(
        client,
        "SELECT rolGlobal FROM p_Usuarios WHERE idUsuario = @P1 AND activo = 1",
        &[&user.user_id_i32()],
    )
    .await;

    rows.first()
        .and_then(|row| row.get("rolGlobal"))
        .and_then(|value| value.as_str())
        .map(is_admin_role_name)
        .unwrap_or(false)
}

async fn planning_effective_user_carnet(
    client: &mut SqlConnection<'_>,
    user: &crate::auth::AuthUser,
) -> String {
    let carnet = user.carnet().trim();
    if !carnet.is_empty() && carnet != "UNKNOWN" {
        return carnet.to_string();
    }

    crate::handlers::equipo::exec_query_to_json(
        client,
        "SELECT carnet FROM p_Usuarios WHERE idUsuario = @P1 AND activo = 1",
        &[&user.user_id_i32()],
    )
    .await
    .first()
    .and_then(|row| row.get("carnet"))
    .and_then(|value| value.as_str())
    .unwrap_or("")
    .trim()
    .to_string()
}

fn planning_request_change_field_db(campo: &str) -> Option<&'static str> {
    match campo.trim() {
        "titulo" | "nombre" => Some("nombre"),
        "descripcion" => Some("descripcion"),
        "progreso" | "porcentaje" => Some("porcentaje"),
        "fechaObjetivo" => Some("fechaObjetivo"),
        "fechaInicioPlanificada" => Some("fechaInicioPlanificada"),
        "fechaFinPlanificada" => Some("fechaFinPlanificada"),
        "prioridad" => Some("prioridad"),
        "estado" => Some("estado"),
        _ => None,
    }
}

fn planning_json_value_to_string(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::Null => String::new(),
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::Bool(b) => b.to_string(),
        other => other.to_string(),
    }
}

fn planning_to_iso_date_from_value(value: &serde_json::Value) -> Option<String> {
    match value {
        serde_json::Value::String(raw) => {
            let trimmed = raw.trim();
            if trimmed.is_empty() {
                return None;
            }

            if trimmed.len() >= 10 {
                let candidate = &trimmed[..10];
                if chrono::NaiveDate::parse_from_str(candidate, "%Y-%m-%d").is_ok() {
                    return Some(candidate.to_string());
                }
            }

            chrono::DateTime::parse_from_rfc3339(trimmed)
                .ok()
                .map(|value| value.date_naive().format("%Y-%m-%d").to_string())
                .or_else(|| {
                    chrono::NaiveDateTime::parse_from_str(trimmed, "%Y-%m-%d %H:%M:%S")
                        .ok()
                        .map(|value| value.date().format("%Y-%m-%d").to_string())
                })
        }
        _ => None,
    }
}

fn planning_parse_query_date(raw: &str) -> Option<chrono::NaiveDate> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }

    if trimmed.len() >= 10 {
        let candidate = &trimmed[..10];
        if let Ok(date) = chrono::NaiveDate::parse_from_str(candidate, "%Y-%m-%d") {
            return Some(date);
        }
    }

    chrono::DateTime::parse_from_rfc3339(trimmed)
        .ok()
        .map(|value| value.date_naive())
        .or_else(|| {
            chrono::NaiveDateTime::parse_from_str(trimmed, "%Y-%m-%d %H:%M:%S")
                .ok()
                .map(|value| value.date())
        })
}

fn planning_is_final_state_for_mi_dia(state: &str) -> bool {
    matches!(
        state.trim(),
        "Bloqueada" | "Hecha" | "Completada" | "Terminada" | "Inactiva" | "Descartada"
    )
}

fn planning_prepare_mi_dia_tasks(
    rows: Vec<serde_json::Value>,
    carnet: &str,
    hoy: &str,
) -> (
    Vec<serde_json::Value>,
    Vec<serde_json::Value>,
    Vec<serde_json::Value>,
) {
    let mut seen = std::collections::HashSet::new();
    let mut all_tasks = Vec::new();

    for row in rows {
        let Some(mut obj) = row.as_object().cloned() else {
            continue;
        };

        let id_tarea = obj
            .get("idTarea")
            .and_then(|value| value.as_i64())
            .or_else(|| obj.get("ID").and_then(|value| value.as_i64()))
            .or_else(|| obj.get("id").and_then(|value| value.as_i64()));

        let Some(id_tarea) = id_tarea else {
            continue;
        };

        if !seen.insert(id_tarea) {
            continue;
        }

        let base_title = obj
            .get("titulo")
            .or_else(|| obj.get("Nombre"))
            .or_else(|| obj.get("nombre"))
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .to_string();
        let responsable_carnet = obj
            .get("responsableCarnet")
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        let responsable_nombre = obj
            .get("responsableNombre")
            .and_then(|value| value.as_str())
            .unwrap_or("Otro")
            .trim()
            .to_string();
        let titulo = if !responsable_carnet.is_empty() && responsable_carnet != carnet.trim() {
            let short_name = responsable_nombre
                .split_whitespace()
                .take(2)
                .collect::<Vec<_>>()
                .join(" ");
            format!("{} (Asig: {})", base_title, short_name)
        } else {
            base_title
        };

        let estado = obj
            .get("estado")
            .or_else(|| obj.get("Estado"))
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .to_string();
        let prioridad = obj
            .get("prioridad")
            .or_else(|| obj.get("Prioridad"))
            .and_then(|value| value.as_str())
            .unwrap_or("Media")
            .to_string();
        let proyecto_nombre = obj
            .get("proyectoNombre")
            .or_else(|| obj.get("Proyecto"))
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .to_string();
        let fecha_objetivo_iso = obj
            .get("fechaObjetivo")
            .and_then(planning_to_iso_date_from_value);
        let is_overdue = fecha_objetivo_iso
            .as_deref()
            .map(|fecha_objetivo| fecha_objetivo < hoy)
            .unwrap_or(false);

        obj.insert("idTarea".to_string(), serde_json::json!(id_tarea));
        obj.insert("titulo".to_string(), serde_json::json!(titulo.clone()));
        obj.insert("nombre".to_string(), serde_json::json!(titulo));
        obj.insert("estado".to_string(), serde_json::json!(estado.clone()));
        obj.insert("prioridad".to_string(), serde_json::json!(prioridad));
        obj.insert(
            "proyectoNombre".to_string(),
            serde_json::json!(proyecto_nombre.clone()),
        );
        if !obj.contains_key("proyecto") {
            obj.insert(
                "proyecto".to_string(),
                if proyecto_nombre.is_empty() {
                    serde_json::Value::Null
                } else {
                    serde_json::json!({ "nombre": proyecto_nombre })
                },
            );
        }
        if !obj.contains_key("fechaObjetivo") {
            obj.insert(
                "fechaObjetivo".to_string(),
                fecha_objetivo_iso
                    .clone()
                    .map(serde_json::Value::String)
                    .unwrap_or(serde_json::Value::Null),
            );
        }

        all_tasks.push(serde_json::Value::Object(obj));

        let _ = is_overdue;
    }

    let bloqueos_activos: Vec<serde_json::Value> = all_tasks
        .iter()
        .filter(|task| task.get("estado").and_then(|value| value.as_str()) == Some("Bloqueada"))
        .cloned()
        .collect();

    let backlog: Vec<serde_json::Value> = all_tasks
        .iter()
        .filter(|task| {
            let estado = task
                .get("estado")
                .and_then(|value| value.as_str())
                .unwrap_or("");
            if planning_is_final_state_for_mi_dia(estado) {
                return false;
            }

            task.get("fechaObjetivo")
                .and_then(planning_to_iso_date_from_value)
                .map(|fecha_objetivo| fecha_objetivo.as_str() < hoy)
                .unwrap_or(false)
        })
        .cloned()
        .collect();

    let tareas_sugeridas: Vec<serde_json::Value> = all_tasks
        .iter()
        .filter(|task| {
            let estado = task
                .get("estado")
                .and_then(|value| value.as_str())
                .unwrap_or("");
            if planning_is_final_state_for_mi_dia(estado) {
                return false;
            }

            !task
                .get("fechaObjetivo")
                .and_then(planning_to_iso_date_from_value)
                .map(|fecha_objetivo| fecha_objetivo.as_str() < hoy)
                .unwrap_or(false)
        })
        .cloned()
        .collect();

    (bloqueos_activos, backlog, tareas_sugeridas)
}

fn planning_order_tasks_like_nest(
    rows: Vec<serde_json::Value>,
    proyectos_raw: &[serde_json::Value],
) -> Vec<serde_json::Value> {
    let ordered_project_ids: Vec<i64> = proyectos_raw
        .iter()
        .filter_map(|project| project.get("idProyecto").and_then(|value| value.as_i64()))
        .collect();

    let mut ordered = Vec::new();
    for project_id in &ordered_project_ids {
        for row in &rows {
            if row.get("idProyecto").and_then(|value| value.as_i64()) == Some(*project_id) {
                ordered.push(row.clone());
            }
        }
    }

    for row in rows {
        let project_id = row.get("idProyecto").and_then(|value| value.as_i64());
        if project_id.is_none() || !ordered_project_ids.contains(&project_id.unwrap_or_default()) {
            ordered.push(row);
        }
    }

    ordered
}

fn planning_task_field_to_string(task: &serde_json::Value, field_db: &str) -> String {
    task.get(field_db)
        .map(planning_json_value_to_string)
        .unwrap_or_default()
}

fn planning_normalize_request_change_value(
    field_db: &str,
    raw: Option<&serde_json::Value>,
) -> Result<String, String> {
    match field_db {
        "fechaObjetivo" | "fechaInicioPlanificada" | "fechaFinPlanificada" => {
            let value = match raw {
                Some(serde_json::Value::String(s)) => s.trim().to_string(),
                Some(other) => other.to_string(),
                None => String::new(),
            };
            if value.is_empty() {
                return Ok(String::new());
            }
            let parsed = chrono::NaiveDateTime::parse_from_str(&value, "%Y-%m-%dT%H:%M:%S")
                .ok()
                .or_else(|| {
                    chrono::NaiveDateTime::parse_from_str(&value, "%Y-%m-%dT%H:%M:%S%.fZ").ok()
                })
                .or_else(|| {
                    chrono::NaiveDate::parse_from_str(&value, "%Y-%m-%d")
                        .ok()
                        .and_then(|d| d.and_hms_opt(0, 0, 0))
                })
                .or_else(|| {
                    chrono::NaiveDateTime::parse_from_str(&value, "%Y-%m-%d %H:%M:%S").ok()
                });
            if parsed.is_none() {
                return Err(format!("Fecha inválida para {}.", field_db));
            }
            Ok(value)
        }
        "porcentaje" => {
            let raw_value = match raw {
                Some(serde_json::Value::String(s)) => s.trim().to_string(),
                Some(other) => other.to_string(),
                None => String::new(),
            };
            let parsed = raw_value
                .parse::<f64>()
                .map_err(|_| "porcentaje inválido.".to_string())?;
            if !parsed.is_finite() || !(0.0..=100.0).contains(&parsed) {
                return Err("porcentaje inválido.".to_string());
            }
            if (parsed.fract()).abs() < f64::EPSILON {
                Ok((parsed as i32).to_string())
            } else {
                Ok(parsed.to_string())
            }
        }
        _ => Ok(match raw {
            Some(serde_json::Value::String(s)) => s.clone(),
            Some(other) => other.to_string(),
            None => String::new(),
        }),
    }
}

async fn planning_can_access_task_for_change(
    client: &mut SqlConnection<'_>,
    user: &crate::auth::AuthUser,
    task: &serde_json::Value,
) -> bool {
    if planning_is_admin_user(client, user).await {
        return true;
    }

    let user_id = user.user_id_i32() as i64;
    if task.get("idCreador").and_then(|v| v.as_i64()) == Some(user_id)
        || task.get("idAsignado").and_then(|v| v.as_i64()) == Some(user_id)
        || task.get("idUsuario").and_then(|v| v.as_i64()) == Some(user_id)
    {
        return true;
    }

    let user_carnet = user.carnet().trim().to_string();
    if user_carnet.is_empty() || user_carnet == "UNKNOWN" {
        return false;
    }

    let responsable_carnet = task
        .get("responsableCarnet")
        .or_else(|| task.get("asignadoCarnet"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if !responsable_carnet.is_empty() && responsable_carnet == user_carnet {
        return true;
    }

    let mut visible_carnets = crate::handlers::equipo::get_visible_carnets(client, &user_carnet)
        .await
        .unwrap_or_else(|_| vec![user_carnet.clone()]);
    if !visible_carnets.iter().any(|c| c == &user_carnet) {
        visible_carnets.push(user_carnet.clone());
    }
    if !responsable_carnet.is_empty() && visible_carnets.iter().any(|c| c == &responsable_carnet) {
        return true;
    }

    let id_proyecto = task.get("idProyecto").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
    if id_proyecto > 0 {
        let none_str: Option<String> = None;
        let page = 1;
        let limit = 2000;
        let visibles = crate::handlers::equipo::exec_sp_to_json(
            client,
            "EXEC sp_Proyecto_Listar_rust @carnet=@P1, @nombre=@P2, @estado=@P3, @gerencia=@P4, @subgerencia=@P5, @area=@P6, @tipo=@P7, @pageNumber=@P8, @pageSize=@P9",
            &[&user_carnet, &none_str, &none_str, &none_str, &none_str, &none_str, &none_str, &page, &limit],
        )
        .await;
        if visibles
            .iter()
            .any(|p| p.get("idProyecto").and_then(|v| v.as_i64()) == Some(id_proyecto as i64))
        {
            return true;
        }
    }

    id_proyecto == 0 && responsable_carnet.is_empty()
}

async fn planning_load_task(
    client: &mut SqlConnection<'_>,
    id_tarea: i32,
) -> Option<serde_json::Value> {
    crate::handlers::equipo::exec_sp_to_json(
        client,
        "EXEC sp_Tareas_ObtenerPorId_rust @P1",
        &[&id_tarea],
    )
    .await
    .into_iter()
    .next()
}

struct PlanningEditPermission {
    puede_editar: bool,
    requiere_aprobacion: bool,
    tipo_proyecto: String,
}

async fn planning_resolve_edit_permission(
    client: &mut SqlConnection<'_>,
    user: &crate::auth::AuthUser,
    tarea: &serde_json::Value,
) -> PlanningEditPermission {
    let id_tarea = tarea
        .get("idTarea")
        .and_then(|value| value.as_i64())
        .unwrap_or(0) as i32;
    let id_usuario_actual = user.user_id_i32();

    let perm_res = crate::handlers::equipo::exec_sp_to_json(
        client,
        "EXEC sp_Planning_CheckPermission_rust @P1, @P2",
        &[&id_tarea, &id_usuario_actual],
    )
    .await;

    let p = perm_res.first().cloned().unwrap_or_default();
    let id_proyecto = tarea
        .get("idProyecto")
        .and_then(|v| v.as_i64())
        .or_else(|| p.get("idProyecto").and_then(|v| v.as_i64()))
        .unwrap_or(0) as i32;

    if id_proyecto == 0 {
        return PlanningEditPermission {
            puede_editar: true,
            requiere_aprobacion: false,
            tipo_proyecto: "Personal".to_string(),
        };
    }

    let proy_tipo = tarea
        .get("proyectoTipo")
        .or_else(|| p.get("proyectoTipo"))
        .and_then(|v| v.as_str())
        .unwrap_or("General")
        .to_string();
    let req_aprob = p
        .get("requiereAprobacion")
        .and_then(|v| v.as_bool())
        .or_else(|| {
            tarea
                .get("proyectoRequiereAprobacion")
                .and_then(|v| v.as_bool())
        })
        .unwrap_or(false);
    let is_assigned = p
        .get("isAssigned")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    if proy_tipo == "Estrategico" || req_aprob {
        if planning_is_admin_user(client, user).await {
            return PlanningEditPermission {
                puede_editar: true,
                requiere_aprobacion: false,
                tipo_proyecto: proy_tipo,
            };
        }

        let id_creador = tarea
            .get("idCreador")
            .and_then(|v| v.as_i64())
            .or_else(|| p.get("idCreador").and_then(|v| v.as_i64()))
            .unwrap_or(0);
        if id_creador == id_usuario_actual as i64 {
            return PlanningEditPermission {
                puede_editar: true,
                requiere_aprobacion: false,
                tipo_proyecto: proy_tipo,
            };
        }

        let project_rows = crate::handlers::equipo::exec_sp_to_json(
            client,
            "EXEC sp_Proyecto_ObtenerDetalle_rust @P1",
            &[&id_proyecto],
        )
        .await;
        let es_duenio_proyecto = project_rows
            .first()
            .map(|proyecto| {
                proyecto.get("idCreador").and_then(|v| v.as_i64()) == Some(id_usuario_actual as i64)
                    || proyecto
                        .get("responsableCarnet")
                        .and_then(|v| v.as_str())
                        .map(|value| value.trim())
                        == Some(user.carnet().trim())
            })
            .unwrap_or(false);

        if es_duenio_proyecto || is_assigned {
            return PlanningEditPermission {
                puede_editar: true,
                requiere_aprobacion: false,
                tipo_proyecto: proy_tipo,
            };
        }

        return PlanningEditPermission {
            puede_editar: true,
            requiere_aprobacion: true,
            tipo_proyecto: proy_tipo,
        };
    }

    PlanningEditPermission {
        puede_editar: true,
        requiere_aprobacion: false,
        tipo_proyecto: proy_tipo,
    }
}

fn planning_validate_month_year(mes: i32, anio: i32) -> Result<(), String> {
    if mes < 1 || mes > 12 {
        return Err("mes inválido (1-12).".to_string());
    }
    if !(2000..=2100).contains(&anio) {
        return Err("anio inválido (2000-2100).".to_string());
    }
    Ok(())
}

fn planning_validate_percent(porcentaje: f64) -> Result<(), String> {
    if !porcentaje.is_finite() || !(0.0..=100.0).contains(&porcentaje) {
        return Err("porcentajeMes inválido (0-100).".to_string());
    }
    Ok(())
}

fn planning_normalize_agenda_rows(rows: Vec<serde_json::Value>) -> Vec<serde_json::Value> {
    rows.into_iter()
        .map(|mut row| {
            if let Some(fecha) = row
                .get("fecha")
                .and_then(|value| value.as_str())
                .map(str::trim)
                .filter(|value| !value.is_empty())
            {
                if fecha.len() == 10 && fecha.chars().nth(4) == Some('-') {
                    row["fecha"] = serde_json::Value::String(format!("{fecha}T00:00:00.000Z"));
                }
            }
            row
        })
        .collect()
}

async fn planning_fetch_avance_mensual_rows(
    client: &mut SqlConnection<'_>,
    id_tarea: i32,
) -> Vec<serde_json::Value> {
    let query = r#"
        SELECT
            id,
            idTarea,
            anio,
            mes,
            CAST(porcentajeMes AS FLOAT) AS porcentajeMes,
            CAST(
                SUM(porcentajeMes) OVER (
                    PARTITION BY idTarea
                    ORDER BY anio, mes
                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                ) AS FLOAT
            ) AS porcentajeAcumulado,
            comentario,
            idUsuarioActualizador,
            fechaActualizacion
        FROM p_TareaAvanceMensual
        WHERE idTarea = @P1
        ORDER BY anio, mes
    "#;

    match client.query(query, &[&id_tarea]).await {
        Ok(stream) => match stream.into_first_result().await {
            Ok(rows) => rows
                .into_iter()
                .map(|row| crate::handlers::equipo::row_to_json(&row))
                .collect(),
            Err(_) => Vec::new(),
        },
        Err(_) => Vec::new(),
    }
}

async fn planning_fetch_group_tasks(
    client: &mut SqlConnection<'_>,
    id_grupo: i32,
) -> Result<Vec<serde_json::Value>, String> {
    let sql = "SELECT * FROM p_Tareas WHERE idGrupo = @P1 ORDER BY numeroParte";
    match client.query(sql, &[&id_grupo]).await {
        Ok(stream) => match stream.into_first_result().await {
            Ok(rows) => Ok(rows
                .into_iter()
                .map(|row| crate::handlers::equipo::row_to_json(&row))
                .collect()),
            Err(error) => Err(error.to_string()),
        },
        Err(error) => Err(error.to_string()),
    }
}

async fn planning_can_resolve_change_request(
    client: &mut SqlConnection<'_>,
    user: &crate::auth::AuthUser,
    id_usuario_solicitante: i32,
) -> bool {
    if planning_is_admin_user(client, user).await {
        return true;
    }

    let user_carnet = user.carnet().trim().to_string();
    if user_carnet.is_empty() || user_carnet == "UNKNOWN" {
        return false;
    }

    let rows = crate::handlers::equipo::exec_query_to_json(
        client,
        "SELECT carnet FROM p_Usuarios WHERE idUsuario = @P1 AND activo = 1",
        &[&id_usuario_solicitante],
    )
    .await;
    let target_carnet = rows
        .first()
        .and_then(|row| row.get("carnet"))
        .and_then(|value| value.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if target_carnet.is_empty() {
        return false;
    }

    let mut visible_carnets = crate::handlers::equipo::get_visible_carnets(client, &user_carnet)
        .await
        .unwrap_or_else(|_| vec![user_carnet.clone()]);
    if !visible_carnets.iter().any(|c| c == &user_carnet) {
        visible_carnets.push(user_carnet);
    }

    visible_carnets.iter().any(|c| c == &target_carnet)
}

fn planning_parse_optional_datetime(value: &str) -> Option<chrono::NaiveDateTime> {
    if value.is_empty() {
        return None;
    }

    chrono::NaiveDateTime::parse_from_str(value, "%Y-%m-%dT%H:%M:%S")
        .ok()
        .or_else(|| chrono::NaiveDateTime::parse_from_str(value, "%Y-%m-%dT%H:%M:%S%.fZ").ok())
        .or_else(|| {
            chrono::NaiveDate::parse_from_str(value, "%Y-%m-%d")
                .ok()
                .and_then(|d| d.and_hms_opt(0, 0, 0))
        })
        .or_else(|| chrono::NaiveDateTime::parse_from_str(value, "%Y-%m-%d %H:%M:%S").ok())
}

async fn planning_apply_change_request_to_task(
    client: &mut SqlConnection<'_>,
    id_tarea: i32,
    field_db: &str,
    value: &str,
) -> Result<(), String> {
    match field_db {
        "nombre" => {
            client
                .execute(
                    "UPDATE p_Tareas SET nombre = @P1, fechaActualizacion = GETDATE() WHERE idTarea = @P2",
                    &[&value, &id_tarea],
                )
                .await
                .map_err(|e| e.to_string())?;
        }
        "descripcion" => {
            client
                .execute(
                    "UPDATE p_Tareas SET descripcion = @P1, fechaActualizacion = GETDATE() WHERE idTarea = @P2",
                    &[&value, &id_tarea],
                )
                .await
                .map_err(|e| e.to_string())?;
        }
        "prioridad" => {
            client
                .execute(
                    "UPDATE p_Tareas SET prioridad = @P1, fechaActualizacion = GETDATE() WHERE idTarea = @P2",
                    &[&value, &id_tarea],
                )
                .await
                .map_err(|e| e.to_string())?;
        }
        "estado" => {
            client
                .execute(
                    "UPDATE p_Tareas SET estado = @P1, fechaActualizacion = GETDATE() WHERE idTarea = @P2",
                    &[&value, &id_tarea],
                )
                .await
                .map_err(|e| e.to_string())?;
            if value == "Hecha" {
                client
                    .execute(
                        "UPDATE p_Tareas SET porcentaje = 100, fechaCompletado = ISNULL(fechaCompletado, GETDATE()) WHERE idTarea = @P1",
                        &[&id_tarea],
                    )
                    .await
                    .map_err(|e| e.to_string())?;
            }
            let _ = client
                .query(
                    "EXEC sp_Tarea_RecalcularJerarquia_rust @P1, NULL",
                    &[&id_tarea],
                )
                .await;
        }
        "porcentaje" => {
            let parsed = value
                .parse::<f64>()
                .map_err(|_| "porcentaje inválido.".to_string())?;
            let porcentaje = parsed.round() as i32;
            client
                .execute(
                    "UPDATE p_Tareas SET porcentaje = @P1, fechaActualizacion = GETDATE() WHERE idTarea = @P2",
                    &[&porcentaje, &id_tarea],
                )
                .await
                .map_err(|e| e.to_string())?;
            let _ = client
                .query(
                    "EXEC sp_Tarea_RecalcularJerarquia_rust @P1, NULL",
                    &[&id_tarea],
                )
                .await;
        }
        "fechaObjetivo" => {
            let parsed = planning_parse_optional_datetime(value);
            client
                .execute(
                    "UPDATE p_Tareas SET fechaObjetivo = @P1, fechaActualizacion = GETDATE() WHERE idTarea = @P2",
                    &[&parsed, &id_tarea],
                )
                .await
                .map_err(|e| e.to_string())?;
        }
        "fechaInicioPlanificada" => {
            let parsed = planning_parse_optional_datetime(value);
            client
                .execute(
                    "UPDATE p_Tareas SET fechaInicioPlanificada = @P1, fechaActualizacion = GETDATE() WHERE idTarea = @P2",
                    &[&parsed, &id_tarea],
                )
                .await
                .map_err(|e| e.to_string())?;
        }
        "fechaFinPlanificada" => {
            let parsed = planning_parse_optional_datetime(value);
            client
                .execute(
                    "UPDATE p_Tareas SET fechaFinPlanificada = @P1, fechaActualizacion = GETDATE() WHERE idTarea = @P2",
                    &[&parsed, &id_tarea],
                )
                .await
                .map_err(|e| e.to_string())?;
        }
        _ => return Err(format!("Campo no permitido en solicitud: {}", field_db)),
    }

    Ok(())
}

pub async fn planning_workload(
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
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    };

    // 1. Obtener empleados visibles (mismo motor que NestJS)
    let visible_carnets =
        match crate::handlers::equipo::get_visible_carnets(&mut client, &carnet).await {
            Ok(v) => v,
            Err(_) => vec![carnet.clone()],
        };

    if visible_carnets.is_empty() {
        return (
            StatusCode::OK,
            Json(crate::models::ApiResponse::success(serde_json::json!({
                "users": [], "tasks": [], "agenda": []
            }))),
        )
            .into_response();
    }

    let csv = visible_carnets.join(",");

    // 2. Obtener detalles de usuarios y tareas
    let members = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Usuarios_ObtenerDetallesPorCarnets_rust @P1",
        &[&csv.as_str()],
    )
    .await;
    let all_tasks = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Tareas_ObtenerMultiplesUsuarios_rust @P1",
        &[&csv.as_str()],
    )
    .await;

    // 3. Obtener Agenda (Checkins)
    let today = chrono::Utc::now().date_naive();
    let start_date = query_params
        .get("startDate")
        .and_then(|value| planning_parse_query_date(value))
        .unwrap_or(today - chrono::Duration::days(7))
        .format("%Y-%m-%d")
        .to_string();
    let end_date = query_params
        .get("endDate")
        .and_then(|value| planning_parse_query_date(value))
        .unwrap_or(today + chrono::Duration::days(7))
        .format("%Y-%m-%d")
        .to_string();

    // Convert dates for SQL
    let start_sql = format!("{} 00:00:00", start_date);
    let end_sql = format!("{} 23:59:59", end_date);

    // Zero Inline SQL: Usar sp_Planning_ObtenerAgenda
    let agenda = match crate::handlers::equipo::exec_sp_to_json_result(
        &mut client,
        "EXEC sp_Planning_ObtenerAgenda_rust @P1, @P2, @P3",
        &[&csv.as_str(), &start_sql.as_str(), &end_sql.as_str()],
    )
    .await
    {
        Ok(rows) => planning_normalize_agenda_rows(rows),
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e, 500)),
            )
                .into_response()
        }
    };

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

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "users": users,
            "tasks": all_tasks,
            "agenda": agenda
        }))),
    )
        .into_response()
}

pub async fn planning_pending(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    crate::handlers::tareas::tareas_solicitud_cambio_pendientes(user, State(state)).await
}

pub async fn planning_approvals(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    crate::handlers::tareas::tareas_solicitud_cambio_pendientes(user, State(state)).await
}

pub async fn planning_check_permission(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    OriginalUri(original_uri): OriginalUri,
    Json(body): Json<PlanningPermissionRequest>,
) -> impl IntoResponse {
    let id_tarea = body.id_tarea.unwrap_or(0) as i32;
    if id_tarea <= 0 {
        return (
            StatusCode::BAD_REQUEST,
            Json(crate::models::ApiResponse::error(
                "idTarea inválido.".to_string(),
                400,
            )),
        )
            .into_response();
    }

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(
                    "DB connect error".to_string(),
                    500,
                )),
            )
                .into_response()
        }
    };

    let task_rows = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Tareas_ObtenerPorId_rust @P1",
        &[&id_tarea],
    )
    .await;
    let tarea = match task_rows.first() {
        Some(value) => value.clone(),
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(crate::models::ApiResponse::error(
                    "Tarea no encontrada".to_string(),
                    404,
                )),
            )
                .into_response()
        }
    };

    if !planning_can_access_task_for_change(&mut client, &user, &tarea).await {
        return (
            StatusCode::FORBIDDEN,
            Json(crate::models::ApiResponse::error(
                "No tienes permisos para ver/editar esta tarea.".to_string(),
                403,
            )),
        )
            .into_response();
    }

    let success_status = StatusCode::CREATED;
    let permission = planning_resolve_edit_permission(&mut client, &user, &tarea).await;
    (
        success_status,
        Json(crate::models::ApiResponse::success_with_status(
            serde_json::json!({
                "puedeEditar": permission.puede_editar,
                "requiereAprobacion": permission.requiere_aprobacion,
                "tipoProyecto": permission.tipo_proyecto,
            }),
            201,
            original_uri.path(),
        )),
    )
        .into_response()
}

pub async fn planning_request_change(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<PlanningRequestChangeRequest>,
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
    let id_tarea = body.id_tarea as i32;
    if id_tarea <= 0 {
        return (
            StatusCode::BAD_REQUEST,
            Json(crate::models::ApiResponse::error(
                "idTarea inválido.".to_string(),
                400,
            )),
        )
            .into_response();
    }

    let campo_raw = body.campo.unwrap_or_default().trim().to_string();
    if campo_raw.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(crate::models::ApiResponse::error(
                "campo requerido.".to_string(),
                400,
            )),
        )
            .into_response();
    }

    let motivo = body.motivo.trim().to_string();
    if motivo.len() < 5 {
        return (
            StatusCode::BAD_REQUEST,
            Json(crate::models::ApiResponse::error(
                "motivo muy corto.".to_string(),
                400,
            )),
        )
            .into_response();
    }

    let campo_db = match planning_request_change_field_db(&campo_raw) {
        Some(field) => field,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(crate::models::ApiResponse::error(
                    format!("Campo no permitido para solicitud: {}", campo_raw),
                    400,
                )),
            )
                .into_response()
        }
    };

    let task_rows = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Tareas_ObtenerPorId_rust @P1",
        &[&id_tarea],
    )
    .await;
    let task = match task_rows.first() {
        Some(value) => value.clone(),
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(crate::models::ApiResponse::error(
                    "Tarea no encontrada".to_string(),
                    404,
                )),
            )
                .into_response()
        }
    };

    if !planning_can_access_task_for_change(&mut client, &user, &task).await {
        return (
            StatusCode::FORBIDDEN,
            Json(crate::models::ApiResponse::error(
                "No tienes permisos para ver/editar esta tarea.".to_string(),
                403,
            )),
        )
            .into_response();
    }

    let valor_anterior = planning_task_field_to_string(&task, campo_db);
    let valor_nuevo_str =
        match planning_normalize_request_change_value(campo_db, body.valor_nuevo.as_ref()) {
            Ok(value) => value,
            Err(message) => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(crate::models::ApiResponse::error(message, 400)),
                )
                    .into_response()
            }
        };

    let query = r#"
        INSERT INTO p_SolicitudesCambio (idTarea, idUsuarioSolicitante, campo, valorAnterior, valorNuevo, motivo, estado, fechaSolicitud)
        OUTPUT INSERTED.idSolicitud
        VALUES (@P1, @P2, @P3, @P4, @P5, @P6, 'Pendiente', GETDATE())
    "#;

    let res = client
        .query(
            query,
            &[
                &id_tarea,
                &id_usuario,
                &campo_raw,
                &valor_anterior,
                &valor_nuevo_str,
                &motivo,
            ],
        )
        .await;

    let mut _new_id = 0;
    if let Ok(stream) = res {
        if let Ok(rows) = stream.into_first_result().await {
            if let Some(r) = rows.into_iter().next() {
                _new_id = r
                    .try_get::<i32, _>("idSolicitud")
                    .ok()
                    .flatten()
                    .unwrap_or(0);
            }
        }
    }

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "message": "Solicitud registrada correctamente",
            "requiresApproval": true
        }))),
    )
        .into_response()
}

pub async fn planning_resolve(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<PlanningResolveRequest>,
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

    let id_solicitud = body.id_solicitud.unwrap_or(0) as i32;
    if id_solicitud <= 0 {
        return (
            StatusCode::BAD_REQUEST,
            Json(crate::models::ApiResponse::error(
                "idSolicitud inválido.".to_string(),
                400,
            )),
        )
            .into_response();
    }

    let accion = body.accion.trim();
    if accion != "Aprobar" && accion != "Rechazar" {
        return (
            StatusCode::BAD_REQUEST,
            Json(crate::models::ApiResponse::error(
                "accion debe ser Aprobar o Rechazar.".to_string(),
                400,
            )),
        )
            .into_response();
    }

    let solicitud_rows = crate::handlers::equipo::exec_query_to_json(
        &mut client,
        "SELECT idSolicitud, idTarea, campo, valorNuevo, idUsuarioSolicitante FROM p_SolicitudesCambio WHERE idSolicitud = @P1",
        &[&id_solicitud],
    )
    .await;
    let solicitud = match solicitud_rows.first() {
        Some(value) => value.clone(),
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(crate::models::ApiResponse::error(
                    "Solicitud no encontrada".to_string(),
                    404,
                )),
            )
                .into_response()
        }
    };

    let id_usuario_solicitante = solicitud
        .get("idUsuarioSolicitante")
        .and_then(|v| v.as_i64())
        .unwrap_or(0) as i32;
    if !planning_can_resolve_change_request(&mut client, &user, id_usuario_solicitante).await {
        return (
            StatusCode::FORBIDDEN,
            Json(crate::models::ApiResponse::error(
                "No tienes permisos para resolver esta solicitud.".to_string(),
                403,
            )),
        )
            .into_response();
    }

    let comentario_recibido = body.comentario.unwrap_or_default().trim().to_string();
    let id_usuario = user.user_id_i32();

    let estado = if accion == "Aprobar" {
        "Aprobado"
    } else {
        "Rechazado"
    };
    let comentario_final = if comentario_recibido.is_empty() {
        if accion == "Aprobar" {
            "Aprobado por superior".to_string()
        } else {
            "Rechazado por superior".to_string()
        }
    } else {
        comentario_recibido
    };

    if accion == "Aprobar" {
        let id_tarea = solicitud
            .get("idTarea")
            .and_then(|v| v.as_i64())
            .unwrap_or(0) as i32;
        let campo_raw = solicitud
            .get("campo")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        let campo_db = match planning_request_change_field_db(&campo_raw) {
            Some(field) => field,
            None => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(crate::models::ApiResponse::error(
                        format!("Campo no permitido en solicitud: {}", campo_raw),
                        400,
                    )),
                )
                    .into_response()
            }
        };

        let valor_nuevo = solicitud
            .get("valorNuevo")
            .map(planning_json_value_to_string)
            .unwrap_or_default();
        let valor_normalizado = match planning_normalize_request_change_value(
            campo_db,
            Some(&serde_json::Value::String(valor_nuevo)),
        ) {
            Ok(value) => value,
            Err(message) => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(crate::models::ApiResponse::error(message, 400)),
                )
                    .into_response()
            }
        };

        let task_rows = crate::handlers::equipo::exec_sp_to_json(
            &mut client,
            "EXEC sp_Tareas_ObtenerPorId_rust @P1",
            &[&id_tarea],
        )
        .await;
        let task = match task_rows.first() {
            Some(value) => value.clone(),
            None => {
                return (
                    StatusCode::NOT_FOUND,
                    Json(crate::models::ApiResponse::error(
                        "Tarea no encontrada".to_string(),
                        404,
                    )),
                )
                    .into_response()
            }
        };

        if !planning_can_access_task_for_change(&mut client, &user, &task).await {
            return (
                StatusCode::FORBIDDEN,
                Json(crate::models::ApiResponse::error(
                    "No tienes permisos para ver/editar esta tarea.".to_string(),
                    403,
                )),
            )
                .into_response();
        }

        if let Err(message) = planning_apply_change_request_to_task(
            &mut client,
            id_tarea,
            campo_db,
            &valor_normalizado,
        )
        .await
        {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(message, 500)),
            )
                .into_response();
        }
    }

    if let Err(e) = client
        .execute(
            "UPDATE p_SolicitudesCambio SET estado = @P1, idUsuarioResolutor = @P2, fechaResolucion = GETDATE(), comentarioResolucion = @P3 WHERE idSolicitud = @P4",
            &[&estado, &id_usuario, &comentario_final, &id_solicitud],
        )
        .await
    {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(crate::models::ApiResponse::error(e.to_string(), 500)),
        )
            .into_response();
    }

    let mensaje = if accion == "Aprobar" {
        "Solicitud aprobada y cambio aplicado correctamente"
    } else {
        "Solicitud rechazada"
    };

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "idSolicitud": id_solicitud,
            "mensaje": mensaje
        }))),
    )
        .into_response()
}

pub async fn planning_approval_resolve(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Path(id_solicitud): Path<i32>,
    Json(body): Json<PlanningResolveRequest>,
) -> impl IntoResponse {
    planning_resolve(
        user,
        State(state),
        Json(PlanningResolveRequest {
            id_solicitud: Some(id_solicitud as u64),
            accion: body.accion,
            comentario: body.comentario,
        }),
    )
    .await
}

pub async fn planning_plans(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    OriginalUri(original_uri): OriginalUri,
    query: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let mes = query
        .get("mes")
        .and_then(|v| v.parse::<i32>().ok())
        .unwrap_or(0);
    let anio = query
        .get("anio")
        .and_then(|v| v.parse::<i32>().ok())
        .unwrap_or(0);
    let id_usuario_obj = query
        .get("idUsuario")
        .and_then(|v| v.parse::<i32>().ok())
        .unwrap_or(user.user_id_i32());

    if !(1..=12).contains(&mes) {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"message": "mes inválido (1-12)."})),
        )
            .into_response();
    }
    if !(2000..=2100).contains(&anio) {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"message": "anio inválido (2000-2100)."})),
        )
            .into_response();
    }

    let mut carnet_obj = user.carnet().to_string();
    if id_usuario_obj != user.user_id_i32() {
        let user_data = match crate::handlers::equipo::exec_sp_to_json_result(
            &mut client,
            "EXEC sp_Usuarios_ObtenerDetallesPorId_rust @P1",
            &[&id_usuario_obj],
        )
        .await
        {
            Ok(rows) => rows,
            Err(e) => {
                let mut response = crate::models::ApiResponse::error(e, 500);
                response.path = original_uri
                    .path_and_query()
                    .map(|value| value.as_str())
                    .unwrap_or(original_uri.path())
                    .to_string();
                return (StatusCode::INTERNAL_SERVER_ERROR, Json(response)).into_response();
            }
        };
        if let Some(u) = user_data.first() {
            carnet_obj = u
                .get("carnet")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
        } else {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({"message": "Usuario no encontrado"})),
            )
                .into_response();
        }

        if carnet_obj.trim().is_empty() {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({"message": "Carnet de usuario objetivo no encontrado"})),
            )
                .into_response();
        }

        if !user.is_admin() {
            let visible_carnets = match crate::handlers::equipo::get_visible_carnets(
                &mut client,
                user.carnet(),
            )
            .await
            {
                Ok(v) => v,
                Err(_) => vec![user.carnet().to_string()],
            };
            if !visible_carnets
                .iter()
                .any(|c| c.trim() == carnet_obj.trim())
            {
                return (
                    StatusCode::FORBIDDEN,
                    Json(crate::models::ApiResponse::error(
                        "No tienes acceso a este usuario.".to_string(),
                        403,
                    )),
                )
                    .into_response();
            }
        }
    }

    let recordsets = match crate::handlers::equipo::exec_sp_multi_to_json_result(
        &mut client,
        "EXEC sp_Planning_ObtenerPlanDetalle_rust @idPlan=@P1, @carnet=@P2, @mes=@P3, @anio=@P4",
        &[&0i32, &carnet_obj, &mes, &anio],
    )
    .await
    {
        Ok(recordsets) => recordsets,
        Err(e) => {
            let mut response = crate::models::ApiResponse::error(e, 500);
            response.path = original_uri
                .path_and_query()
                .map(|value| value.as_str())
                .unwrap_or(original_uri.path())
                .to_string();
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(response)).into_response();
        }
    };

    if let Some(plan_rows) = recordsets.get(0) {
        if let Some(p_row) = plan_rows.first() {
            let mut plan_obj = p_row.clone();
            let tareas = recordsets.get(1).cloned().unwrap_or_default();

            let mut semanas = vec![];
            for i in 1..=4 {
                let sem_tareas: Vec<_> = tareas
                    .iter()
                    .filter(|t| t.get("semana").and_then(|v| v.as_i64()) == Some(i as i64))
                    .cloned()
                    .collect();
                semanas.push(serde_json::json!({
                    "id": i,
                    "label": format!("Semana {}", i),
                    "tareas": sem_tareas
                }));
            }
            plan_obj
                .as_object_mut()
                .unwrap()
                .insert("semanas".to_string(), serde_json::json!(semanas));
            return (
                StatusCode::OK,
                Json(crate::models::ApiResponse::success_with_status(
                    plan_obj,
                    200,
                    original_uri
                        .path_and_query()
                        .map(|value| value.as_str())
                        .unwrap_or(original_uri.path()),
                )),
            )
                .into_response();
        }
    }

    let semanas: Vec<_> = (1..=4)
        .map(|i| {
            serde_json::json!({
                "id": i,
                "label": format!("Semana {}", i),
                "tareas": []
            })
        })
        .collect();

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success_with_status(
            serde_json::json!({
                "idPlan": serde_json::Value::Null,
                "semanas": semanas
            }),
            200,
            original_uri
                .path_and_query()
                .map(|value| value.as_str())
                .unwrap_or(original_uri.path()),
        )),
    )
        .into_response()
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

    let id_usuario_obj = match body.get("idUsuario").and_then(|v| v.as_i64()) {
        Some(value) if value > 0 => value as i32,
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({"message": "idUsuario inválido."})),
            )
                .into_response()
        }
    };
    let mes = body.get("mes").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
    let anio = body.get("anio").and_then(|v| v.as_i64()).unwrap_or(0) as i32;

    if !(1..=12).contains(&mes) {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"message": "mes inválido (1-12)."})),
        )
            .into_response();
    }
    if !(2000..=2100).contains(&anio) {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"message": "anio inválido (2000-2100)."})),
        )
            .into_response();
    }

    if id_usuario_obj != user.user_id_i32() && !user.is_admin() {
        let user_data = crate::handlers::equipo::exec_sp_to_json(
            &mut client,
            "EXEC sp_Usuarios_ObtenerDetallesPorId_rust @P1",
            &[&id_usuario_obj],
        )
        .await;
        let carnet_obj =
            match user_data
                .first()
                .and_then(|u| u.get("carnet"))
                .and_then(|v| v.as_str())
            {
                Some(value) if !value.trim().is_empty() => value.to_string(),
                _ => return (
                    StatusCode::NOT_FOUND,
                    Json(
                        serde_json::json!({"message": "Carnet de usuario objetivo no encontrado"}),
                    ),
                )
                    .into_response(),
            };

        let visible_carnets =
            match crate::handlers::equipo::get_visible_carnets(&mut client, user.carnet()).await {
                Ok(v) => v,
                Err(_) => vec![user.carnet().to_string()],
            };
        if !visible_carnets
            .iter()
            .any(|c| c.trim() == carnet_obj.trim())
        {
            return (
                StatusCode::FORBIDDEN,
                Json(crate::models::ApiResponse::error(
                    "No tienes acceso a este usuario.".to_string(),
                    403,
                )),
            )
                .into_response();
        }
    }

    let objetivos = match body.get("objetivos") {
        Some(v) if v.is_string() => v.as_str().unwrap().to_string(),
        Some(v) => v.to_string(),
        None => "".to_string(),
    };

    let estado = body
        .get("estado")
        .and_then(|v| v.as_str())
        .unwrap_or("Borrador");
    let id_creador = user.user_id_i32();

    let upsert_res = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Planning_UpsertPlan_rust @P1, @P2, @P3, @P4, @P5, @P6",
        &[
            &id_usuario_obj,
            &mes,
            &anio,
            &objetivos,
            &estado,
            &id_creador,
        ],
    )
    .await;

    if let Some(new_plan) = upsert_res.first() {
        (
            StatusCode::OK,
            Json(crate::models::ApiResponse::success(new_plan.clone())),
        )
            .into_response()
    } else {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(crate::models::ApiResponse::error(
                "Error al procesar plan".to_string(),
                500,
            )),
        )
            .into_response()
    }
}

pub async fn planning_stats(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    OriginalUri(original_uri): OriginalUri,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let carnet = user.carnet();

    // 1. Get visible carnets
    let mut visible_carnets = Vec::new();
    if let Ok(stream) = client
        .query("EXEC sp_Visibilidad_ObtenerCarnets_rust @P1", &[&carnet])
        .await
    {
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

    if let Ok(stream) = client
        .query(
            "EXEC sp_Usuarios_ObtenerDetallesPorCarnets_rust @P1",
            &[&carnets_csv],
        )
        .await
    {
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
        return (
            StatusCode::OK,
            Json(crate::models::ApiResponse::success_with_status(
                serde_json::json!({
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
                }),
                200,
                original_uri.path(),
            )),
        )
            .into_response();
    }

    let ids_str = ids_list
        .iter()
        .map(|id| id.to_string())
        .collect::<Vec<_>>()
        .join(",");

    // Zero Inline SQL: MigraciÃ³n a sp_Planning_StatsDashboard (Multi-Resultset)
    // Este SP reemplaza todas las consultas inline anteriores en un solo viaje a la DB.
    let recordsets = match crate::handlers::equipo::exec_sp_multi_to_json_result(
        &mut client,
        "EXEC sp_Planning_StatsDashboard_rust @P1",
        &[&ids_str],
    )
    .await
    {
        Ok(recordsets) => recordsets,
        Err(e) => {
            let mut response = crate::models::ApiResponse::error(e, 500);
            response.path = original_uri.path().to_string();
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(response)).into_response();
        }
    };

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
    let mut total_all = 0;
    let mut hechas_all = 0;
    let mut atrasadas_all = 0;
    let mut bloqueadas_all = 0;
    let mut projects_stats = Vec::new();

    for p in projects_raw {
        let total_tasks = p["totalTasks"].as_i64().unwrap_or(0) as i32;
        let p_hechas = p["hechas"].as_i64().unwrap_or(0) as i32;
        let p_id = p["idProyecto"].as_i64().unwrap_or(0) as i32;

        let progress = if total_tasks > 0 {
            ((p_hechas as f64 / total_tasks as f64) * 100.0).round() as i32
        } else {
            0
        };

        let mut expected_progress = 0;
        let now = chrono::Utc::now().timestamp_millis();
        if let (Some(f_inicio_str), Some(f_fin_str)) =
            (p["fechaInicio"].as_str(), p["fechaFin"].as_str())
        {
            let start = chrono::NaiveDateTime::parse_from_str(f_inicio_str, "%Y-%m-%d %H:%M:%S%.f")
                .map(|nd| nd.and_utc().timestamp_millis())
                .unwrap_or(0);
            let end = chrono::NaiveDateTime::parse_from_str(f_fin_str, "%Y-%m-%d %H:%M:%S%.f")
                .map(|nd| nd.and_utc().timestamp_millis())
                .unwrap_or(0);

            if start > 0 && end > start {
                if now >= end {
                    expected_progress = 100;
                } else if now <= start {
                    expected_progress = 0;
                } else {
                    expected_progress =
                        (((now - start) as f64 / (end - start) as f64) * 100.0).round() as i32;
                }
            }
        }

        let p_tasks: Vec<_> = tasks_raw
            .iter()
            .filter(|t| t["idProyecto"].as_i64().unwrap_or(0) as i32 == p_id)
            .cloned()
            .collect();

        total_all += total_tasks;
        hechas_all += p_hechas;
        atrasadas_all += p["atrasadas"].as_i64().unwrap_or(0) as i32;
        bloqueadas_all += p["bloqueadas"].as_i64().unwrap_or(0) as i32;

        let mut ps = p.clone();
        ps.as_object_mut()
            .unwrap()
            .insert("id".to_string(), serde_json::json!(p_id));
        ps.as_object_mut()
            .unwrap()
            .insert("progress".to_string(), serde_json::json!(progress));
        ps.as_object_mut().unwrap().insert(
            "expectedProgress".to_string(),
            serde_json::json!(expected_progress),
        );
        ps.as_object_mut().unwrap().insert(
            "deviation".to_string(),
            serde_json::json!(progress - expected_progress),
        );
        ps.as_object_mut()
            .unwrap()
            .insert("tareas".to_string(), serde_json::json!(p_tasks));
        projects_stats.push(ps);
    }

    // 5. Hierarchy breakdown
    let mut subgerencia_map: std::collections::HashMap<String, serde_json::Value> =
        std::collections::HashMap::new();
    for ps in &projects_stats {
        let key = ps["subgerencia"].as_str().unwrap_or("General").to_string();
        let entry = subgerencia_map.entry(key.clone()).or_insert_with(|| serde_json::json!({
            "name": key, "pendientes": 0, "enCurso": 0, "hechas": 0, "bloqueadas": 0, "atrasadas": 0, "total": 0
        }));
        entry["pendientes"] = serde_json::json!(
            entry["pendientes"].as_i64().unwrap() + ps["pendientes"].as_i64().unwrap_or(0)
        );
        entry["enCurso"] = serde_json::json!(
            entry["enCurso"].as_i64().unwrap() + ps["enCurso"].as_i64().unwrap_or(0)
        );
        entry["hechas"] = serde_json::json!(
            entry["hechas"].as_i64().unwrap() + ps["hechas"].as_i64().unwrap_or(0)
        );
        entry["bloqueadas"] = serde_json::json!(
            entry["bloqueadas"].as_i64().unwrap() + ps["bloqueadas"].as_i64().unwrap_or(0)
        );
        entry["atrasadas"] = serde_json::json!(
            entry["atrasadas"].as_i64().unwrap() + ps["atrasadas"].as_i64().unwrap_or(0)
        );
        entry["total"] = serde_json::json!(
            entry["total"].as_i64().unwrap() + ps["totalTasks"].as_i64().unwrap_or(0)
        );
    }
    let hierarchy_breakdown: Vec<_> = subgerencia_map.values().cloned().collect();

    // 6. Users Without Plan (Using parallel results)

    let users_without_plan: Vec<_> = visible_users
        .into_iter()
        .filter(|u| !active_user_ids.contains(&(u["id"].as_i64().unwrap_or(0) as i32)))
        .collect();

    // 7. Top Delays (Using parallel results)

    let bottlenecks = if top_delays.len() > 5 {
        top_delays[0..5].to_vec()
    } else {
        top_delays.clone()
    };

    let global_completion = if total_all > 0 {
        ((hechas_all as f64 / total_all as f64) * 100.0).round() as i32
    } else {
        0
    };

    (StatusCode::OK, Json(crate::models::ApiResponse::success_with_status(serde_json::json!({
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
    }), 200, original_uri.path()))).into_response()
}

pub async fn planning_stats_compliance(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    OriginalUri(original_uri): OriginalUri,
    query: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let month = query
        .get("mes")
        .and_then(|v| v.parse::<i32>().ok())
        .unwrap_or(0);
    let year = query
        .get("anio")
        .and_then(|v| v.parse::<i32>().ok())
        .unwrap_or(0);

    if month < 1 || month > 12 || year < 2000 {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"message": "Mes y aÃ±o invÃ¡lidos"})),
        )
            .into_response();
    }

    // Zero Inline SQL: Usar SP sp_Planning_StatsCompliance
    let items = match crate::handlers::equipo::exec_sp_to_json_result(
        &mut client,
        "EXEC sp_Planning_StatsCompliance_rust @P1, @P2",
        &[&month, &year],
    )
    .await
    {
        Ok(items) => items,
        Err(e) => {
            let mut response = crate::models::ApiResponse::error(e, 500);
            response.path = original_uri
                .path_and_query()
                .map(|value| value.as_str())
                .unwrap_or(original_uri.path())
                .to_string();
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(response)).into_response();
        }
    };

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

    let compliance = if total > 0 {
        (confirmed as f64 / total as f64 * 100.0).round() as i32
    } else {
        0
    };

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success_with_status(
            serde_json::json!({
                "month": month,
                "year": year,
                "compliance": compliance,
                "totalPlans": total,
                "breakdown": items
            }),
            200,
            original_uri
                .path_and_query()
                .map(|value| value.as_str())
                .unwrap_or(original_uri.path()),
        )),
    )
        .into_response()
}

pub async fn planning_stats_performance(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    OriginalUri(original_uri): OriginalUri,
    query: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let month = query
        .get("mes")
        .and_then(|v| v.parse::<i32>().ok())
        .unwrap_or(0);
    let year = query
        .get("anio")
        .and_then(|v| v.parse::<i32>().ok())
        .unwrap_or(0);

    if month < 1 || month > 12 || year < 2000 {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"message": "Mes y aÃ±o invÃ¡lidos"})),
        )
            .into_response();
    }

    // Zero Inline SQL: Usar SP sp_Planning_StatsPerformance
    let items = match crate::handlers::equipo::exec_sp_to_json_result(
        &mut client,
        "EXEC sp_Planning_StatsPerformance_rust @P1, @P2",
        &[&month, &year],
    )
    .await
    {
        Ok(items) => items,
        Err(e) => {
            let mut response = crate::models::ApiResponse::error(e, 500);
            response.path = original_uri
                .path_and_query()
                .map(|value| value.as_str())
                .unwrap_or(original_uri.path())
                .to_string();
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(response)).into_response();
        }
    };

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success_with_status(
            items,
            200,
            original_uri
                .path_and_query()
                .map(|value| value.as_str())
                .unwrap_or(original_uri.path()),
        )),
    )
        .into_response()
}

pub async fn planning_stats_bottlenecks(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    OriginalUri(original_uri): OriginalUri,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    // Zero Inline SQL: Usar SP sp_Planning_StatsBottlenecks (Multi-Resultset)
    let recordsets = match crate::handlers::equipo::exec_sp_multi_to_json_result(
        &mut client,
        "EXEC sp_Planning_StatsBottlenecks_rust",
        &[],
    )
    .await
    {
        Ok(recordsets) => recordsets,
        Err(e) => {
            let mut response = crate::models::ApiResponse::error(e, 500);
            response.path = original_uri.path().to_string();
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(response)).into_response();
        }
    };
    let top_delayed = recordsets.get(0).cloned().unwrap_or_default();
    let top_blockers = recordsets.get(1).cloned().unwrap_or_default();

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success_with_status(
            serde_json::json!({
                "topDelayedUsers": top_delayed,
                "topBlockers": top_blockers
            }),
            200,
            original_uri.path(),
        )),
    )
        .into_response()
}

pub async fn planning_team(
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
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };
    // Zero Inline SQL: Usar sp_Visibilidad_ObtenerMiEquipo en lugar de SELECT manual
    // NestJS: visibilidad.service.obtenerMiEquipo(carnet) que usa sp_Visibilidad_ObtenerMiEquipo
    let mut team = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Visibilidad_ObtenerMiEquipo_rust @idUsuario=NULL, @carnet=@P1",
        &[&carnet],
    )
    .await;

    // NestJS Parity: Garantizar que el usuario mismo esté en la lista (fuente: 'MISMO')
    let is_self_in_team = team
        .iter()
        .any(|m| m.get("carnet").and_then(|v| v.as_str()).map(|s| s.trim()) == Some(carnet.trim()));

    if !is_self_in_team {
        let self_details = crate::handlers::equipo::exec_sp_to_json(
            &mut client,
            "EXEC sp_Usuarios_ObtenerDetallesPorCarnets_rust @P1",
            &[&carnet],
        )
        .await;
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

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(team)),
    )
        .into_response()
}

pub async fn planning_my_projects(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    query_params: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    // FIX: Use carnet from JWT, not "UNKNOWN"
    let carnet = query_params
        .get("carnet")
        .cloned()
        .unwrap_or_else(|| user.carnet().to_string());
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };
    let projects = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_ObtenerProyectos_rust @carnet = @P1, @filtroNombre = NULL, @filtroEstado = NULL",
        &[&carnet],
    )
    .await;

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(projects)),
    )
        .into_response()
}

pub async fn planning_close_plan(
    _user: crate::auth::AuthUser,
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
    if let Err(e) = client.execute("EXEC sp_Plan_Cerrar_rust @P1", &[&id]).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(crate::models::ApiResponse::error(e.to_string(), 500)),
        )
            .into_response();
    }
    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(
            serde_json::json!({ "success": true }),
        )),
    )
        .into_response()
}

pub async fn planning_update_operative(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    OriginalUri(original_uri): OriginalUri,
    Json(body): Json<serde_json::Value>,
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

    let id_tarea = body.get("idTarea").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
    if id_tarea <= 0 {
        return (
            StatusCode::BAD_REQUEST,
            Json(crate::models::ApiResponse::error(
                "idTarea invÃ¡lido".to_string(),
                400,
            )),
        )
            .into_response();
    }

    let task = match planning_load_task(&mut client, id_tarea).await {
        Some(value) => value,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(crate::models::ApiResponse::error(
                    "Tarea no encontrada".to_string(),
                    404,
                )),
            )
                .into_response()
        }
    };

    if !planning_can_access_task_for_change(&mut client, &user, &task).await {
        return (
            StatusCode::FORBIDDEN,
            Json(crate::models::ApiResponse::error(
                "No tienes permiso para editar esta tarea".to_string(),
                403,
            )),
        )
            .into_response();
    }

    let permission = planning_resolve_edit_permission(&mut client, &user, &task).await;
    if !permission.puede_editar {
        return (
            StatusCode::FORBIDDEN,
            Json(crate::models::ApiResponse::error(
                "No tienes permiso para editar esta tarea".to_string(),
                403,
            )),
        )
            .into_response();
    }
    if permission.requiere_aprobacion {
        return (
            StatusCode::BAD_REQUEST,
            Json(crate::models::ApiResponse::error(
                "Esta tarea requiere aprobación. Usa request-change.".to_string(),
                400,
            )),
        )
            .into_response();
    }

    let updates = match body.get("updates").and_then(|v| v.as_object()) {
        Some(o) => o,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(crate::models::ApiResponse::error(
                    "updates requerido".to_string(),
                    400,
                )),
            )
                .into_response()
        }
    };

    let titulo = updates
        .get("nombre")
        .or_else(|| updates.get("titulo"))
        .and_then(|v| v.as_str());
    let descripcion = updates.get("descripcion").and_then(|v| v.as_str());
    let estado = updates.get("estado").and_then(|v| v.as_str());
    let prioridad = updates.get("prioridad").and_then(|v| v.as_str());
    let progreso = updates
        .get("porcentaje")
        .or_else(|| updates.get("progreso"))
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);
    let link_evidencia = updates.get("linkEvidencia").and_then(|v| v.as_str());
    let id_tarea_padre = updates
        .get("idTareaPadre")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);

    let parse_date = |v: Option<&serde_json::Value>| -> Option<chrono::NaiveDateTime> {
        v.and_then(|s| s.as_str()).and_then(|s| {
            chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.fZ")
                .ok()
                .or_else(|| {
                    chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d")
                        .ok()
                        .map(|d| d.and_hms_opt(0, 0, 0).unwrap())
                })
        })
    };

    let fecha_objetivo = parse_date(updates.get("fechaObjetivo"));
    let fecha_inicio = parse_date(updates.get("fechaInicioPlanificada"));
    let has_valid_updates = titulo.is_some()
        || descripcion.is_some()
        || estado.is_some()
        || prioridad.is_some()
        || progreso.is_some()
        || fecha_objetivo.is_some()
        || fecha_inicio.is_some()
        || link_evidencia.is_some()
        || id_tarea_padre.is_some();

    if !has_valid_updates {
        return (
            StatusCode::BAD_REQUEST,
            Json(crate::models::ApiResponse::error(
                "No hay campos válidos para actualizar.".to_string(),
                400,
            )),
        )
            .into_response();
    }

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
            @fechaInicioPlanificada = @P8,
            @linkEvidencia = @P9,
            @idTareaPadre = @P10
    "#;

    if let Err(e) = client
        .execute(
            query,
            &[
                &id_tarea,
                &titulo,
                &descripcion,
                &estado,
                &prioridad,
                &progreso,
                &fecha_objetivo,
                &fecha_inicio,
                &link_evidencia,
                &id_tarea_padre,
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

    (
        StatusCode::CREATED,
        Json(crate::models::ApiResponse::success_with_status(
            serde_json::json!({ "exito": true }),
            201,
            original_uri.path(),
        )),
    )
        .into_response()
}

pub async fn planning_clone_task(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let task = match planning_load_task(&mut client, id).await {
        Some(value) => value,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(crate::models::ApiResponse::error(
                    "Tarea no encontrada".to_string(),
                    404,
                )),
            )
                .into_response()
        }
    };

    if !planning_can_access_task_for_change(&mut client, &user, &task).await {
        return (
            StatusCode::FORBIDDEN,
            Json(crate::models::ApiResponse::error(
                "No tienes permisos para ver/editar esta tarea.".to_string(),
                403,
            )),
        )
            .into_response();
    }

    let carnet = planning_effective_user_carnet(&mut client, &user).await;
    if carnet.is_empty() {
        return (
            StatusCode::FORBIDDEN,
            Json(crate::models::ApiResponse::error(
                "No se pudo resolver el carnet del usuario".to_string(),
                403,
            )),
        )
            .into_response();
    }

    let mut new_id = 0;

    if let Ok(stream) = client
        .query(
            "EXEC sp_Tarea_Clonar_rust @P1, @P2",
            &[&id, &carnet.as_str()],
        )
        .await
    {
        if let Ok(rows) = stream.into_first_result().await {
            if let Some(r) = rows.into_iter().next() {
                new_id = r.try_get::<i32, _>("idTarea").ok().flatten().unwrap_or(0);
            }
        }
    }

    (
        StatusCode::CREATED,
        Json(crate::models::ApiResponse::success_with_status(
            serde_json::json!({ "id": new_id }),
            201,
            format!("/api/planning/tasks/{}/clone", id),
        )),
    )
        .into_response()
}

pub async fn planning_task_history(
    user: crate::auth::AuthUser,
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

    let task = match planning_load_task(&mut client, id).await {
        Some(value) => value,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(crate::models::ApiResponse::error(
                    "Tarea no encontrada".to_string(),
                    404,
                )),
            )
                .into_response()
        }
    };

    if !planning_can_access_task_for_change(&mut client, &user, &task).await {
        return (
            StatusCode::FORBIDDEN,
            Json(crate::models::ApiResponse::error(
                "No tienes permisos para ver/editar esta tarea.".to_string(),
                403,
            )),
        )
            .into_response();
    }

    let id_str = id.to_string();
    let mut history = Vec::new();

    if let Ok(st) = client.query("SELECT * FROM p_Auditoria WHERE recurso = 'Tarea' AND recursoId = @P1 ORDER BY fecha DESC", &[&id_str]).await {
        if let Ok(rows) = st.into_first_result().await {
            history = rows.into_iter().map(|r| crate::handlers::equipo::row_to_json(&r)).collect();
        }
    }

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(history)),
    )
        .into_response()
}

pub async fn planning_task_avance_mensual(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    OriginalUri(original_uri): OriginalUri,
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

    let task = match planning_load_task(&mut client, id).await {
        Some(value) => value,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(crate::models::ApiResponse::error(
                    "Tarea no encontrada".to_string(),
                    404,
                )),
            )
                .into_response()
        }
    };

    if !planning_can_access_task_for_change(&mut client, &user, &task).await {
        return (
            StatusCode::FORBIDDEN,
            Json(crate::models::ApiResponse::error(
                "No tienes permisos para ver/editar esta tarea.".to_string(),
                403,
            )),
        )
            .into_response();
    }

    let historial = planning_fetch_avance_mensual_rows(&mut client, id).await;

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success_with_status(
            historial,
            200,
            original_uri.path(),
        )),
    )
        .into_response()
}

pub async fn planning_task_save_avance_mensual(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    OriginalUri(original_uri): OriginalUri,
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
    let progress_val = body.progress as f64;
    let comentario = body.comentario.clone().and_then(|value| {
        if value.trim().is_empty() {
            None
        } else {
            Some(value)
        }
    });

    if let Err(message) = planning_validate_month_year(month, year) {
        return (
            StatusCode::BAD_REQUEST,
            Json(crate::models::ApiResponse::error(message, 400)),
        )
            .into_response();
    }

    if let Err(message) = planning_validate_percent(progress_val) {
        return (
            StatusCode::BAD_REQUEST,
            Json(crate::models::ApiResponse::error(message, 400)),
        )
            .into_response();
    }

    let task = match planning_load_task(&mut client, id).await {
        Some(value) => value,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(crate::models::ApiResponse::error(
                    "Tarea no encontrada".to_string(),
                    404,
                )),
            )
                .into_response()
        }
    };

    if !planning_can_access_task_for_change(&mut client, &user, &task).await {
        return (
            StatusCode::FORBIDDEN,
            Json(crate::models::ApiResponse::error(
                "No tienes permisos para ver/editar esta tarea.".to_string(),
                403,
            )),
        )
            .into_response();
    }

    if let Err(e) = client
        .execute(
            "EXEC sp_UpsertAvanceMensual_rust @P1, @P2, @P3, @P4, @P5, @P6",
            &[&id, &year, &month, &progress_val, &comentario, &id_usuario],
        )
        .await
    {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": e.to_string()})),
        )
            .into_response();
    }

    let historial = planning_fetch_avance_mensual_rows(&mut client, id).await;

    (
        StatusCode::CREATED,
        Json(crate::models::ApiResponse::success_with_status(
            historial,
            201,
            original_uri.path(),
        )),
    )
        .into_response()
}

pub async fn planning_task_crear_grupo(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    OriginalUri(original_uri): OriginalUri,
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

    let task = match planning_load_task(&mut client, id).await {
        Some(value) => value,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(crate::models::ApiResponse::error(
                    "Tarea no encontrada".to_string(),
                    404,
                )),
            )
                .into_response()
        }
    };

    if !planning_can_access_task_for_change(&mut client, &user, &task).await {
        return (
            StatusCode::FORBIDDEN,
            Json(crate::models::ApiResponse::error(
                "No tienes permisos para ver/editar esta tarea.".to_string(),
                403,
            )),
        )
            .into_response();
    }

    match client
        .execute("EXEC sp_CrearGrupoInicial_rust @P1", &[&id])
        .await
    {
        Ok(_) => (
            StatusCode::CREATED,
            Json(crate::models::ApiResponse::success_with_status(
                serde_json::json!({
                    "idGrupo": id,
                    "message": "Grupo creado"
                }),
                201,
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

pub async fn planning_task_agregar_fase(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    OriginalUri(original_uri): OriginalUri,
    Path(id_grupo): Path<i32>,
    Json(body): Json<PlanningAgregarFaseRequest>,
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

    let id_tarea_nueva = body.id_tarea_nueva;
    if id_tarea_nueva <= 0 {
        return (
            StatusCode::BAD_REQUEST,
            Json(crate::models::ApiResponse::error(
                "idTareaNueva inválido.".to_string(),
                400,
            )),
        )
            .into_response();
    }

    let grupo = match planning_load_task(&mut client, id_grupo).await {
        Some(value) => value,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(crate::models::ApiResponse::error(
                    "Grupo no encontrado".to_string(),
                    404,
                )),
            )
                .into_response()
        }
    };

    if !planning_can_access_task_for_change(&mut client, &user, &grupo).await {
        return (
            StatusCode::FORBIDDEN,
            Json(crate::models::ApiResponse::error(
                "No tienes permisos para ver/editar esta tarea.".to_string(),
                403,
            )),
        )
            .into_response();
    }

    let fase = match planning_load_task(&mut client, id_tarea_nueva).await {
        Some(value) => value,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(crate::models::ApiResponse::error(
                    "Tarea fase no encontrada".to_string(),
                    404,
                )),
            )
                .into_response()
        }
    };

    if !planning_can_access_task_for_change(&mut client, &user, &fase).await {
        return (
            StatusCode::FORBIDDEN,
            Json(crate::models::ApiResponse::error(
                "No tienes permisos para ver/editar esta tarea.".to_string(),
                403,
            )),
        )
            .into_response();
    }

    match client
        .execute(
            "EXEC sp_AgregarFaseGrupo_rust @P1, @P2",
            &[&id_grupo, &id_tarea_nueva],
        )
        .await
    {
        Ok(_) => match planning_fetch_group_tasks(&mut client, id_grupo).await {
            Ok(items) => {
                return (
                    StatusCode::CREATED,
                    Json(crate::models::ApiResponse::success_with_status(
                        items,
                        201,
                        original_uri.path(),
                    )),
                )
                    .into_response();
            }
            Err(error) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(crate::models::ApiResponse::error(error, 500)),
                )
                    .into_response();
            }
        },
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(crate::models::ApiResponse::error(e.to_string(), 500)),
        )
            .into_response(),
    }
}

pub async fn planning_grupo_detail(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    OriginalUri(original_uri): OriginalUri,
    Path(id_grupo): Path<i32>,
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

    let grupo = match planning_load_task(&mut client, id_grupo).await {
        Some(value) => value,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(crate::models::ApiResponse::error(
                    "Grupo no encontrado".to_string(),
                    404,
                )),
            )
                .into_response()
        }
    };

    if !planning_can_access_task_for_change(&mut client, &user, &grupo).await {
        return (
            StatusCode::FORBIDDEN,
            Json(crate::models::ApiResponse::error(
                "No tienes permisos para ver/editar esta tarea.".to_string(),
                403,
            )),
        )
            .into_response();
    }

    match planning_fetch_group_tasks(&mut client, id_grupo).await {
        Ok(items) => (
            StatusCode::OK,
            Json(crate::models::ApiResponse::success_with_status(
                items,
                200,
                original_uri.path(),
            )),
        )
            .into_response(),
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    }
}

pub async fn planning_dashboard_alerts(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
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
                    if let Ok(parsed_date) =
                        chrono::NaiveDate::parse_from_str(&fecha_obj[..10], "%Y-%m-%d")
                    {
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

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "overdue": overdue,
            "today": today
        }))),
    )
        .into_response()
}

pub async fn planning_mi_dia(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    query_params: axum::extract::Query<HashMap<String, String>>,
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

    let carnet = match query_params.get("carnet") {
        Some(value) if !value.trim().is_empty() => value.clone(),
        _ => planning_effective_user_carnet(&mut client, &user).await,
    };
    let fecha = query_params
        .get("fecha")
        .cloned()
        .unwrap_or_else(|| Utc::now().format("%Y-%m-%d").to_string());

    let tareas_rows = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Tareas_ObtenerPorUsuario_rust @P1, NULL, NULL, NULL, NULL, NULL",
        &[&carnet],
    )
    .await;
    let proyectos_raw = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Planning_ObtenerProyectosAsignados_rust @P1",
        &[&carnet],
    )
    .await;
    let ordered_tareas_rows = planning_order_tasks_like_nest(tareas_rows, &proyectos_raw);
    let (bloqueos_activos, mut backlog, mut tareas_sugeridas) =
        planning_prepare_mi_dia_tasks(ordered_tareas_rows, &carnet, &fecha);

    let mut checkin_hoy = serde_json::Value::Null;
    let q = "SELECT TOP 1 * FROM p_Checkins WHERE usuarioCarnet=@P1 AND CAST(fecha AS DATE)=CAST(@P2 AS DATE) ORDER BY idCheckin DESC";

    if let Ok(mut c) = state.pool.get().await {
        let mut id_checkin_found = 0i64;
        let mut checkin_obj_found = serde_json::Value::Null;

        if let Ok(st) = c.query(q, &[&carnet, &fecha]).await {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.first() {
                    let checkin_obj = crate::handlers::equipo::row_to_json(r);
                    id_checkin_found = checkin_obj
                        .get("idCheckin")
                        .and_then(|v| v.as_i64())
                        .unwrap_or(0);
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
        let tareas_checkin_ids: Vec<i64> = tareas_checkin
            .iter()
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

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "bloqueosActivos": bloqueos_activos,
            "bloqueosMeCulpan": [],
            "tareasSugeridas": tareas_sugeridas,
            "backlog": backlog,
            "checkinHoy": checkin_hoy
        }))),
    )
        .into_response()
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
    let estado_filter = query_params
        .get("estado")
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    let estado_param: Option<String> = match estado_filter.as_deref() {
        Some("pendientes") | Some("todas") => None,
        Some(other) => Some(other.to_string()),
        None => None,
    };

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

    let proyectos_raw = match client
        .query(
            "EXEC sp_Planning_ObtenerProyectosAsignados_rust @P1",
            &[&carnet],
        )
        .await
    {
        Ok(stream) => match stream.into_first_result().await {
            Ok(rows) => rows
                .into_iter()
                .map(|r| {
                    let progreso = r
                        .try_get::<f64, _>("progresoProyecto")
                        .ok()
                        .flatten()
                        .unwrap_or(0.0);
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

    let mut tareas_raw = match client
        .query(
            "EXEC sp_Tareas_ObtenerPorUsuario_rust @P1, @P2",
            &[&carnet, &estado_param],
        )
        .await
    {
        Ok(stream) => match stream.into_first_result().await {
            Ok(rows) => rows
                .into_iter()
                .map(|r| {
                    let f_obj = r
                        .try_get::<chrono::NaiveDateTime, _>("fechaObjetivo")
                        .ok()
                        .flatten();
                    let hoy = chrono::Utc::now().naive_utc().date();
                    let base_titulo = r
                        .try_get::<&str, _>("titulo")
                        .ok()
                        .flatten()
                        .filter(|value| !value.trim().is_empty())
                        .map(|value| value.to_string())
                        .or_else(|| {
                            r.try_get::<&str, _>("nombre")
                                .ok()
                                .flatten()
                                .map(|value| value.to_string())
                        })
                        .unwrap_or_default();
                    let estado = r
                        .try_get::<&str, _>("estado")
                        .ok()
                        .flatten()
                        .unwrap_or("")
                        .to_string();
                    let responsable_carnet = r
                        .try_get::<&str, _>("responsableCarnet")
                        .ok()
                        .flatten()
                        .unwrap_or("")
                        .to_string();
                    let responsable_nombre = r
                        .try_get::<&str, _>("responsableNombre")
                        .ok()
                        .flatten()
                        .unwrap_or("")
                        .to_string();
                    let es_finalizada = ["Hecha", "Completada", "Descartada", "Eliminada", "Archivada"]
                        .contains(&estado.as_str());
                    let es_atrasada = f_obj
                        .map(|fecha| fecha.date() < hoy && !es_finalizada)
                        .unwrap_or(false);
                    let dias_atraso = f_obj
                        .map(|fecha| {
                            if fecha.date() < hoy {
                                (hoy - fecha.date()).num_days() as i32
                            } else {
                                0
                            }
                        })
                        .unwrap_or(0);
                    let short_name = if !responsable_nombre.trim().is_empty() {
                        responsable_nombre
                            .split_whitespace()
                            .take(2)
                            .collect::<Vec<_>>()
                            .join(" ")
                    } else {
                        "Otro".to_string()
                    };
                    let final_title = if !responsable_carnet.trim().is_empty()
                        && responsable_carnet.trim() != carnet.trim()
                    {
                        format!("{} (Asig: {})", base_titulo, short_name)
                    } else {
                        base_titulo.clone()
                    };
                    let progreso = r
                        .try_get::<f64, _>("porcentaje")
                        .ok()
                        .flatten()
                        .map(|value| value.round() as i32)
                        .or_else(|| r.try_get::<i32, _>("porcentaje").ok().flatten())
                        .unwrap_or(0);

                    serde_json::json!({
                        "idTarea": r.try_get::<i32, _>("idTarea").ok().flatten().unwrap_or(0),
                        "titulo": final_title,
                        "nombre": final_title,
                        "estado": estado,
                        "prioridad": r.try_get::<&str, _>("prioridad").ok().flatten().unwrap_or("Media"),
                        "progreso": progreso,
                        "porcentaje": progreso,
                        "idProyecto": r.try_get::<i32, _>("idProyecto").ok().flatten(),
                        "proyectoNombre": r.try_get::<&str, _>("proyectoNombre").ok().flatten().unwrap_or("General"),
                        "fechaObjetivo": f_obj,
                        "diasAtraso": dias_atraso,
                        "esAtrasada": if es_atrasada { 1 } else { 0 },
                        "responsableCarnet": responsable_carnet,
                        "responsableNombre": responsable_nombre,
                    })
                })
                .collect::<Vec<_>>(),
            Err(_) => Vec::new(),
        },
        Err(_) => Vec::new(),
    };

    if estado_filter.as_deref() == Some("pendientes") {
        tareas_raw.retain(|t| {
            let estado = t.get("estado").and_then(|v| v.as_str()).unwrap_or("");
            ![
                "Hecha",
                "Completada",
                "Descartada",
                "Eliminada",
                "Archivada",
            ]
            .contains(&estado)
        });
    }

    let proyectos_base_count = proyectos_raw.len();
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
    let atrasadas = tareas_raw
        .iter()
        .filter(|t| t.get("esAtrasada").and_then(|v| v.as_i64()).unwrap_or(0) == 1)
        .count() as i32;
    let hoy_str = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let tareas_hoy = tareas_raw
        .iter()
        .filter(|t| {
            t.get("fechaObjetivo")
                .map(planning_json_value_to_string)
                .map(|value| value.get(..10).unwrap_or("") == hoy_str)
                .unwrap_or(false)
        })
        .count() as i32;
    let tareas_completadas = tareas_raw
        .iter()
        .filter(|t| {
            matches!(
                t.get("estado").and_then(|v| v.as_str()).unwrap_or(""),
                "Hecha" | "Completada"
            )
        })
        .count() as i32;

    for t in &tareas_raw {
        let id_proy = t["idProyecto"].as_i64().unwrap_or(0) as i32;
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

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "proyectos": proyectos_final,
            "resumen": {
                "totalProyectos": proyectos_base_count + if proyectos_final.iter().any(|p| p.get("idProyecto").and_then(|v| v.as_i64()) == Some(0)) { 1 } else { 0 },
                "totalTareas": total_tareas,
                "tareasAtrasadas": atrasadas,
                "tareasHoy": tareas_hoy,
                "tareasCompletadas": tareas_completadas,
            }
        }))),
    )
        .into_response()
}

pub async fn planning_supervision(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(
                    "DB connect error".to_string(),
                    500,
                )),
            )
                .into_response()
        }
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

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "usuariosSinTarea": usuarios_sin_tarea,
            "proyectosSinTarea": proyectos_sin_tarea,
        }))),
    )
        .into_response()
}

pub async fn planning_debug(_user: crate::auth::AuthUser) -> Json<serde_json::Value> {
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
    State(state): State<ApiState>,
    Json(body): Json<PlanningReassignRequest>,
) -> impl IntoResponse {
    if body.task_ids.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(crate::models::ApiResponse::error(
                "taskIds invalido".to_string(),
                400,
            )),
        )
            .into_response();
    }

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

    let mut to_carnet = String::new();
    if let Ok(stream) = client
        .query(
            "SELECT carnet FROM p_Usuarios WHERE idUsuario = @P1 AND activo = 1",
            &[&body.to_user_id],
        )
        .await
    {
        if let Ok(rows) = stream.into_first_result().await {
            if let Some(row) = rows.into_iter().next() {
                to_carnet = row
                    .try_get::<&str, _>("carnet")
                    .ok()
                    .flatten()
                    .unwrap_or("")
                    .to_string();
            }
        }
    }

    if to_carnet.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(crate::models::ApiResponse::error(
                "Usuario destino no tiene carnet valido".to_string(),
                400,
            )),
        )
            .into_response();
    }

    let task_ids_csv = body
        .task_ids
        .iter()
        .map(|id| id.to_string())
        .collect::<Vec<_>>()
        .join(",");

    if let Err(e) = client
        .execute(
            "EXEC sp_Tareas_Reasignar_PorCarnet_rust @P1, @P2",
            &[&task_ids_csv, &to_carnet],
        )
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
            "exito": true
        }))),
    )
        .into_response()
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
    #[serde(alias = "action")]
    pub accion: String,
    #[serde(alias = "comment")]
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
    #[serde(rename = "fromUserId", alias = "idUsuarioOrigen")]
    pub from_user_id: i32,
    #[serde(rename = "toUserId", alias = "idUsuarioDestino")]
    pub to_user_id: i32,
    #[serde(rename = "taskIds")]
    pub task_ids: Vec<i32>,
    pub reason: Option<String>,
}

#[derive(Deserialize)]
pub struct PlanningTaskAvanceMensualRequest {
    #[serde(rename = "anio", alias = "year")]
    pub year: u16,
    #[serde(rename = "mes", alias = "month")]
    pub month: u8,
    #[serde(rename = "porcentajeMes", alias = "progress")]
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

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn planning_request_change_field_db_maps_legacy_aliases() {
        assert_eq!(planning_request_change_field_db("titulo"), Some("nombre"));
        assert_eq!(planning_request_change_field_db("nombre"), Some("nombre"));
        assert_eq!(
            planning_request_change_field_db("progreso"),
            Some("porcentaje")
        );
        assert_eq!(
            planning_request_change_field_db("porcentaje"),
            Some("porcentaje")
        );
        assert_eq!(planning_request_change_field_db("desconocido"), None);
    }

    #[test]
    fn planning_json_value_to_string_handles_scalars() {
        assert_eq!(planning_json_value_to_string(&serde_json::Value::Null), "");
        assert_eq!(planning_json_value_to_string(&json!("texto")), "texto");
        assert_eq!(planning_json_value_to_string(&json!(25)), "25");
        assert_eq!(planning_json_value_to_string(&json!(true)), "true");
    }

    #[test]
    fn planning_normalize_request_change_value_validates_percentages() {
        assert_eq!(
            planning_normalize_request_change_value("porcentaje", Some(&json!(55))).unwrap(),
            "55"
        );
        assert_eq!(
            planning_normalize_request_change_value("porcentaje", Some(&json!(55.5))).unwrap(),
            "55.5"
        );
        assert!(planning_normalize_request_change_value("porcentaje", Some(&json!(120))).is_err());
        assert!(
            planning_normalize_request_change_value("porcentaje", Some(&json!("abc"))).is_err()
        );
    }

    #[test]
    fn planning_normalize_request_change_value_validates_dates() {
        assert_eq!(
            planning_normalize_request_change_value("fechaObjetivo", Some(&json!("2026-03-27")))
                .unwrap(),
            "2026-03-27"
        );
        assert_eq!(
            planning_normalize_request_change_value("fechaInicioPlanificada", None).unwrap(),
            ""
        );
        assert!(planning_normalize_request_change_value(
            "fechaFinPlanificada",
            Some(&json!("nope"))
        )
        .is_err());
    }

    #[test]
    fn planning_validate_month_year_and_percent_match_nest_bounds() {
        assert!(planning_validate_month_year(3, 2026).is_ok());
        assert!(planning_validate_month_year(0, 2026).is_err());
        assert!(planning_validate_month_year(3, 1999).is_err());
        assert!(planning_validate_percent(0.0).is_ok());
        assert!(planning_validate_percent(100.0).is_ok());
        assert!(planning_validate_percent(-1.0).is_err());
        assert!(planning_validate_percent(120.0).is_err());
    }

    #[test]
    fn planning_task_avance_request_accepts_legacy_and_frontend_aliases() {
        let frontend: PlanningTaskAvanceMensualRequest = serde_json::from_value(json!({
            "anio": 2026,
            "mes": 3,
            "porcentajeMes": 12.5,
            "comentario": "ok"
        }))
        .expect("frontend payload should deserialize");
        assert_eq!(frontend.year, 2026);
        assert_eq!(frontend.month, 3);
        assert_eq!(frontend.progress, 12.5);

        let legacy: PlanningTaskAvanceMensualRequest = serde_json::from_value(json!({
            "year": 2026,
            "month": 4,
            "progress": 22
        }))
        .expect("legacy payload should deserialize");
        assert_eq!(legacy.year, 2026);
        assert_eq!(legacy.month, 4);
        assert_eq!(legacy.progress, 22.0);
    }

    #[test]
    fn planning_normalize_agenda_rows_aligns_date_only_with_nest_iso_shape() {
        let normalized = planning_normalize_agenda_rows(vec![
            json!({ "idTarea": 1, "fecha": "2026-03-24", "usuarioCarnet": "772" }),
            json!({ "idTarea": 2, "fecha": "2026-03-24T00:00:00.000Z", "usuarioCarnet": "500708" }),
            json!({ "idTarea": 3, "usuarioCarnet": "500709" }),
        ]);

        assert_eq!(
            normalized[0].get("fecha").and_then(|value| value.as_str()),
            Some("2026-03-24T00:00:00.000Z")
        );
        assert_eq!(
            normalized[1].get("fecha").and_then(|value| value.as_str()),
            Some("2026-03-24T00:00:00.000Z")
        );
        assert!(normalized[2].get("fecha").is_none());
    }

    #[test]
    fn planning_parse_query_date_accepts_frontend_formats() {
        assert_eq!(
            planning_parse_query_date("2026-03-24")
                .map(|value| value.format("%Y-%m-%d").to_string()),
            Some("2026-03-24".to_string())
        );
        assert_eq!(
            planning_parse_query_date("2026-03-24T23:59:59.000Z")
                .map(|value| value.format("%Y-%m-%d").to_string()),
            Some("2026-03-24".to_string())
        );
        assert_eq!(
            planning_parse_query_date("2026-03-24 18:30:00")
                .map(|value| value.format("%Y-%m-%d").to_string()),
            Some("2026-03-24".to_string())
        );
        assert!(planning_parse_query_date("").is_none());
        assert!(planning_parse_query_date("nope").is_none());
    }

    #[test]
    fn planning_prepare_mi_dia_tasks_matches_nest_backlog_rules() {
        let rows = vec![
            json!({
                "idTarea": 10,
                "titulo": "Sin fecha",
                "estado": "Pendiente",
                "fechaObjetivo": null,
                "fechaCreacion": "2026-03-01T00:00:00.000Z",
                "proyectoNombre": "General"
            }),
            json!({
                "idTarea": 11,
                "titulo": "Atrasada",
                "estado": "Pendiente",
                "fechaObjetivo": "2026-03-20T00:00:00.000Z",
                "proyectoNombre": "General"
            }),
            json!({
                "idTarea": 12,
                "titulo": "Bloqueada",
                "estado": "Bloqueada",
                "fechaObjetivo": "2026-03-28T00:00:00.000Z",
                "proyectoNombre": "General"
            }),
        ];

        let (bloqueos, backlog, sugeridas) =
            planning_prepare_mi_dia_tasks(rows, "500708", "2026-03-27");

        assert_eq!(bloqueos.len(), 1);
        assert_eq!(backlog.len(), 1);
        assert_eq!(
            backlog[0].get("idTarea").and_then(|value| value.as_i64()),
            Some(11)
        );
        assert_eq!(sugeridas.len(), 1);
        assert_eq!(
            sugeridas[0].get("idTarea").and_then(|value| value.as_i64()),
            Some(10)
        );
    }

    #[test]
    fn planning_prepare_mi_dia_tasks_appends_assignee_context_like_nest() {
        let rows = vec![json!({
            "idTarea": 22,
            "titulo": "Compartida",
            "estado": "Pendiente",
            "fechaObjetivo": "2026-03-28T00:00:00.000Z",
            "responsableCarnet": "999999",
            "responsableNombre": "Jane Doe Smith"
        })];

        let (_, _, sugeridas) = planning_prepare_mi_dia_tasks(rows, "500708", "2026-03-27");
        assert_eq!(
            sugeridas[0].get("titulo").and_then(|value| value.as_str()),
            Some("Compartida (Asig: Jane Doe)")
        );
    }

    #[test]
    fn planning_order_tasks_like_nest_groups_assigned_projects_first() {
        let rows = vec![
            json!({ "idTarea": 1, "idProyecto": 99 }),
            json!({ "idTarea": 2, "idProyecto": 5 }),
            json!({ "idTarea": 3, "idProyecto": 7 }),
            json!({ "idTarea": 4, "idProyecto": 5 }),
            json!({ "idTarea": 5 }),
        ];
        let proyectos = vec![json!({ "idProyecto": 5 }), json!({ "idProyecto": 7 })];

        let ordered = planning_order_tasks_like_nest(rows, &proyectos);
        let ids: Vec<i64> = ordered
            .iter()
            .filter_map(|item| item.get("idTarea").and_then(|value| value.as_i64()))
            .collect();

        assert_eq!(ids, vec![2, 4, 3, 1, 5]);
    }
}
