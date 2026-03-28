#![allow(dead_code)]
use axum::{
    extract::{OriginalUri, Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;

use crate::auth::AuthUser;
use crate::state::ApiState;

type SqlConnection<'a> = bb8::PooledConnection<'a, bb8_tiberius::ConnectionManager>;

fn proyectos_is_admin_role_name(role: &str) -> bool {
    matches!(role.trim(), "Admin" | "Administrador" | "SuperAdmin")
}

fn proyectos_role_level(role: &str) -> u8 {
    match role.trim() {
        "Observador" => 1,
        "Revisor" => 2,
        "Editor" => 3,
        "Colaborador" => 4,
        "Administrador" => 5,
        "Dueño" => 6,
        _ => 0,
    }
}

fn proyectos_is_valid_custom_permission(permission: &str) -> bool {
    matches!(
        permission.trim(),
        "*" | "VIEW_PROJECT"
            | "VIEW_TASKS"
            | "CREATE_TASK"
            | "EDIT_OWN_TASK"
            | "EDIT_ANY_TASK"
            | "DELETE_OWN_TASK"
            | "DELETE_ANY_TASK"
            | "ASSIGN_SELF"
            | "ASSIGN_OTHERS"
            | "REASSIGN"
            | "INVITE"
            | "MANAGE_COLLABORATORS"
            | "EDIT_PROJECT"
            | "DELETE_PROJECT"
            | "EXPORT"
            | "VIEW_HISTORY"
    )
}

fn proyectos_json_i32(value: &serde_json::Value, key: &str) -> Option<i32> {
    value.get(key).and_then(|raw| match raw {
        serde_json::Value::Number(number) => number.as_i64().and_then(|n| i32::try_from(n).ok()),
        serde_json::Value::String(text) => text.trim().parse::<i32>().ok(),
        _ => None,
    })
}

fn proyectos_json_bool(value: &serde_json::Value, key: &str) -> bool {
    value
        .get(key)
        .and_then(|raw| match raw {
            serde_json::Value::Bool(flag) => Some(*flag),
            serde_json::Value::Number(number) => number.as_i64().map(|n| n != 0),
            serde_json::Value::String(text) => match text.trim() {
                "1" | "true" | "TRUE" | "True" => Some(true),
                "0" | "false" | "FALSE" | "False" => Some(false),
                _ => None,
            },
            _ => None,
        })
        .unwrap_or(false)
}

fn proyectos_json_string(value: &serde_json::Value, key: &str) -> Option<String> {
    value.get(key).and_then(|raw| match raw {
        serde_json::Value::Null => None,
        serde_json::Value::String(text) => {
            let trimmed = text.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        }
        other => Some(other.to_string()),
    })
}

async fn proyectos_is_admin_user(client: &mut SqlConnection<'_>, user: &AuthUser) -> bool {
    if proyectos_is_admin_role_name(user.rol()) || user.is_admin() {
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
        .map(proyectos_is_admin_role_name)
        .unwrap_or(false)
}

async fn proyectos_effective_user_carnet(
    client: &mut SqlConnection<'_>,
    user: &AuthUser,
) -> String {
    let carnet = user.carnet().trim();
    if !carnet.is_empty() {
        return carnet.to_string();
    }

    crate::handlers::equipo::exec_query_to_json(
        client,
        "SELECT carnet FROM p_Usuarios WHERE idUsuario = @P1",
        &[&user.user_id_i32()],
    )
    .await
    .into_iter()
    .next()
    .and_then(|row| proyectos_json_string(&row, "carnet"))
    .unwrap_or_default()
}

async fn proyectos_obtener_detalle(
    client: &mut SqlConnection<'_>,
    id_proyecto: i32,
) -> Option<serde_json::Value> {
    crate::handlers::equipo::exec_sp_to_json(
        client,
        "EXEC sp_Proyecto_ObtenerDetalle_rust @P1",
        &[&id_proyecto],
    )
    .await
    .into_iter()
    .next()
    .map(proyectos_normalize_detalle)
}

fn proyectos_normalize_detalle(mut proyecto: serde_json::Value) -> serde_json::Value {
    if let Some(porcentaje) = proyecto.get("porcentaje").cloned() {
        proyecto
            .as_object_mut()
            .map(|value| value.insert("progreso".to_string(), porcentaje));
        proyecto
            .as_object_mut()
            .map(|value| value.remove("porcentaje"));
    }
    proyecto
        .as_object_mut()
        .map(|value| value.remove("totalTareas"));
    proyecto
        .as_object_mut()
        .map(|value| value.remove("tareasCompletadas"));
    proyecto
}

async fn proyectos_user_is_owner(
    client: &mut SqlConnection<'_>,
    proyecto: &serde_json::Value,
    user: &AuthUser,
) -> bool {
    if proyectos_json_i32(proyecto, "idCreador") == Some(user.user_id_i32()) {
        return true;
    }

    let responsable = proyecto
        .get("responsableCarnet")
        .and_then(|value| value.as_str())
        .unwrap_or("")
        .trim();
    if responsable.is_empty() {
        return false;
    }

    let carnet = proyectos_effective_user_carnet(client, user).await;
    !carnet.trim().is_empty() && carnet.trim() == responsable
}

async fn proyectos_verificar_permiso(
    client: &mut SqlConnection<'_>,
    id_proyecto: i32,
    id_usuario: i32,
    permiso_requerido: &str,
) -> Option<(bool, Option<String>)> {
    let permiso_requerido = permiso_requerido.to_string();
    let rows = crate::handlers::equipo::exec_sp_to_json(
        client,
        "EXEC sp_ProyectoColaboradores_VerificarPermiso @idProyecto=@P1, @idUsuario=@P2, @permisoRequerido=@P3",
        &[&id_proyecto, &id_usuario, &permiso_requerido],
    )
    .await;

    rows.first().map(|row| {
        let rol = proyectos_json_string(row, "rolColaboracion");
        (proyectos_json_bool(row, "tienePermiso"), rol)
    })
}

async fn proyectos_tiene_permiso(
    client: &mut SqlConnection<'_>,
    id_proyecto: i32,
    proyecto: &serde_json::Value,
    user: &AuthUser,
    permiso_requerido: &str,
) -> bool {
    if proyectos_is_admin_user(client, user).await {
        return true;
    }

    if proyectos_user_is_owner(client, proyecto, user).await {
        return true;
    }

    proyectos_verificar_permiso(client, id_proyecto, user.user_id_i32(), permiso_requerido)
        .await
        .map(|(tiene_permiso, _)| tiene_permiso)
        .unwrap_or(false)
}

async fn proyectos_obtener_mi_rol(
    client: &mut SqlConnection<'_>,
    id_proyecto: i32,
    proyecto: &serde_json::Value,
    user: &AuthUser,
) -> Option<String> {
    if proyectos_user_is_owner(client, proyecto, user).await {
        return Some("Dueño".to_string());
    }

    proyectos_verificar_permiso(client, id_proyecto, user.user_id_i32(), "VIEW_PROJECT")
        .await
        .and_then(|(_, rol)| rol)
}

pub async fn proyectos_roles_colaboracion(
    _user: AuthUser,
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

    let roles = match client
        .query(
            "SELECT id, nombre, permisos, esSistema, orden FROM p_RolesColaboracion ORDER BY orden ASC",
            &[],
        )
        .await
    {
        Ok(stream) => match stream.into_first_result().await {
            Ok(rows) => rows
                .into_iter()
                .map(|row| crate::handlers::equipo::row_to_json(&row))
                .collect::<Vec<_>>(),
            Err(_) => Vec::new(),
        },
        Err(_) => Vec::new(),
    };

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(roles)),
    )
        .into_response()
}

pub async fn proyectos_list(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    query: axum::extract::Query<ProyectosQuery>,
) -> impl IntoResponse {
    let carnet = query
        .carnet
        .clone()
        .unwrap_or_else(|| user.carnet().to_string());
    tracing::info!(
        "[API] GET /proyectos - User: {} - Query: {:?}",
        carnet,
        *query
    );

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": format!("Error de conexiÃ³n: {}", e)})),
            )
                .into_response()
        }
    };

    // Carnet from JWT, with query param override for admin use
    let carnet = query
        .carnet
        .clone()
        .unwrap_or_else(|| user.carnet().to_string());

    // Zero Inline SQL: Usar sp_Proyecto_Listar (Admin y Filtros Org)
    let items = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Proyecto_Listar_rust @carnet=@P1, @nombre=@P2, @estado=@P3, @gerencia=@P4, @subgerencia=@P5, @area=@P6, @tipo=@P7, @pageNumber=@P8, @pageSize=@P9",
        &[
            &carnet,
            &query.nombre,
            &query.estado,
            &query.gerencia,
            &query.subgerencia,
            &query.area,
            &query.tipo,
            &query.page.unwrap_or(1),
            &query.limit.unwrap_or(2000)
        ]
    ).await;

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "items": items,
            "total": items.len(),
            "page": 1,
            "lastPage": 1
        }))),
    )
        .into_response()
}

