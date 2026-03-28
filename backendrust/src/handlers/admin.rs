#![allow(dead_code)]
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;

use crate::state::ApiState;

pub async fn admin_security_users_access(State(state): State<ApiState>) -> impl IntoResponse {
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

    let items = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Admin_Security_UsersAccess_rust",
        &[],
    )
    .await;

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "items": items
        }))),
    )
        .into_response()
}

pub async fn admin_security_assign_menu(
    State(state): State<ApiState>,
    Json(body): Json<AdminAssignMenuRequest>,
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

    let menu_json = serde_json::to_string(&body.menu).unwrap_or_default();
    let id_usuario = body.id_usuario as i32;

    let check_sql = "SELECT idUsuario FROM p_UsuariosConfig WHERE idUsuario = @P1";
    let mut exists = false;
    if let Ok(stream) = client.query(check_sql, &[&id_usuario]).await {
        if let Ok(rows) = stream.into_first_result().await {
            exists = rows.len() > 0;
        }
    }

    let query = if exists {
        "UPDATE p_UsuariosConfig SET menuPersonalizado = @P1 WHERE idUsuario = @P2"
    } else {
        "INSERT INTO p_UsuariosConfig (menuPersonalizado, idUsuario) VALUES (@P1, @P2)"
    };

    if let Err(e) = client.execute(query, &[&menu_json, &id_usuario]).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(crate::models::ApiResponse::error(e.to_string(), 500)),
        )
            .into_response();
    }

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "idUsuario": id_usuario,
            "message": "MenÃº asignado correctamente"
        }))),
    )
        .into_response()
}

pub async fn admin_security_delete_assign_menu(
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

    let check_sql = "SELECT idUsuario FROM p_UsuariosConfig WHERE idUsuario = @P1";
    let mut exists = false;
    if let Ok(stream) = client.query(check_sql, &[&id]).await {
        if let Ok(rows) = stream.into_first_result().await {
            exists = rows.len() > 0;
        }
    }

    if exists {
        let query = "UPDATE p_UsuariosConfig SET menuPersonalizado = NULL WHERE idUsuario = @P1";
        if let Err(e) = client.execute(query, &[&id]).await {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response();
        }
    }

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "deleted": id,
            "message": "MenÃº restablecido a automÃ¡tico"
        }))),
    )
        .into_response()
}

pub async fn admin_security_profiles(State(state): State<ApiState>) -> impl IntoResponse {
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

    let mut profiles = Vec::new();
    if let Ok(stream) = client
        .query(
            "SELECT * FROM p_SeguridadPerfiles WHERE activo = 1 ORDER BY nombre ASC",
            &[],
        )
        .await
    {
        if let Ok(rows) = stream.into_first_result().await {
            for r in rows {
                profiles.push(serde_json::json!({
                    "id": r.try_get::<i32, _>("id").ok().flatten().unwrap_or(0),
                    "nombre": r.try_get::<&str, _>("nombre").ok().flatten().unwrap_or(""),
                }));
            }
        }
    }

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "items": profiles
        }))),
    )
        .into_response()
}

pub async fn admin_stats(State(state): State<ApiState>) -> impl IntoResponse {
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

    let sql = "SELECT COUNT(*) as total, SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos, SUM(CASE WHEN activo = 0 THEN 1 ELSE 0 END) as inactivos FROM p_Usuarios";
    let (total, activos, inactivos) = match client.query(sql, &[]).await {
        Ok(s) => match s.into_first_result().await {
            Ok(rows) => {
                if let Some(r) = rows.into_iter().next() {
                    let total = r.try_get::<i32, _>("total").ok().flatten().unwrap_or(0);
                    let activos = r.try_get::<i32, _>("activos").ok().flatten().unwrap_or(0);
                    let inactivos = r.try_get::<i32, _>("inactivos").ok().flatten().unwrap_or(0);
                    (total, activos, inactivos)
                } else {
                    (0, 0, 0)
                }
            }
            Err(_) => (0, 0, 0),
        },
        Err(_) => (0, 0, 0),
    };

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "total": total,
            "activos": activos,
            "inactivos": inactivos
        }))),
    )
        .into_response()
}

#[derive(Deserialize)]
pub struct PaginationDto {
    pub page: Option<i32>,
    pub limit: Option<i32>,
}

