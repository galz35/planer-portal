#![allow(dead_code)]
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;

use crate::state::ApiState;
use crate::auth::AuthUser;

pub async fn proyectos_roles_colaboracion(
    _user: AuthUser,
) -> impl IntoResponse {
    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "roles": ["owner", "editor", "viewer"]
    })))).into_response()
}

pub async fn proyectos_list(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    query: axum::extract::Query<ProyectosQuery>,
) -> impl IntoResponse {
    let carnet = query.carnet.clone().unwrap_or_else(|| user.carnet().to_string());
    tracing::info!("[API] GET /proyectos - User: {} - Query: {:?}", carnet, *query);

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
    let carnet = query.carnet.clone().unwrap_or_else(|| user.carnet().to_string());

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

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "items": items,
        "total": items.len(),
        "page": 1,
        "lastPage": 1
    })))).into_response()
}

pub async fn proyectos_get(
    _user: AuthUser,
    State(state): State<ApiState>,
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

    // Zero Inline SQL: Usar sp_Proyecto_ObtenerDetalle
    let items = crate::handlers::equipo::exec_sp_to_json(&mut client, "EXEC sp_Proyecto_ObtenerDetalle_rust @P1", &[&id]).await;

    if let Some(proyecto) = items.first() {
        (StatusCode::OK, Json(crate::models::ApiResponse::success(proyecto.clone()))).into_response()
    } else {
        (StatusCode::NOT_FOUND, Json(crate::models::ApiResponse::error("Proyecto no encontrado".to_string(), 404))).into_response()
    }
}

pub async fn proyectos_create(
    State(state): State<ApiState>,
    user: AuthUser,
    Json(body): Json<ProyectoCreateRequest>,
) -> impl IntoResponse {
    let carnet_creador = user.carnet().to_string();
    tracing::info!("[API] POST /proyectos - User: {} - Payload: {:?}", carnet_creador, body);

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    let id_creador = user.user_id_i32();
    let carnet_creador = user.carnet().to_string();

    // Usamos sp_Proyectos_Gestion con Acción 'CREAR'
    // Pasamos todos los campos que el frontend envía
    let res = match client.query(
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
            &body.tipo.clone().unwrap_or_else(|| "administrativo".to_string()),
            &"Activo"
        ],
    ).await {
        Ok(s) => match s.into_first_result().await {
            Ok(rows) => rows.into_iter().next(),
            Err(_) => None,
        },
        Err(e) => {
            tracing::error!("Error creando proyecto: {:?}", e);
            None
        },
    };

    match res {
        Some(r) => {
            let id_nuevo = r.try_get::<i32, _>("idProyecto").ok().flatten().unwrap_or(0);
            
            // Obtenemos el detalle completo para devolverlo al frontend (incluyendo responsableNombre, etc)
            let detail = crate::handlers::equipo::exec_sp_to_json(
                &mut client, 
                "EXEC sp_Proyecto_ObtenerDetalle_rust @P1", 
                &[&id_nuevo]
            ).await;

            if let Some(proyecto) = detail.first() {
                (StatusCode::OK, Json(crate::models::ApiResponse::success(proyecto.clone()))).into_response()
            } else {
                // Fallback si no lo encuentra por alguna razón
                (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
                    "idProyecto": id_nuevo,
                    "nombre": body.nombre,
                    "estado": "Activo"
                })))).into_response()
            }
        },
        None => (StatusCode::BAD_REQUEST, Json(crate::models::ApiResponse::error("No se pudo crear el proyecto".to_string(), 400))).into_response(),
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
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };

    let nuevo_nombre = body.get("nombre").and_then(|v| v.as_str()).unwrap_or("Clon Proyecto");

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
        Some(r) => (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
            "idProyecto": r.try_get::<i32, _>("idProyecto").ok().flatten().unwrap_or(0),
            "message": "Proyecto clonado"
        })))).into_response(),
        None => (StatusCode::BAD_REQUEST, Json(crate::models::ApiResponse::error("Error al clonar".to_string(), 400))).into_response(),
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
    let __ret = match client.query("EXEC sp_Tareas_ObtenerPorProyecto_rust @P1", &[&id]).await {
        Ok(s) => match s.into_first_result().await {
            Ok(rows) => {
                let tasks: Vec<serde_json::Value> = rows.into_iter().map(|r| {
                    crate::handlers::equipo::row_to_json(&r)
                }).collect();
                (StatusCode::OK, Json(crate::models::ApiResponse::success(tasks))).into_response()
            }
            Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
        },
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
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
                (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({ "timeline": list })))).into_response()
            }
            Err(_) => (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({ "timeline": [] })))).into_response(),
        },
        Err(_) => (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({ "timeline": [] })))).into_response(),
    };
    __ret
}