pub async fn proyectos_get(
    user: AuthUser,
    State(state): State<ApiState>,
    OriginalUri(original_uri): OriginalUri,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    tracing::info!("[API] GET /proyectos/{}", id);
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": format!("Error de conexiÃ³n: {}", e)})),
            )
                .into_response()
        }
    };

    let proyecto = match proyectos_obtener_detalle(&mut client, id).await {
        Some(value) => value,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(crate::models::ApiResponse::error(
                    "Proyecto no encontrado".to_string(),
                    404,
                )),
            )
                .into_response();
        }
    };

    if !user.is_admin() {
        let carnet = user.carnet().to_string();
        let none_str: Option<String> = None;
        let page = 1;
        let limit = 2000;
        let visibles = crate::handlers::equipo::exec_sp_to_json(
            &mut client,
            "EXEC sp_Proyecto_Listar_rust @carnet=@P1, @nombre=@P2, @estado=@P3, @gerencia=@P4, @subgerencia=@P5, @area=@P6, @tipo=@P7, @pageNumber=@P8, @pageSize=@P9",
            &[&carnet, &none_str, &none_str, &none_str, &none_str, &none_str, &none_str, &page, &limit],
        ).await;
        let tiene_acceso = visibles
            .iter()
            .any(|p| p.get("idProyecto").and_then(|v| v.as_i64()) == Some(id as i64));
        if !tiene_acceso {
            return (
                StatusCode::FORBIDDEN,
                Json(crate::models::ApiResponse::error(
                    "No tienes acceso a este proyecto.".to_string(),
                    403,
                )),
            )
                .into_response();
        }
    }

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success_with_status(
            proyecto,
            200,
            original_uri.path(),
        )),
    )
        .into_response()
}