pub async fn admin_usuarios(
    State(state): State<ApiState>,
    Query(pag): Query<PaginationDto>,
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

    let page = pag.page.unwrap_or(1).max(1);
    let limit = pag.limit.unwrap_or(50).max(1).min(200);
    let offset = (page - 1) * limit;

    let mut total = 0;
    let mut items = vec![];

    match client
        .query("SELECT COUNT(*) as total FROM p_Usuarios", &[])
        .await
    {
        Ok(st) => {
            if let Ok(rows) = st.into_first_result().await {
                total = rows
                    .into_iter()
                    .next()
                    .and_then(|r| r.try_get::<i32, _>("total").ok().flatten())
                    .unwrap_or(0);
            }
        }
        Err(_) => {}
    }

    let sql = "SELECT u.idUsuario, u.carnet, u.nombre, u.correo, u.cargo, u.departamento, u.gerencia, u.activo, u.idRol, u.rolGlobal, r.nombre as rolNombre, c.menuPersonalizado \
               FROM p_Usuarios u LEFT JOIN p_Roles r ON u.idRol = r.idRol LEFT JOIN p_UsuariosConfig c ON u.idUsuario = c.idUsuario \
               ORDER BY u.nombre ASC OFFSET @P1 ROWS FETCH NEXT @P2 ROWS ONLY";

    match client.query(sql, &[&offset, &limit]).await {
        Ok(stream) => {
            if let Ok(rows) = stream.into_first_result().await {
                items = rows
                    .into_iter()
                    .map(|r| crate::handlers::equipo::row_to_json(&r))
                    .collect();
            }
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    }

    let total_paginas = (total as f64 / limit as f64).ceil() as i32;

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "datos": items,
            "total": total,
            "pagina": page,
            "porPagina": limit,
            "totalPaginas": total_paginas
        }))),
    )
        .into_response()
}

pub async fn admin_patch_usuario_rol(
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    Json(body): Json<AdminPatchRolRequest>,
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

    let sql = "UPDATE p_Usuarios SET rolGlobal = @P1, fechaActualizacion = GETDATE() WHERE idUsuario = @P2";
    let __ret = match client.execute(sql, &[&body.rol, &id]).await {
        Ok(_) => (
            StatusCode::OK,
            Json(crate::models::ApiResponse::success(
                serde_json::json!({"idUsuario": id, "rol": body.rol}),
            )),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(crate::models::ApiResponse::error(e.to_string(), 500)),
        )
            .into_response(),
    };
    __ret
}

pub async fn admin_usuario_menu(
    State(state): State<ApiState>,
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

    let menu_json = body
        .get("menu")
        .map(|m| serde_json::to_string(m).unwrap_or_default());
    let menu_str = menu_json.as_deref();

    // Upsert
    let sql = "IF EXISTS (SELECT 1 FROM p_UsuariosConfig WHERE idUsuario = @P1) \
               UPDATE p_UsuariosConfig SET menuPersonalizado = @P2 WHERE idUsuario = @P1 \
               ELSE \
               INSERT INTO p_UsuariosConfig (idUsuario, menuPersonalizado) VALUES (@P1, @P2)";
    let __ret = match client.execute(sql, &[&id, &menu_str]).await {
        Ok(_) => (
            StatusCode::OK,
            Json(crate::models::ApiResponse::success(
                serde_json::json!({"idUsuario": id, "message": "MenÃº asignado"}),
            )),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(crate::models::ApiResponse::error(e.to_string(), 500)),
        )
            .into_response(),
    };
    __ret
}

pub async fn admin_create_usuario(
    State(state): State<ApiState>,
    Json(body): Json<AdminCreateUsuarioRequest>,
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

    let rol = body.rol_global.unwrap_or_else(|| "Colaborador".to_string());
    let __ret = match client
        .query(
            "EXEC sp_Admin_Usuario_Crear_rust @P1, @P2, @P3, @P4, @P5, @P6",
            &[
                &body.nombre,
                &body.correo,
                &body.carnet,
                &body.cargo,
                &body.telefono,
                &rol,
            ],
        )
        .await
    {
        Ok(st) => {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.into_iter().next() {
                    return (
                        StatusCode::OK,
                        Json(crate::models::ApiResponse::success(
                            crate::handlers::equipo::row_to_json(&r),
                        )),
                    )
                        .into_response();
                }
            }
            (
                StatusCode::OK,
                Json(crate::models::ApiResponse::success(
                    serde_json::json!({"message": "Usuario creado"}),
                )),
            )
                .into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(crate::models::ApiResponse::error(e.to_string(), 500)),
        )
            .into_response(),
    };
    __ret
}

