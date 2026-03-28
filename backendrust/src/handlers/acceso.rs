#![allow(dead_code)]
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use std::collections::HashMap;

use crate::handlers::equipo::exec_sp_to_json;
use crate::state::ApiState;

fn acceso_value_to_string(value: &serde_json::Value) -> Option<String> {
    match value {
        serde_json::Value::Null => None,
        serde_json::Value::String(raw) => {
            let trimmed = raw.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        }
        serde_json::Value::Number(number) => Some(number.to_string()),
        serde_json::Value::Bool(boolean) => Some(boolean.to_string()),
        other => Some(other.to_string()),
    }
}

fn acceso_value_to_i64(value: &serde_json::Value) -> Option<i64> {
    value
        .as_i64()
        .or_else(|| value.as_u64().and_then(|raw| i64::try_from(raw).ok()))
        .or_else(|| value.as_str().and_then(|raw| raw.trim().parse::<i64>().ok()))
}

fn acceso_build_org_tree(
    nodos: Vec<serde_json::Value>,
    conteos: Vec<serde_json::Value>,
) -> Vec<serde_json::Value> {
    let mut count_map = HashMap::new();
    for row in conteos {
        let Some(id_org) = row
            .get("idOrg")
            .or_else(|| row.get("idorg"))
            .and_then(acceso_value_to_string)
        else {
            continue;
        };
        let count = row
            .get("count")
            .or_else(|| row.get("total"))
            .and_then(acceso_value_to_i64)
            .unwrap_or(0);
        count_map.insert(id_org, count);
    }

    let mut templates: HashMap<String, serde_json::Map<String, serde_json::Value>> = HashMap::new();
    let mut children_by_parent: HashMap<String, Vec<String>> = HashMap::new();
    let mut roots = Vec::new();

    for row in nodos {
        let Some(id_org) = row
            .get("idorg")
            .or_else(|| row.get("idOrg"))
            .or_else(|| row.get("id"))
            .and_then(acceso_value_to_string)
        else {
            continue;
        };

        let descripcion = row
            .get("descripcion")
            .or_else(|| row.get("nombre"))
            .cloned()
            .unwrap_or_else(|| serde_json::json!("Sin nombre"));
        let tipo = row.get("tipo").cloned().unwrap_or(serde_json::Value::Null);
        let padre = row
            .get("padre")
            .or_else(|| row.get("idPadre"))
            .and_then(acceso_value_to_string);
        let nivel = row.get("nivel").cloned().unwrap_or(serde_json::Value::Null);
        let empleados_directos = count_map.get(&id_org).copied().unwrap_or(0);

        let mut node = serde_json::Map::new();
        node.insert("idOrg".to_string(), serde_json::json!(id_org.clone()));
        node.insert("descripcion".to_string(), descripcion);
        node.insert("tipo".to_string(), tipo);
        node.insert(
            "padre".to_string(),
            padre
                .clone()
                .map(serde_json::Value::String)
                .unwrap_or(serde_json::Value::Null),
        );
        node.insert("nivel".to_string(), nivel);
        node.insert(
            "empleadosDirectos".to_string(),
            serde_json::json!(empleados_directos),
        );
        node.insert("empleadosTotal".to_string(), serde_json::json!(0));
        node.insert("hijos".to_string(), serde_json::json!([]));

        templates.insert(id_org.clone(), node);

        if let Some(parent_id) = padre {
            children_by_parent.entry(parent_id).or_default().push(id_org);
        } else {
            roots.push(id_org);
        }
    }

    fn build_node(
        id_org: &str,
        templates: &HashMap<String, serde_json::Map<String, serde_json::Value>>,
        children_by_parent: &HashMap<String, Vec<String>>,
    ) -> serde_json::Value {
        let Some(template) = templates.get(id_org) else {
            return serde_json::Value::Null;
        };

        let mut node = template.clone();
        let mut hijos = Vec::new();
        let mut total = node
            .get("empleadosDirectos")
            .and_then(acceso_value_to_i64)
            .unwrap_or(0);

        if let Some(children) = children_by_parent.get(id_org) {
            for child_id in children {
                let child = build_node(child_id, templates, children_by_parent);
                if let Some(child_total) = child
                    .get("empleadosTotal")
                    .and_then(acceso_value_to_i64)
                {
                    total += child_total;
                }
                hijos.push(child);
            }
        }

        node.insert("empleadosTotal".to_string(), serde_json::json!(total));
        node.insert("hijos".to_string(), serde_json::Value::Array(hijos));
        serde_json::Value::Object(node)
    }

    roots
        .into_iter()
        .map(|id_org| build_node(&id_org, &templates, &children_by_parent))
        .collect()
}

pub async fn acceso_empleado_get(
    State(state): State<ApiState>,
    Path(carnet): Path<String>,
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

    // sp_Usuarios_BuscarPorCarnet @P1
    let __ret = match client
        .query("EXEC sp_Usuarios_BuscarPorCarnet_rust @P1", &[&carnet])
        .await
    {
        Ok(stream) => match stream.into_first_result().await {
            Ok(rows) => {
                if let Some(r) = rows.into_iter().next() {
                    (
                        StatusCode::OK,
                        Json(crate::models::ApiResponse::success(serde_json::json!({
                            "empleado": {
                                "carnet": r.get::<&str, _>("carnet"),
                                "nombre": r.get::<&str, _>("nombre"),
                                "correo": r.get::<&str, _>("correo"),
                                "cargo": r.get::<&str, _>("cargo")
                            }
                        }))),
                    )
                        .into_response()
                } else {
                    (
                        StatusCode::NOT_FOUND,
                        Json(crate::models::ApiResponse::error(
                            "Empleado no encontrado".to_string(),
                            404,
                        )),
                    )
                        .into_response()
                }
            }
            Err(e) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response(),
        },
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(crate::models::ApiResponse::error(e.to_string(), 500)),
        )
            .into_response(),
    };
    __ret
}

pub async fn acceso_organizacion_tree(State(state): State<ApiState>) -> impl IntoResponse {
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

    let nodos = exec_sp_to_json(&mut client, "EXEC sp_Organizacion_ObtenerArbol", &[]).await;
    let conteos = exec_sp_to_json(
        &mut client,
        "EXEC sp_Organizacion_ContarEmpleadosPorNodo",
        &[],
    )
    .await;
    let tree = acceso_build_org_tree(nodos, conteos);

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(tree)),
    )
        .into_response()
}

pub async fn acceso_debug_raw_data() -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "message": "Migrado a Rust directo (sin debug raw)"
        }))),
    )
        .into_response()
}