pub async fn proyectos_create(
    State(state): State<ApiState>,
    user: AuthUser,
    OriginalUri(original_uri): OriginalUri,
    Json(body): Json<ProyectoCreateRequest>,
) -> impl IntoResponse {
    let carnet_creador = user.carnet().to_string();
    tracing::info!(
        "[API] POST /proyectos - User: {} - Payload: {:?}",
        carnet_creador,
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

    let id_creador = user.user_id_i32();
    let carnet_creador = user.carnet().to_string();

    // Usamos sp_Proyectos_Gestion con Acción 'CREAR'
    // Pasamos todos los campos que el frontend envía
    let res = match client
        .query(
            "EXEC sp_Proyectos_Gestion_rust
            @Accion='CREAR',
            @nombre=@P1,
            @descripcion=@P2,
            @idCreador=@P3,
            @idNodoDuenio=@P4,
            @area=@P5,
            @subgerencia=@P6,
            @gerencia=@P7,
            @fechaInicio=@P8,
            @fechaFin=@P9,
            @creadorCarnet=@P10,
            @responsableCarnet=@P11,
            @tipo=@P12,
            @estado=@P13",
            &[
                &body.nombre,
                &body.descripcion,
                &id_creador,
                &body.id_nodo_duenio,
                &body.area,
                &body.subgerencia,
                &body.gerencia,
                &body.fecha_inicio,
                &body.fecha_fin,
                &carnet_creador,
                &body.responsable_carnet,
                &body
                    .tipo
                    .clone()
                    .unwrap_or_else(|| "administrativo".to_string()),
                &"Activo",
            ],
        )
        .await
    {
        Ok(s) => match s.into_first_result().await {
            Ok(rows) => rows.into_iter().next(),
            Err(_) => None,
        },
        Err(e) => {
            tracing::error!("Error creando proyecto: {:?}", e);
            None
        }
    };

    match res {
        Some(r) => {
            let id_nuevo = r
                .try_get::<i32, _>("idProyecto")
                .ok()
                .flatten()
                .unwrap_or(0);

            // Obtenemos el detalle completo para devolverlo al frontend (incluyendo responsableNombre, etc)
            if let Some(proyecto) = proyectos_obtener_detalle(&mut client, id_nuevo).await {
                (
                    StatusCode::CREATED,
                    Json(crate::models::ApiResponse::success_with_status(
                        proyecto,
                        201,
                        original_uri.path(),
                    )),
                )
                    .into_response()
            } else {
                // Fallback si no lo encuentra por alguna razón
                (
                    StatusCode::CREATED,
                    Json(crate::models::ApiResponse::success_with_status(
                        serde_json::json!({
                            "idProyecto": id_nuevo,
                            "nombre": body.nombre,
                            "estado": "Activo"
                        }),
                        201,
                        original_uri.path(),
                    )),
                )
                    .into_response()
            }
        }
        None => (
            StatusCode::BAD_REQUEST,
            Json(crate::models::ApiResponse::error(
                "No se pudo crear el proyecto".to_string(),
                400,
            )),
        )
            .into_response(),
    }
}

pub async fn proyectos_clone(
    State(state): State<ApiState>,
    user: crate::auth::AuthUser,
    Path(id): Path<i32>,
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

    let nuevo_nombre = body
        .get("nombre")
        .and_then(|v| v.as_str())
        .unwrap_or("Clon Proyecto");

    let res = match client.query(
        "EXEC sp_Proyectos_Gestion_rust @Accion='CLONAR', @idProyecto=@P1, @nombre=@P2, @idCreador=@P3",
        &[&id, &nuevo_nombre, &user.user_id_i32()],
    ).await {
        Ok(s) => match s.into_first_result().await {
            Ok(rows) => rows.into_iter().next(),
            Err(_) => None,
        },
        Err(_) => None,
    };

    match res {
        Some(r) => {
            let id_nuevo = r
                .try_get::<i32, _>("idProyecto")
                .ok()
                .flatten()
                .unwrap_or(0);
            if let Some(proyecto) = proyectos_obtener_detalle(&mut client, id_nuevo).await {
                (
                    StatusCode::OK,
                    Json(crate::models::ApiResponse::success(proyecto)),
                )
                    .into_response()
            } else {
                (
                    StatusCode::OK,
                    Json(crate::models::ApiResponse::success(serde_json::json!({
                        "idProyecto": id_nuevo
                    }))),
                )
                    .into_response()
            }
        }
        None => (
            StatusCode::BAD_REQUEST,
            Json(crate::models::ApiResponse::error(
                "Error al clonar".to_string(),
                400,
            )),
        )
            .into_response(),
    }
}

pub async fn proyectos_tareas(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    // Use the same SP logic as NestJS
    let __ret = match client
        .query("EXEC sp_Tareas_ObtenerPorProyecto_rust @P1", &[&id])
        .await
    {
        Ok(s) => match s.into_first_result().await {
            Ok(rows) => {
                let tasks: Vec<serde_json::Value> = rows
                    .into_iter()
                    .map(|r| crate::handlers::equipo::row_to_json(&r))
                    .collect();
                (
                    StatusCode::OK,
                    Json(crate::models::ApiResponse::success(tasks)),
                )
                    .into_response()
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

pub async fn proyectos_historial(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let sql = "
        SELECT a.*, u.nombre as nombreUsuario
        FROM p_Auditoria a
        LEFT JOIN p_Usuarios u ON a.idUsuario = u.idUsuario
        WHERE (a.entidad = 'Proyecto' AND a.entidadId = @P1)
           OR (a.entidad = 'Tarea' AND a.entidadId IN (SELECT CAST(idTarea AS NVARCHAR(50)) FROM p_Tareas WHERE idProyecto = TRY_CAST(@P1 AS INT)))
        ORDER BY a.fecha DESC
    ";

    let __ret = match client.query(sql, &[&id.to_string()]).await {
        Ok(s) => match s.into_first_result().await {
            Ok(rows) => {
                let list: Vec<serde_json::Value> = rows.into_iter().map(|r| {
                    serde_json::json!({
                        "id": r.try_get::<i32, _>("idLog").ok().flatten().unwrap_or(0),
                        "accion": r.try_get::<&str, _>("accion").ok().flatten().unwrap_or(""),
                        "entidad": r.try_get::<&str, _>("entidad").ok().flatten().unwrap_or(""),
                        "fecha": r.try_get::<chrono::DateTime<chrono::Utc>, _>("fecha").ok().flatten(),
                        "usuario": r.try_get::<&str, _>("nombreUsuario").ok().flatten().unwrap_or("Sistema"),
                    })
                }).collect();
                (
                    StatusCode::OK,
                    Json(crate::models::ApiResponse::success(
                        serde_json::json!({ "timeline": list }),
                    )),
                )
                    .into_response()
            }
            Err(_) => (
                StatusCode::OK,
                Json(crate::models::ApiResponse::success(
                    serde_json::json!({ "timeline": [] }),
                )),
            )
                .into_response(),
        },
        Err(_) => (
            StatusCode::OK,
            Json(crate::models::ApiResponse::success(
                serde_json::json!({ "timeline": [] }),
            )),
        )
            .into_response(),
    };
    __ret
}

pub async fn proyectos_colaboradores(
    user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let proyecto = match proyectos_obtener_detalle(&mut client, id).await {
        Some(value) => value,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(crate::models::ApiResponse::error(
                    "Proyecto no encontrado".to_string(),
                    404,
                )),
            )
                .into_response()
        }
    };

    if !proyectos_tiene_permiso(&mut client, id, &proyecto, &user, "VIEW_PROJECT").await {
        return (
            StatusCode::FORBIDDEN,
            Json(crate::models::ApiResponse::error(
                "No tienes permiso 'VIEW_PROJECT' en este proyecto".to_string(),
                403,
            )),
        )
            .into_response();
    }

    let data = match client
        .query("EXEC sp_ProyectoColaboradores_Listar_rust @P1", &[&id])
        .await
    {
        Ok(s) => match s.into_first_result().await {
            Ok(rows) => rows
                .into_iter()
                .map(|r| crate::handlers::equipo::row_to_json(&r))
                .collect::<Vec<_>>(),
            Err(_) => Vec::new(),
        },
        Err(_) => Vec::new(),
    };

    let roles_disponibles = match client
        .query(
            "SELECT id, nombre, permisos, esSistema, orden FROM p_RolesColaboracion ORDER BY orden ASC",
            &[],
        )
        .await
    {
        Ok(s) => match s.into_first_result().await {
            Ok(rows) => rows
                .into_iter()
                .map(|r| crate::handlers::equipo::row_to_json(&r))
                .collect::<Vec<_>>(),
            Err(_) => Vec::new(),
        },
        Err(_) => Vec::new(),
    };

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "data": data,
            "rolesDisponibles": roles_disponibles,
            "proyecto": {
                "idProyecto": proyecto.get("idProyecto").cloned().unwrap_or_else(|| serde_json::json!(id)),
                "nombre": proyecto.get("nombre").cloned().unwrap_or_else(|| serde_json::json!(""))
            }
        }))),
    )
        .into_response()
}