pub async fn admin_patch_usuario(
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    Json(body): Json<AdminPatchUsuarioRequest>,
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

    let mut fields = vec![];
    let mut params: Vec<Box<dyn tiberius::ToSql>> = vec![];

    if let Some(n) = body.nombre {
        fields.push(format!("nombre = @P{}", fields.len() + 1));
        params.push(Box::new(n));
    }
    if let Some(c) = body.correo {
        fields.push(format!("correo = @P{}", fields.len() + 1));
        params.push(Box::new(c));
    }
    if let Some(a) = body.activo {
        fields.push(format!("activo = @P{}", fields.len() + 1));
        params.push(Box::new(if a { 1i32 } else { 0i32 }));
    }

    if fields.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(crate::models::ApiResponse::error(
                "No fields to update".to_string(),
                400,
            )),
        )
            .into_response();
    }

    let id_param = id;
    let sql = format!(
        "UPDATE p_Usuarios SET {}, fechaActualizacion = GETDATE() WHERE idUsuario = @P{}",
        fields.join(", "),
        fields.len() + 1
    );

    let mut final_params: Vec<&dyn tiberius::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    final_params.push(&id_param);

    let __ret = match client.execute(sql.as_str(), &final_params).await {
        Ok(_) => (
            StatusCode::OK,
            Json(crate::models::ApiResponse::success(
                serde_json::json!({"idUsuario": id, "updated": true}),
            )),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(crate::models::ApiResponse::error(e.to_string(), 500)),
        )
            .into_response(),
    };
    __ret
}

pub async fn admin_visibilidad_efectiva(
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

    // Obtener nodos de organizaciÃ³n a los que pertenece + delegaciones
    let sql = "SELECT uo.idNodo, n.nombre as nodoNombre \
               FROM p_UsuariosOrganizacion uo \
               LEFT JOIN p_OrganizacionNodos n ON uo.idNodo = n.id \
               WHERE uo.idUsuario = @P1";
    let res = match client.query(sql, &[&id]).await {
        Ok(st) => {
            if let Ok(rows) = st.into_first_result().await {
                let items: Vec<serde_json::Value> = rows
                    .into_iter()
                    .map(|r| crate::handlers::equipo::row_to_json(&r))
                    .collect();
                items
            } else {
                vec![]
            }
        }
        Err(_) => vec![],
    };

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "idUsuario": id,
            "nodos": res
        }))),
    )
        .into_response()
}

pub async fn admin_roles(State(state): State<ApiState>) -> impl IntoResponse {
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

    let response = match client
        .query(
            "SELECT idRol, nombre, descripcion, reglas, esSistema, defaultMenu FROM p_Roles ORDER BY nombre",
            &[],
        )
        .await
    {
        Ok(stream) => match stream.into_first_result().await {
            Ok(rows) => {
                let roles: Vec<serde_json::Value> = rows
                    .into_iter()
                    .map(|r| {
                        serde_json::json!({
                            "idRol": r.try_get::<i32, _>("idRol").ok().flatten().unwrap_or(0),
                            "nombre": r.try_get::<&str, _>("nombre").ok().flatten().unwrap_or(""),
                            "descripcion": r.try_get::<&str, _>("descripcion").ok().flatten().unwrap_or(""),
                            "reglas": r.try_get::<&str, _>("reglas").ok().flatten().unwrap_or("[]"),
                            "esSistema": r.try_get::<bool, _>("esSistema").ok().flatten().unwrap_or(false),
                            "defaultMenu": r.try_get::<&str, _>("defaultMenu").ok().flatten(),
                        })
                    })
                    .collect();
                (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!(roles)))).into_response()
            }
            Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
        },
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(crate::models::ApiResponse::error(e.to_string(), 500))).into_response(),
    };
    response
}

pub async fn admin_create_role(
    State(state): State<ApiState>,
    Json(body): Json<AdminCreateRoleRequest>,
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

    let sql =
        "INSERT INTO p_Roles (nombre, descripcion, reglas, esSistema) VALUES (@P1, @P2, @P3, 0)";
    let __ret = match client
        .execute(
            sql,
            &[
                &body.nombre,
                &body.descripcion.unwrap_or_default(),
                &body.reglas.unwrap_or_else(|| "[]".to_string()),
            ],
        )
        .await
    {
        Ok(_) => (
            StatusCode::OK,
            Json(crate::models::ApiResponse::success(
                serde_json::json!({"message": "Rol creado"}),
            )),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(crate::models::ApiResponse::error(e.to_string(), 500)),
        )
            .into_response(),
    };
    __ret
}