pub async fn proyectos_colaboradores(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let __ret = match client.query("EXEC sp_ProyectoColaboradores_Listar_rust @P1", &[&id]).await {
        Ok(s) => match s.into_first_result().await {
            Ok(rows) => {
                let collabs: Vec<serde_json::Value> = rows.into_iter().map(|r| {
                    serde_json::json!({
                        "idUsuario": r.try_get::<i32, _>("idUsuario").ok().flatten().unwrap_or(0),
                        "nombre": r.try_get::<&str, _>("nombre").ok().flatten().unwrap_or(""),
                        "rol": r.try_get::<&str, _>("rolColaboracion").ok().flatten().unwrap_or(""),
                    })
                }).collect();
                (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({ "colaboradores": collabs })))).into_response()
            }
            Err(_) => (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({ "colaboradores": [] })))).into_response(),
        },
        Err(_) => (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({ "colaboradores": [] })))).into_response(),
    };
    __ret
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

    let rol = body.rol.clone().unwrap_or_else(|| "viewer".to_string());

    let __ret = match client.query(
        "EXEC sp_ProyectoColaboradores_Invitar_rust @idProyecto=@P1, @idUsuario=@P2, @rolColaboracion=@P3, @invitadoPor=@P4",
        &[&id, &(body.id_usuario as i32), &rol, &user.user_id_i32()],
    ).await {
        Ok(_) => (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({ "message": "Colaborador invitado" })))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(crate::models::ApiResponse::error(e.to_string(), 400))).into_response(),
    };
    __ret
}

pub async fn proyectos_update_colaborador(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path((id, user_id)): Path<(i32, i32)>,
    Json(body): Json<ProyectoUpdateColaboradorRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let __ret = match client.query(
        "EXEC sp_ProyectoColaboradores_Actualizar_rust @idProyecto=@P1, @idUsuario=@P2, @rolColaboracion=@P3",
        &[&id, &user_id, &body.rol],
    ).await {
        Ok(_) => (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({ "message": "Actualizado" })))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(crate::models::ApiResponse::error(e.to_string(), 400))).into_response(),
    };
    __ret
}

pub async fn proyectos_remove_colaborador(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path((id, user_id)): Path<(i32, i32)>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let __ret = match client.query(
        "EXEC sp_ProyectoColaboradores_Revocar_rust @idProyecto=@P1, @idUsuario=@P2",
        &[&id, &user_id],
    ).await {
        Ok(_) => (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({ "message": "Revocado" })))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(crate::models::ApiResponse::error(e.to_string(), 400))).into_response(),
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
    
    // Consultamos la pertenencia o creador
    let check_sql = "
        SELECT p.idCreador, 
               (SELECT COUNT(*) FROM p_ProyectoColaboradores c WHERE c.idProyecto = p.idProyecto AND c.idUsuario = @P2) as esColaborador
        FROM p_Proyectos p
        WHERE p.idProyecto = @P1
    ";

    let mut es_owner = false;
    let mut activo = false;
    
    if let Ok(stream) = client.query(check_sql, &[&id, &user_id]).await {
        if let Ok(rows) = stream.into_first_result().await {
            if let Some(r) = rows.into_iter().next() {
                activo = true;
                let id_creador = r.try_get::<i32, _>("idCreador").ok().flatten().unwrap_or(0);
                let es_colab = r.try_get::<i32, _>("esColaborador").ok().flatten().unwrap_or(0);
                if id_creador == user_id || es_colab > 0 {
                    if id_creador == user_id {
                        es_owner = true;
                    }
                }
            }
        }
    }

    if !activo {
         return (StatusCode::NOT_FOUND, Json(crate::models::ApiResponse::error("Not Found".to_string(), 404))).into_response()
    }

    let mut permisos = vec!["READ"];
    if es_owner {
        permisos.push("WRITE");
        permisos.push("DELETE");
    }

    (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
        "idProyecto": id,
        "esOwner": es_owner,
        "permisos": permisos
    })))).into_response()
}

pub async fn proyectos_update(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    Json(body): Json<ProyectoUpdateRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let updates = serde_json::to_string(&body).unwrap_or_else(|_| "{}".to_string());

    let __ret = match client.query(
        "EXEC sp_Proyectos_Gestion_rust @Accion='ACTUALIZAR', @idProyecto=@P1, @UpdatesJSON=@P2",
        &[&id, &updates],
    ).await {
        Ok(_) => (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({ "message": "Actualizado" })))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(crate::models::ApiResponse::error(e.to_string(), 400))).into_response(),
    };
    __ret
}

pub async fn proyectos_delete(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let __ret = match client.query("EXEC sp_Proyectos_Gestion_rust @Accion='ELIMINAR', @idProyecto=@P1", &[&id]).await {
        Ok(_) => (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({ "message": "Eliminado" })))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(crate::models::ApiResponse::error(e.to_string(), 400))).into_response(),
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
    pub rol: Option<String>,
}

#[derive(Deserialize)]
pub struct ProyectoUpdateColaboradorRequest {
    pub rol: String,
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