pub async fn proyectos_add_colaborador(
    State(state): State<ApiState>,
    user: crate::auth::AuthUser,
    Path(id): Path<i32>,
    Json(body): Json<ProyectoAddColaboradorRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };
    let fecha_expiracion = parse_optional_datetime(body.fecha_expiracion.as_deref());

    let rol = body
        .rol_colaboracion
        .clone()
        .or_else(|| body.rol.clone())
        .unwrap_or_else(|| "Colaborador".to_string());

    if proyectos_role_level(&rol) == 0 {
        return (
            StatusCode::BAD_REQUEST,
            Json(crate::models::ApiResponse::error(
                format!(
                    "Rol de colaboración inválido: {}. Roles válidos: Dueño, Administrador, Colaborador, Editor, Observador, Revisor",
                    rol
                ),
                400,
            )),
        )
            .into_response();
    }

    let proyecto = match proyectos_obtener_detalle(&mut client, id).await {
        Some(value) => value,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(crate::models::ApiResponse::error(
                    "Proyecto no encontrado".to_string(),
                    404,
                )),
            )
                .into_response()
        }
    };

    let es_admin = proyectos_is_admin_user(&mut client, &user).await;
    if !proyectos_tiene_permiso(&mut client, id, &proyecto, &user, "INVITE").await {
        return (
            StatusCode::FORBIDDEN,
            Json(crate::models::ApiResponse::error(
                "No tienes permiso 'INVITE' en este proyecto".to_string(),
                403,
            )),
        )
            .into_response();
    }

    if !es_admin {
        let mi_rol = proyectos_obtener_mi_rol(&mut client, id, &proyecto, &user)
            .await
            .unwrap_or_default();
        if proyectos_role_level(&rol) > proyectos_role_level(&mi_rol) {
            return (
                StatusCode::FORBIDDEN,
                Json(crate::models::ApiResponse::error(
                    format!(
                        "No puedes asignar el rol '{}' porque es superior a tu rol actual '{}'",
                        rol, mi_rol
                    ),
                    403,
                )),
            )
                .into_response();
        }

        if rol == "Dueño" && mi_rol != "Dueño" {
            return (
                StatusCode::FORBIDDEN,
                Json(crate::models::ApiResponse::error(
                    "Solo el Dueño del proyecto puede crear otros Dueños".to_string(),
                    403,
                )),
            )
                .into_response();
        }
    }

    let __ret = match client.query(
        "EXEC sp_ProyectoColaboradores_Invitar_rust @idProyecto=@P1, @idUsuario=@P2, @rolColaboracion=@P3, @invitadoPor=@P4, @fechaExpiracion=@P5, @notas=@P6",
        &[&id, &(body.id_usuario as i32), &rol, &user.user_id_i32(), &fecha_expiracion, &body.notas],
    ).await {
        Ok(s) => {
            let colaborador = match s.into_first_result().await {
                Ok(rows) => rows.into_iter().next().map(|r| crate::handlers::equipo::row_to_json(&r)),
                Err(_) => None,
            };
            (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
                "success": true,
                "message": "Colaborador invitado exitosamente",
                "colaborador": colaborador
            })))).into_response()
        }
        Err(e) => (StatusCode::BAD_REQUEST, Json(crate::models::ApiResponse::error(e.to_string(), 400))).into_response(),
    };
    __ret
}