pub async fn admin_patch_role(
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    Json(body): Json<AdminPatchRoleRequest>,
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

    let sql = "UPDATE p_Roles SET nombre = ISNULL(@P1, nombre), descripcion = ISNULL(@P2, descripcion) WHERE idRol = @P3";
    let __ret = match client
        .execute(sql, &[&body.nombre, &body.descripcion, &id])
        .await
    {
        Ok(_) => (
            StatusCode::OK,
            Json(crate::models::ApiResponse::success(
                serde_json::json!({"id": id, "updated": true}),
            )),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": e.to_string()})),
        )
            .into_response(),
    };
    __ret
}

pub async fn admin_delete_role(
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

    let __ret = match client
        .execute("DELETE FROM p_Roles WHERE idRol = @P1", &[&id])
        .await
    {
        Ok(_) => (
            StatusCode::OK,
            Json(crate::models::ApiResponse::success(
                serde_json::json!({"deleted": id}),
            )),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(crate::models::ApiResponse::error(e.to_string(), 500)),
        )
            .into_response(),
    };
    __ret
}

pub async fn admin_logs(
    State(state): State<ApiState>,
    Query(pag): Query<PaginationDto>,
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

    let page = pag.page.unwrap_or(1).max(1);
    let limit = pag.limit.unwrap_or(100).max(1).min(500);
    let offset = (page - 1) * limit;

    let total = match client
        .query("SELECT COUNT(*) as total FROM p_Logs", &[])
        .await
    {
        Ok(s) => match s.into_first_result().await {
            Ok(rows) => rows
                .into_iter()
                .next()
                .and_then(|r| r.try_get::<i32, _>("total").ok().flatten())
                .unwrap_or(0),
            Err(_) => 0,
        },
        Err(_) => 0,
    };

    let sql = "SELECT id as idLog, idUsuario, accion, entidad, datos, fecha FROM p_Logs ORDER BY fecha DESC OFFSET @P1 ROWS FETCH NEXT @P2 ROWS ONLY";
    let response =
        match client.query(sql, &[&offset, &limit]).await {
            Ok(stream) => match stream.into_first_result().await {
                Ok(rows) => {
                    let items: Vec<serde_json::Value> = rows.into_iter().map(|r| {
                        serde_json::json!({
                            "idLog": r.try_get::<i32, _>("idLog").ok().flatten().unwrap_or(0),
                            "idUsuario": r.try_get::<i32, _>("idUsuario").ok().flatten(),
                            "nivel": r.try_get::<&str, _>("accion").ok().flatten().unwrap_or(""),
                            "origen": r.try_get::<&str, _>("entidad").ok().flatten().unwrap_or(""),
                            "mensaje": r.try_get::<&str, _>("datos").ok().flatten().unwrap_or(""),
                            "fecha": r.try_get::<chrono::NaiveDateTime, _>("fecha").ok().flatten(),
                        })
                    }).collect();
                    let total_paginas = (total as f64 / limit as f64).ceil() as i32;
                    (
                        StatusCode::OK,
                        Json(crate::models::ApiResponse::success(serde_json::json!({
                            "items": items,
                            "total": total,
                            "page": page,
                            "totalPages": total_paginas,
                            "estadisticas": { "errors": 0, "warns": 0, "infos": 0 }
                        }))),
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
    response
}

pub async fn admin_audit_logs(
    State(state): State<ApiState>,
    Query(pag): Query<PaginationDto>,
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

    let page = pag.page.unwrap_or(1).max(1);
    let limit = pag.limit.unwrap_or(50).max(1).min(200);
    let offset = (page - 1) * limit;

    let total = match client
        .query("SELECT COUNT(*) as total FROM p_Logs", &[])
        .await
    {
        Ok(s) => match s.into_first_result().await {
            Ok(rows) => rows
                .into_iter()
                .next()
                .and_then(|r| r.try_get::<i32, _>("total").ok().flatten())
                .unwrap_or(0),
            Err(_) => 0,
        },
        Err(_) => 0,
    };

    let sql = "SELECT a.id as idAudit, u.nombre as usuario, u.correo as correoUsuario, u.carnet, a.accion, a.entidad as recurso, '' as recursoId, '' as datosAnteriores, a.datos as datosNuevos, a.fecha FROM p_Logs a LEFT JOIN p_Usuarios u ON a.idUsuario = u.idUsuario ORDER BY a.fecha DESC OFFSET @P1 ROWS FETCH NEXT @P2 ROWS ONLY";
    let response = match client.query(sql, &[&offset, &limit]).await {
        Ok(stream) => match stream.into_first_result().await {
            Ok(rows) => {
                let items: Vec<serde_json::Value> = rows.into_iter().map(|r| {
                        serde_json::json!({
                            "idAudit": r.try_get::<i32, _>("idAudit").ok().flatten().unwrap_or(0),
                            "usuario": r.try_get::<&str, _>("usuario").ok().flatten().unwrap_or("Sistema"),
                            "correo": r.try_get::<&str, _>("correoUsuario").ok().flatten(),
                            "carnet": r.try_get::<&str, _>("carnet").ok().flatten(),
                            "accion": r.try_get::<&str, _>("accion").ok().flatten().unwrap_or(""),
                            "recurso": r.try_get::<&str, _>("recurso").ok().flatten().unwrap_or(""),
                            "recursoId": r.try_get::<&str, _>("recursoId").ok().flatten(),
                            "datosAnteriores": r.try_get::<&str, _>("datosAnteriores").ok().flatten(),
                            "datosNuevos": r.try_get::<&str, _>("datosNuevos").ok().flatten(),
                            "detalles": r.try_get::<&str, _>("datosNuevos").ok().flatten(),
                            "fecha": r.try_get::<chrono::NaiveDateTime, _>("fecha").ok().flatten(),
                        })
                    }).collect();
                let total_paginas = (total as f64 / limit as f64).ceil() as i32;
                (
                    StatusCode::OK,
                    Json(crate::models::ApiResponse::success(serde_json::json!({
                        "items": items,
                        "total": total,
                        "page": page,
                        "totalPages": total_paginas
                    }))),
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
    response
}

pub async fn admin_organigrama(State(state): State<ApiState>) -> impl IntoResponse {
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

    let sql = "SELECT id as idNodo, nombre, idPadre as parentId FROM p_OrganizacionNodos";
    let response =
        match client.query(sql, &[]).await {
            Ok(stream) => match stream.into_first_result().await {
                Ok(rows) => {
                    let nodos: Vec<serde_json::Value> = rows.into_iter().map(|r| {
                        serde_json::json!({
                            "id": r.try_get::<i32, _>("idNodo").ok().flatten().unwrap_or(0),
                            "nombre": r.try_get::<&str, _>("nombre").ok().flatten().unwrap_or(""),
                            "parent_id": r.try_get::<i32, _>("parentId").ok().flatten()
                        })
                    }).collect();
                    (
                        StatusCode::OK,
                        Json(crate::models::ApiResponse::success(
                            serde_json::json!({"nodos": nodos}),
                        )),
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
    response
}

pub async fn admin_create_nodo(
    State(state): State<ApiState>,
    Json(body): Json<AdminCreateNodoRequest>,
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

    let sql = "INSERT INTO p_OrganizacionNodos (nombre, tipo, idPadre, orden, activo) OUTPUT INSERTED.id VALUES (@P1, 'departamento', @P2, 0, 1)";
    let __ret = match client.query(sql, &[&body.nombre, &body.parent_id]).await {
        Ok(st) => {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.into_iter().next() {
                    let new_id = r.try_get::<i32, _>("id").ok().flatten().unwrap_or(0);
                    return (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
                        "nodo": {"id": new_id, "nombre": body.nombre, "parent_id": body.parent_id}
                    })))).into_response();
                }
            }
            (
                StatusCode::OK,
                Json(crate::models::ApiResponse::success(
                    serde_json::json!({"message": "Nodo creado"}),
                )),
            )
                .into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(crate::models::ApiResponse::error(e.to_string(), 500)),
        )
            .into_response(),
    };
    __ret
}

pub async fn admin_usuarios_organizacion(
    State(state): State<ApiState>,
    Json(body): Json<AdminUsuarioOrganizacionRequest>,
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

    let id_usuario = body.id_usuario as i32;
    let id_nodo = body.id_nodo as i32;
    let sql = "INSERT INTO p_UsuariosOrganizacion (idUsuario, idNodo, rol, esResponsable) VALUES (@P1, @P2, 'Miembro', 0)";
    let __ret = match client.execute(sql, &[&id_usuario, &id_nodo]).await {
        Ok(_) => (
            StatusCode::OK,
            Json(crate::models::ApiResponse::success(serde_json::json!({
                "idUsuario": body.id_usuario, "idNodo": body.id_nodo
            }))),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": e.to_string()})),
        )
            .into_response(),
    };
    __ret
}

pub async fn admin_recycle_bin(State(state): State<ApiState>) -> impl IntoResponse {
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

    let items = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Admin_RecycleBin_Listar_rust",
        &[],
    )
    .await;
    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(items)),
    )
        .into_response()
}

pub async fn admin_recycle_restore(
    State(state): State<ApiState>,
    Json(body): Json<AdminRecycleRestoreRequest>,
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

    let mut restored = 0;
    let mut skipped = 0;
    let ids = if let Some(id) = body.id {
        vec![id]
    } else {
        body.ids.unwrap_or_default()
    };

    for id in ids {
        let id_val = id as i32;
        if body.tipo == "Proyecto" {
            let _ = client
                .execute(
                    "UPDATE p_Proyectos SET estado = 'Activo', activo = 1 WHERE idProyecto = @P1",
                    &[&id_val],
                )
                .await;
            restored += 1;
        } else {
            // Requisito Migration: Verificar si el proyecto padre estÃ¡ activo
            let check_sql = "SELECT p.activo FROM p_Tareas t JOIN p_Proyectos p ON t.idProyecto = p.idProyecto WHERE t.idTarea = @P1";
            let p_activo = match client.query(check_sql, &[&id_val]).await {
                Ok(st) => match st.into_first_result().await {
                    Ok(rows) => rows
                        .first()
                        .and_then(|r| r.try_get::<bool, _>("activo").ok().flatten())
                        .unwrap_or(true),
                    Err(_) => true,
                },
                Err(_) => true,
            };

            if p_activo {
                let _ = client.execute("UPDATE p_Tareas SET estado = 'Pendiente', activo = 1, fechaActualizacion = GETDATE() WHERE idTarea = @P1", &[&id_val]).await;
                restored += 1;
            } else {
                skipped += 1;
            }
        }
    }

    let message = if skipped > 0 {
        format!(
            "Se restauraron {} elementos. {} se omitieron porque su proyecto padre sigue borrado.",
            restored, skipped
        )
    } else {
        format!("Se restauraron {} elementos correctamente.", restored)
    };

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "restored": restored,
            "skipped": skipped,
            "message": message
        }))),
    )
        .into_response()
}