pub async fn proyectos_update_colaborador(
    user: AuthUser,
    State(state): State<ApiState>,
    Path((id, user_id)): Path<(i32, i32)>,
    Json(body): Json<ProyectoUpdateColaboradorRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };
    let permisos_custom = body.permisos_custom_json();
    let fecha_expiracion = parse_optional_datetime(body.fecha_expiracion.as_deref());

    let proyecto = match proyectos_obtener_detalle(&mut client, id).await {
        Some(value) => value,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(crate::models::ApiResponse::error(
                    "Proyecto no encontrado".to_string(),
                    404,
                )),
            )
                .into_response()
        }
    };

    if !proyectos_tiene_permiso(&mut client, id, &proyecto, &user, "MANAGE_COLLABORATORS").await {
        return (
            StatusCode::FORBIDDEN,
            Json(crate::models::ApiResponse::error(
                "No tienes permiso 'MANAGE_COLLABORATORS' en este proyecto".to_string(),
                403,
            )),
        )
            .into_response();
    }

    if let Some(rol) = body.rol_colaboracion.as_deref() {
        if proyectos_role_level(rol) == 0 {
            return (
                StatusCode::BAD_REQUEST,
                Json(crate::models::ApiResponse::error(
                    format!("Rol inválido: {}", rol),
                    400,
                )),
            )
                .into_response();
        }

        if !proyectos_is_admin_user(&mut client, &user).await {
            let mi_rol = proyectos_obtener_mi_rol(&mut client, id, &proyecto, &user)
                .await
                .unwrap_or_default();
            if proyectos_role_level(rol) > proyectos_role_level(&mi_rol) {
                return (
                    StatusCode::FORBIDDEN,
                    Json(crate::models::ApiResponse::error(
                        format!(
                            "No puedes asignar el rol '{}' porque es superior a tu rol actual '{}'",
                            rol, mi_rol
                        ),
                        403,
                    )),
                )
                    .into_response();
            }
        }
    }

    if let Some(permisos_custom) = body.permisos_custom.as_ref() {
        let invalidos: Vec<String> = permisos_custom
            .iter()
            .filter(|permiso| !proyectos_is_valid_custom_permission(permiso))
            .cloned()
            .collect();
        if !invalidos.is_empty() {
            return (
                StatusCode::BAD_REQUEST,
                Json(crate::models::ApiResponse::error(
                    format!("Permisos inválidos: {}", invalidos.join(", ")),
                    400,
                )),
            )
                .into_response();
        }
    }

    let __ret = match client.query(
        "EXEC sp_ProyectoColaboradores_Actualizar_rust @idProyecto=@P1, @idUsuario=@P2, @rolColaboracion=@P3, @permisosCustom=@P4, @fechaExpiracion=@P5",
        &[&id, &user_id, &body.rol_colaboracion, &permisos_custom, &fecha_expiracion],
    ).await {
        Ok(_) => (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
            "success": true,
            "message": "Colaborador actualizado"
        })))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(crate::models::ApiResponse::error(e.to_string(), 400))).into_response(),
    };
    __ret
}