pub async fn admin_delete_usuario(
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

    let __ret = match client
        .execute("EXEC sp_Admin_Usuario_Eliminar_rust @P1", &[&id])
        .await
    {
        Ok(_) => (
            StatusCode::OK,
            Json(crate::models::ApiResponse::success(
                serde_json::json!({"deleted": id}),
            )),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(crate::models::ApiResponse::error(e.to_string(), 500)),
        )
            .into_response(),
    };
    __ret
}

pub async fn admin_delete_usuario_organizacion(
    State(state): State<ApiState>,
    Path((id_usuario, id_nodo)): Path<(i32, i32)>,
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

    let sql = "DELETE FROM p_UsuariosOrganizacion WHERE idUsuario = @P1 AND idNodo = @P2";
    let __ret = match client.execute(sql, &[&id_usuario, &id_nodo]).await {
        Ok(_) => (
            StatusCode::OK,
            Json(crate::models::ApiResponse::success(serde_json::json!({
                "idUsuario": id_usuario, "idNodo": id_nodo, "deleted": true
            }))),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(crate::models::ApiResponse::error(e.to_string(), 500)),
        )
            .into_response(),
    };
    __ret
}

pub async fn admin_usuarios_inactivos(
    State(state): State<ApiState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
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

    let days = params
        .get("days")
        .and_then(|d| d.parse::<i32>().ok())
        .unwrap_or(30);

    let items = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Admin_Usuarios_Inactivos_rust @P1",
        &[&days],
    )
    .await;
    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(items)),
    )
        .into_response()
}

pub async fn admin_backup_export(State(state): State<ApiState>) -> impl IntoResponse {
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

    let usuarios = crate::handlers::equipo::exec_query_to_json(
        &mut client,
        "SELECT * FROM p_Usuarios WHERE activo = 1",
        &[],
    )
    .await;
    let proyectos = crate::handlers::equipo::exec_query_to_json(
        &mut client,
        "SELECT * FROM p_Proyectos WHERE activo = 1",
        &[],
    )
    .await;

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "version": "1.0",
            "timestamp": chrono::Utc::now(),
            "data": {
                "usuarios": usuarios,
                "proyectos": proyectos
            }
        }))),
    )
        .into_response()
}

pub async fn admin_import_template_empleados() -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(
            serde_json::json!({"template": "empleados.xlsx"}),
        )),
    )
        .into_response()
}

pub async fn admin_import_template_organizacion() -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(
            serde_json::json!({"template": "organizacion.xlsx"}),
        )),
    )
        .into_response()
}

pub async fn admin_import_empleados(
    State(state): State<ApiState>,
    Json(body): Json<AdminImportEmpleadosRequest>,
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

    let mut processed = 0;
    let mut created = 0;
    let mut updated = 0;
    let mut errors = Vec::new();

    for emp in body.empleados {
        let nombre = emp.get("nombre").and_then(|v| v.as_str()).unwrap_or("");
        let correo = emp.get("correo").and_then(|v| v.as_str()).unwrap_or("");
        let carnet = emp.get("carnet").and_then(|v| v.as_str()).unwrap_or("");
        let cargo = emp
            .get("cargo")
            .and_then(|v| v.as_str())
            .unwrap_or("Colaborador");
        let depto_nombre = emp
            .get("departamento")
            .and_then(|v| v.as_str())
            .unwrap_or("General");
        let jefe_email = emp.get("jefeCorreo").and_then(|v| v.as_str()).unwrap_or("");
        let rol_nombre = emp.get("rol").and_then(|v| v.as_str()).unwrap_or("Usuario");

        if correo.is_empty() || nombre.is_empty() {
            errors.push(format!("Empleado sin nombre o correo: {:?}", emp));
            continue;
        }

        // 1. Resolver ID de Jefe
        let mut id_jefe: Option<i32> = None;
        if !jefe_email.is_empty() {
            if let Ok(st) = client
                .query(
                    "SELECT idUsuario FROM p_Usuarios WHERE correo = @P1",
                    &[&jefe_email],
                )
                .await
            {
                if let Ok(rows) = st.into_first_result().await {
                    id_jefe = rows
                        .first()
                        .and_then(|r| r.try_get::<i32, _>("idUsuario").ok().flatten());
                }
            }
        }

        // 2. Resolver ID de OrganizaciÃ³n (Nodo)
        let mut id_nodo: i32 = 1; // Default
        if !depto_nombre.is_empty() {
            if let Ok(st) = client
                .query(
                    "SELECT id FROM p_OrganizacionNodos WHERE nombre = @P1",
                    &[&depto_nombre],
                )
                .await
            {
                if let Ok(rows) = st.into_first_result().await {
                    id_nodo = rows
                        .first()
                        .and_then(|r| r.try_get::<i32, _>("id").ok().flatten())
                        .unwrap_or(1);
                }
            }
        }

        // 3. Obtener ID de Rol
        let mut id_rol: i32 = 2; // Default User
        if !rol_nombre.is_empty() {
            if let Ok(st) = client
                .query(
                    "SELECT idRol FROM p_Roles WHERE nombre = @P1",
                    &[&rol_nombre],
                )
                .await
            {
                if let Ok(rows) = st.into_first_result().await {
                    id_rol = rows
                        .first()
                        .and_then(|r| r.try_get::<i32, _>("idRol").ok().flatten())
                        .unwrap_or(2);
                }
            }
        }

        // 4. Upsert via sp_Admin_Usuarios_Gestion
        let res = client.query(
            "EXEC sp_Admin_Usuarios_Importar_rust @nombre=@P1, @correo=@P2, @carnet=@P3, @cargo=@P4, @idOrg=@P5, @idJefe=@P6, @idRol=@P7",
            &[&nombre, &correo, &carnet, &cargo, &id_nodo, &id_jefe, &id_rol]
        ).await;

        match res {
            Ok(st) => {
                if let Ok(rows) = st.into_first_result().await {
                    if let Some(r) = rows.first() {
                        let accion = r
                            .try_get::<&str, _>("accion")
                            .ok()
                            .flatten()
                            .unwrap_or("ninguna");
                        if accion == "INSERT" {
                            created += 1;
                        } else {
                            updated += 1;
                        }
                    }
                }
                processed += 1;
            }
            Err(e) => {
                errors.push(format!("Error importando {}: {}", correo, e));
            }
        }
    }

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "processed": processed,
            "created": created,
            "updated": updated,
            "errors": errors,
            "success": errors.is_empty()
        }))),
    )
        .into_response()
}