pub async fn proyectos_remove_colaborador(
    user: AuthUser,
    State(state): State<ApiState>,
    Path((id, user_id)): Path<(i32, i32)>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let proyecto = match proyectos_obtener_detalle(&mut client, id).await {
        Some(value) => value,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(crate::models::ApiResponse::error(
                    "Proyecto no encontrado".to_string(),
                    404,
                )),
            )
                .into_response()
        }
    };

    if !proyectos_tiene_permiso(&mut client, id, &proyecto, &user, "MANAGE_COLLABORATORS").await {
        return (
            StatusCode::FORBIDDEN,
            Json(crate::models::ApiResponse::error(
                "No tienes permiso 'MANAGE_COLLABORATORS' en este proyecto".to_string(),
                403,
            )),
        )
            .into_response();
    }

    if user_id == user.user_id_i32() {
        return (
            StatusCode::BAD_REQUEST,
            Json(crate::models::ApiResponse::error(
                "No puedes revocarte a ti mismo. Contacta al Dueño del proyecto.".to_string(),
                400,
            )),
        )
            .into_response();
    }

    let es_admin = proyectos_is_admin_user(&mut client, &user).await;
    if !es_admin {
        let mi_rol = proyectos_obtener_mi_rol(&mut client, id, &proyecto, &user)
            .await
            .unwrap_or_default();
        let rol_objetivo = proyectos_verificar_permiso(&mut client, id, user_id, "VIEW_PROJECT")
            .await
            .and_then(|(_, rol)| rol)
            .unwrap_or_default();
        if proyectos_role_level(&rol_objetivo) >= proyectos_role_level(&mi_rol) {
            return (
                StatusCode::FORBIDDEN,
                Json(crate::models::ApiResponse::error(
                    "No puedes revocar a alguien con un rol igual o superior al tuyo".to_string(),
                    403,
                )),
            )
                .into_response();
        }
    }

    let __ret = match client
        .query(
            "EXEC sp_ProyectoColaboradores_Revocar_rust @idProyecto=@P1, @idUsuario=@P2",
            &[&id, &user_id],
        )
        .await
    {
        Ok(_) => (
            StatusCode::OK,
            Json(crate::models::ApiResponse::success(serde_json::json!({
                "success": true,
                "message": "Acceso revocado"
            }))),
        )
            .into_response(),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(crate::models::ApiResponse::error(e.to_string(), 400)),
        )
            .into_response(),
    };
    __ret
}

pub async fn proyectos_mis_permisos(
    State(state): State<ApiState>,
    user: AuthUser,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let user_id = user.user_id_i32();
    let es_admin_global = proyectos_is_admin_user(&mut client, &user).await;

    if es_admin_global {
        return (
            StatusCode::OK,
            Json(crate::models::ApiResponse::success(serde_json::json!({
                "rolColaboracion": "Admin (Global)",
                "permisos": ["*"],
                "esDuenoProyecto": false,
                "esAdminGlobal": true
            }))),
        )
            .into_response();
    }

    let mut proyecto_id_creador = 0;
    let mut proyecto_responsable_carnet = String::new();
    let mut usuario_carnet = user.carnet().to_string();

    if let Ok(stream) = client
        .query(
            "SELECT p.idCreador, p.responsableCarnet, u.carnet AS usuarioCarnet
         FROM p_Proyectos p
         LEFT JOIN p_Usuarios u ON u.idUsuario = @P2
         WHERE p.idProyecto = @P1",
            &[&id, &user_id],
        )
        .await
    {
        if let Ok(rows) = stream.into_first_result().await {
            if let Some(row) = rows.into_iter().next() {
                proyecto_id_creador = row
                    .try_get::<i32, _>("idCreador")
                    .ok()
                    .flatten()
                    .unwrap_or(0);
                proyecto_responsable_carnet = row
                    .try_get::<&str, _>("responsableCarnet")
                    .ok()
                    .flatten()
                    .unwrap_or("")
                    .to_string();
                if usuario_carnet.trim().is_empty() {
                    usuario_carnet = row
                        .try_get::<&str, _>("usuarioCarnet")
                        .ok()
                        .flatten()
                        .unwrap_or("")
                        .to_string();
                }
            } else {
                return (
                    StatusCode::NOT_FOUND,
                    Json(crate::models::ApiResponse::error(
                        "Proyecto no encontrado".to_string(),
                        404,
                    )),
                )
                    .into_response();
            }
        }
    }

    if proyecto_id_creador == user_id
        || (!usuario_carnet.trim().is_empty() && proyecto_responsable_carnet == usuario_carnet)
    {
        return (
            StatusCode::OK,
            Json(crate::models::ApiResponse::success(serde_json::json!({
                "rolColaboracion": "Dueño",
                "permisos": ["*"],
                "esDuenoProyecto": true,
                "esAdminGlobal": false
            }))),
        )
            .into_response();
    }

    let mut rol_colaboracion = None;
    let mut permisos: Vec<String> = Vec::new();
    if let Ok(stream) = client
        .query(
            "SELECT TOP 1 rolColaboracion, permisosCustom
         FROM p_ProyectoColaboradores
         WHERE idProyecto = @P1 AND idUsuario = @P2 AND activo = 1
           AND (fechaExpiracion IS NULL OR fechaExpiracion > GETDATE())",
            &[&id, &user_id],
        )
        .await
    {
        if let Ok(rows) = stream.into_first_result().await {
            if let Some(row) = rows.into_iter().next() {
                rol_colaboracion = row
                    .try_get::<&str, _>("rolColaboracion")
                    .ok()
                    .flatten()
                    .map(|s| s.to_string());
                if let Some(permisos_custom) =
                    row.try_get::<&str, _>("permisosCustom").ok().flatten()
                {
                    if let Ok(parsed) = serde_json::from_str::<Vec<String>>(permisos_custom) {
                        permisos = parsed;
                    }
                }
            }
        }
    }

    if permisos.is_empty() {
        if let Some(rol) = rol_colaboracion.clone() {
            if let Ok(stream) = client
                .query(
                    "SELECT permisos FROM p_RolesColaboracion WHERE nombre = @P1",
                    &[&rol],
                )
                .await
            {
                if let Ok(rows) = stream.into_first_result().await {
                    if let Some(row) = rows.into_iter().next() {
                        if let Some(raw) = row.try_get::<&str, _>("permisos").ok().flatten() {
                            if let Ok(parsed) = serde_json::from_str::<Vec<String>>(raw) {
                                permisos = parsed;
                            }
                        }
                    }
                }
            }
        }
    }

    if let Some(rol) = rol_colaboracion {
        return (
            StatusCode::OK,
            Json(crate::models::ApiResponse::success(serde_json::json!({
                "rolColaboracion": rol,
                "permisos": permisos,
                "esDuenoProyecto": false,
                "esAdminGlobal": false
            }))),
        )
            .into_response();
    }

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "rolColaboracion": "Jerarquía",
            "permisos": ["VIEW_PROJECT", "VIEW_TASKS", "VIEW_HISTORY"],
            "esDuenoProyecto": false,
            "esAdminGlobal": false
        }))),
    )
        .into_response()
}