pub async fn admin_import_organizacion(Json(body): Json<AdminImportRequest>) -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(
            serde_json::json!({"processed": body.rows}),
        )),
    )
        .into_response()
}

pub async fn admin_import_asignaciones(Json(body): Json<AdminImportRequest>) -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(
            serde_json::json!({"processed": body.rows}),
        )),
    )
        .into_response()
}

pub async fn admin_import_stats(State(state): State<ApiState>) -> impl IntoResponse {
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

    let sql = "SELECT \
        (SELECT COUNT(*) FROM p_Usuarios) as total_emp, \
        (SELECT COUNT(*) FROM p_Usuarios WHERE activo = 1) as activos_emp, \
        (SELECT COUNT(*) FROM p_OrganizacionNodos) as total_nodos";

    let rows = match client.query(sql, &[]).await {
        Ok(st) => st.into_first_result().await.unwrap_or_default(),
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    };

    if let Some(r) = rows.into_iter().next() {
        let total_emp = r.try_get::<i32, _>("total_emp").ok().flatten().unwrap_or(0);
        let activos_emp = r
            .try_get::<i32, _>("activos_emp")
            .ok()
            .flatten()
            .unwrap_or(0);
        let total_nodos = r
            .try_get::<i32, _>("total_nodos")
            .ok()
            .flatten()
            .unwrap_or(0);
        let data = serde_json::json!({
            "empleados": { "total": total_emp, "activos": activos_emp },
            "nodos": { "total": total_nodos }
        });
        (
            StatusCode::OK,
            Json(crate::models::ApiResponse::success(data)),
        )
            .into_response()
    } else {
        (
            StatusCode::NOT_FOUND,
            Json(crate::models::ApiResponse::error(
                "No data found".to_string(),
                404,
            )),
        )
            .into_response()
    }
}