pub async fn proyectos_update(
    user: AuthUser,
    State(state): State<ApiState>,
    OriginalUri(original_uri): OriginalUri,
    Path(id): Path<i32>,
    Json(body): Json<ProyectoUpdateRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let proyecto = match proyectos_obtener_detalle(&mut client, id).await {
        Some(value) => value,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(crate::models::ApiResponse::error(
                    "Proyecto no encontrado".to_string(),
                    404,
                )),
            )
                .into_response()
        }
    };

    if !proyectos_tiene_permiso(&mut client, id, &proyecto, &user, "EDIT_PROJECT").await {
        return (
            StatusCode::FORBIDDEN,
            Json(crate::models::ApiResponse::error(
                "No tienes permiso para gestionar este proyecto.".to_string(),
                403,
            )),
        )
            .into_response();
    }

    let updates = serde_json::to_string(&body).unwrap_or_else(|_| "{}".to_string());

    let __ret = match client.execute(
        "EXEC sp_Proyectos_Gestion_rust @Accion='ACTUALIZAR', @idProyecto=@P1, @UpdatesJSON=@P2",
        &[&id, &updates],
    ).await {
        Ok(_) => {
            if let Some(proyecto) = proyectos_obtener_detalle(&mut client, id).await {
                (
                    StatusCode::OK,
                    Json(crate::models::ApiResponse::success_with_status(
                        proyecto,
                        200,
                        original_uri.path(),
                    )),
                )
                    .into_response()
            } else {
                (
                    StatusCode::OK,
                    Json(crate::models::ApiResponse::success_with_status(
                        serde_json::json!({ "idProyecto": id }),
                        200,
                        original_uri.path(),
                    )),
                )
                    .into_response()
            }
        }
        Err(e) => (StatusCode::BAD_REQUEST, Json(crate::models::ApiResponse::error(e.to_string(), 400))).into_response(),
    };
    __ret
}

pub async fn proyectos_delete(
    user: AuthUser,
    State(state): State<ApiState>,
    OriginalUri(original_uri): OriginalUri,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let proyecto = match proyectos_obtener_detalle(&mut client, id).await {
        Some(value) => value,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(crate::models::ApiResponse::error(
                    "Proyecto no encontrado".to_string(),
                    404,
                )),
            )
                .into_response()
        }
    };

    if !proyectos_tiene_permiso(&mut client, id, &proyecto, &user, "DELETE_PROJECT").await {
        return (
            StatusCode::FORBIDDEN,
            Json(crate::models::ApiResponse::error(
                "No tienes permiso para gestionar este proyecto.".to_string(),
                403,
            )),
        )
            .into_response();
    }

    let __ret = match client
        .query(
            "EXEC sp_Proyectos_Gestion_rust @Accion='ELIMINAR', @idProyecto=@P1",
            &[&id],
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
            StatusCode::BAD_REQUEST,
            Json(crate::models::ApiResponse::error(e.to_string(), 400)),
        )
            .into_response(),
    };
    __ret
}
#[derive(Deserialize, Debug)]
pub struct ProyectoCreateRequest {
    pub nombre: String,
    pub descripcion: Option<String>,
    #[serde(rename = "idNodoDuenio")]
    pub id_nodo_duenio: Option<i32>,
    pub area: Option<String>,
    pub subgerencia: Option<String>,
    pub gerencia: Option<String>,
    #[serde(rename = "fechaInicio")]
    pub fecha_inicio: Option<String>, // Usually sent as ISO date string
    #[serde(rename = "fechaFin")]
    pub fecha_fin: Option<String>,
    pub tipo: Option<String>,
    #[serde(rename = "responsableCarnet")]
    pub responsable_carnet: Option<String>,
}