// ----- MODELS -----

#[derive(Deserialize)]
pub struct AdminAssignMenuRequest {
    #[serde(rename = "idUsuario")]
    pub id_usuario: u64,
    pub menu: Vec<String>,
}

#[derive(Deserialize)]
pub struct AdminPatchRolRequest {
    pub rol: String,
}

#[derive(Deserialize)]
pub struct AdminCreateUsuarioRequest {
    pub nombre: String,
    pub correo: String,
    pub carnet: Option<String>,
    pub cargo: Option<String>,
    pub telefono: Option<String>,
    #[serde(rename = "rolGlobal")]
    pub rol_global: Option<String>,
}

#[derive(Deserialize)]
pub struct AdminPatchUsuarioRequest {
    pub nombre: Option<String>,
    pub correo: Option<String>,
    pub activo: Option<bool>,
}

#[derive(Deserialize)]
pub struct AdminCreateRoleRequest {
    pub nombre: String,
    pub descripcion: Option<String>,
    pub reglas: Option<String>,
}

#[derive(Deserialize)]
pub struct AdminPatchRoleRequest {
    pub nombre: Option<String>,
    pub descripcion: Option<String>,
}

#[derive(Debug, serde::Deserialize)]
pub struct AdminCreateNodoRequest {
    pub nombre: String,
    pub parent_id: Option<i32>,
}

#[derive(Deserialize)]
pub struct AdminUsuarioOrganizacionRequest {
    #[serde(rename = "idUsuario")]
    pub id_usuario: u64,
    #[serde(rename = "idNodo")]
    pub id_nodo: u64,
}

#[derive(Deserialize)]
pub struct AdminRecycleRestoreRequest {
    pub tipo: String,
    pub id: Option<u64>,
    pub ids: Option<Vec<u64>>,
}

#[derive(Deserialize)]
pub struct AdminImportRequest {
    pub rows: usize,
}

#[derive(Deserialize)]
pub struct AdminImportEmpleadosRequest {
    pub empleados: Vec<serde_json::Value>,
}