#[derive(Deserialize, serde::Serialize, Debug)]
pub struct ProyectoUpdateRequest {
    pub nombre: Option<String>,
    pub descripcion: Option<String>,
    pub estado: Option<String>,
    #[serde(rename = "idNodoDuenio")]
    pub id_nodo_duenio: Option<i32>,
    pub area: Option<String>,
    pub subgerencia: Option<String>,
    pub gerencia: Option<String>,
    #[serde(rename = "fechaInicio")]
    pub fecha_inicio: Option<String>,
    #[serde(rename = "fechaFin")]
    pub fecha_fin: Option<String>,
    pub tipo: Option<String>,
    #[serde(rename = "responsableCarnet")]
    pub responsable_carnet: Option<String>,
    #[serde(rename = "modoVisibilidad")]
    pub modo_visibilidad: Option<String>,
}

#[derive(Deserialize)]
pub struct ProyectoAddColaboradorRequest {
    #[serde(rename = "idUsuario")]
    pub id_usuario: u64,
    #[serde(rename = "rolColaboracion")]
    pub rol_colaboracion: Option<String>,
    pub rol: Option<String>,
    #[serde(rename = "fechaExpiracion")]
    pub fecha_expiracion: Option<String>,
    pub notas: Option<String>,
}

#[derive(Deserialize)]
pub struct ProyectoUpdateColaboradorRequest {
    #[serde(rename = "rolColaboracion")]
    pub rol_colaboracion: Option<String>,
    #[serde(rename = "permisosCustom")]
    pub permisos_custom: Option<Vec<String>>,
    #[serde(rename = "fechaExpiracion")]
    pub fecha_expiracion: Option<String>,
}

impl ProyectoUpdateColaboradorRequest {
    fn permisos_custom_json(&self) -> Option<String> {
        self.permisos_custom
            .as_ref()
            .and_then(|items| serde_json::to_string(items).ok())
    }
}

fn parse_optional_datetime(value: Option<&str>) -> Option<chrono::NaiveDateTime> {
    value.and_then(|raw| {
        chrono::NaiveDateTime::parse_from_str(raw, "%Y-%m-%dT%H:%M:%S%.fZ")
            .ok()
            .or_else(|| {
                chrono::NaiveDate::parse_from_str(raw, "%Y-%m-%d")
                    .ok()
                    .and_then(|date| date.and_hms_opt(0, 0, 0))
            })
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn proyectos_role_level_matches_expected_hierarchy() {
        assert!(proyectos_role_level("Dueño") > proyectos_role_level("Administrador"));
        assert!(proyectos_role_level("Administrador") > proyectos_role_level("Colaborador"));
        assert_eq!(proyectos_role_level("Desconocido"), 0);
    }

    #[test]
    fn proyectos_validates_custom_permissions() {
        assert!(proyectos_is_valid_custom_permission("VIEW_PROJECT"));
        assert!(proyectos_is_valid_custom_permission("*"));
        assert!(!proyectos_is_valid_custom_permission("DROP_DATABASE"));
    }

    #[test]
    fn proyectos_update_colaborador_request_accepts_camel_case_permissions() {
        let body: ProyectoUpdateColaboradorRequest = serde_json::from_value(serde_json::json!({
            "rolColaboracion": "Editor",
            "permisosCustom": ["VIEW_PROJECT", "EDIT_ANY_TASK"],
            "fechaExpiracion": "2026-04-01"
        }))
        .expect("request should deserialize");

        assert_eq!(body.rol_colaboracion.as_deref(), Some("Editor"));
        assert_eq!(
            body.permisos_custom,
            Some(vec![
                "VIEW_PROJECT".to_string(),
                "EDIT_ANY_TASK".to_string()
            ])
        );
        assert_eq!(body.fecha_expiracion.as_deref(), Some("2026-04-01"));
    }

    #[test]
    fn proyectos_normalize_detalle_aligns_progress_shape_with_nest() {
        let proyecto = proyectos_normalize_detalle(serde_json::json!({
            "idProyecto": 205,
            "porcentaje": 42,
            "totalTareas": 3,
            "tareasCompletadas": 1
        }));

        assert_eq!(
            proyecto.get("progreso").and_then(|value| value.as_i64()),
            Some(42)
        );
        assert!(proyecto.get("porcentaje").is_none());
        assert!(proyecto.get("totalTareas").is_none());
        assert!(proyecto.get("tareasCompletadas").is_none());
    }
}

#[derive(Debug, serde::Deserialize)]
pub struct ProyectosQuery {
    pub nombre: Option<String>,
    pub estado: Option<String>,
    pub gerencia: Option<String>,
    pub subgerencia: Option<String>,
    pub area: Option<String>,
    pub carnet: Option<String>,
    pub tipo: Option<String>,
    pub page: Option<i32>,
    pub limit: Option<i32>,
}
