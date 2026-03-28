#![allow(dead_code)]
use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use jsonwebtoken::{encode, EncodingKey, Header};
use serde::{Deserialize, Serialize};
use tiberius::Row;

use crate::state::ApiState;

type SqlConnection<'a> = bb8::PooledConnection<'a, bb8_tiberius::ConnectionManager>;

pub async fn auth_login(
    State(state): State<ApiState>,
    Json(body): Json<LoginRequest>,
) -> impl IntoResponse {
    tracing::info!("LOGIN ATTEMPT correo={}", body.correo);

    let rate_key = body.correo.to_lowercase();
    match state.login_limiter.check_and_increment(&rate_key).await {
        Err(retry_secs) => {
            return (
                StatusCode::TOO_MANY_REQUESTS,
                Json(crate::models::ApiResponse::error(
                    format!(
                        "Demasiados intentos de login. Intente de nuevo en {} minutos.",
                        retry_secs / 60 + 1
                    ),
                    429,
                )),
            )
                .into_response();
        }
        Ok(_) => {}
    }

    let mut client = match state.pool.get().await {
        Ok(client) => client,
        Err(error) => return internal_error_response(format!("Error de conexion BD: {}", error)),
    };
    tracing::info!("LOGIN STEP pool.get ok");

    let user = match load_user_by_identifier(&mut client, &body.correo).await {
        Ok(Some(user)) => user,
        Ok(None) => return invalid_credentials_response("Credenciales invalidas"),
        Err(error) => return internal_error_response(error),
    };
    tracing::info!("LOGIN STEP user loaded id={}", user.id_usuario);

    let Some(password_hash) = user.password_hash.as_deref() else {
        return invalid_credentials_response("Credenciales invalidas");
    };

    let is_valid = bcrypt::verify(&body.password, password_hash).unwrap_or(false);
    tracing::info!("LOGIN STEP bcrypt verified={}", is_valid);
    if !is_valid {
        return invalid_credentials_response("Credenciales invalidas");
    }

    tracing::info!("LOGIN STEP loading subordinate count");
    let subordinate_count = load_subordinate_count(&mut client, &user).await.unwrap_or(0);
    tracing::info!("LOGIN STEP subordinate count={}", subordinate_count);
    tracing::info!("LOGIN STEP resolving menu");
    let menu_config = resolve_menu_config(&mut client, &user, subordinate_count).await;
    tracing::info!("LOGIN STEP menu resolved has_custom={}", menu_config.is_some());
    let tokens = match issue_tokens(&state.jwt_secret, &user) {
        Ok(tokens) => tokens,
        Err(error) => return internal_error_response(error),
    };
    tracing::info!("LOGIN STEP tokens issued");

    let hashed_refresh_token = match bcrypt::hash(&tokens.refresh_token, 10) {
        Ok(hash) => hash,
        Err(error) => return internal_error_response(format!("Error hashing refresh token: {}", error)),
    };
    tracing::info!("LOGIN STEP refresh token hashed");

    let _ = client.execute(
        "UPDATE p_UsuariosCredenciales \
         SET ultimoLogin = GETDATE(), refreshTokenHash = @P1 \
         WHERE idUsuario = @P2",
        &[&hashed_refresh_token.as_str(), &user.id_usuario],
    ).await;
    tracing::info!("LOGIN STEP credenciales updated");

    let _ = client.execute(
        "UPDATE p_Usuarios SET fechaUltimoLogin = GETDATE() WHERE idUsuario = @P1",
        &[&user.id_usuario],
    ).await;
    tracing::info!("LOGIN STEP usuario updated");

    let _ = client.execute(
        "INSERT INTO p_AuditLogs (idUsuario, accion, entidadTipo, detalle, fecha) \
         VALUES (@P1, 'LOGIN', 'Usuario', 'Inicio de sesion exitoso desde Rust', GETDATE())",
        &[&user.id_usuario],
    ).await;
    tracing::info!("LOGIN STEP audit inserted");

    state.login_limiter.reset(&rate_key).await;
    tracing::info!("LOGIN STEP limiter reset");

    let rol = build_role_value(&user);
    let carnet = user.carnet.clone();
    let id_org = user.id_org.map(|value| serde_json::json!(value));

    (
        StatusCode::OK,
        Json(LoginResponse {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            user: LoginUser {
                id_usuario: user.id_usuario,
                nombre: user.nombre,
                correo: user.correo,
                carnet,
                rol,
                rol_global: user.rol_global,
                pais: user.pais,
                id_org,
                cargo: user.cargo,
                departamento: user.departamento,
                subordinate_count,
                menu_config,
            },
        }),
    )
        .into_response()
}

pub async fn auth_refresh(
    State(state): State<ApiState>,
    Json(body): Json<RefreshRequest>,
) -> impl IntoResponse {
    let claims = match decode_refresh_claims(&state.jwt_secret, &body.refresh_token) {
        Ok(claims) => claims,
        Err(response) => return response,
    };

    let mut client = match state.pool.get().await {
        Ok(client) => client,
        Err(error) => return internal_error_response(format!("Error de conexion BD: {}", error)),
    };

    let stored_hash = match load_refresh_token_hash(&mut client, claims.sub as i32).await {
        Ok(Some(hash)) => hash,
        Ok(None) => return invalid_credentials_response("Invalid Refresh Token"),
        Err(error) => return internal_error_response(error),
    };

    let matches = bcrypt::verify(&body.refresh_token, &stored_hash).unwrap_or(false);
    if !matches {
        return invalid_credentials_response("Invalid Refresh Token");
    }

    let user = match load_user_by_id(&mut client, claims.sub as i32).await {
        Ok(Some(user)) => user,
        Ok(None) => return invalid_credentials_response("Invalid Refresh Token"),
        Err(error) => return internal_error_response(error),
    };

    let tokens = match issue_tokens(&state.jwt_secret, &user) {
        Ok(tokens) => tokens,
        Err(error) => return internal_error_response(error),
    };

    let hashed_refresh_token = match bcrypt::hash(&tokens.refresh_token, 10) {
        Ok(hash) => hash,
        Err(error) => return internal_error_response(format!("Error hashing refresh token: {}", error)),
    };

    let _ = client.execute(
        "UPDATE p_UsuariosCredenciales SET refreshTokenHash = @P1 WHERE idUsuario = @P2",
        &[&hashed_refresh_token.as_str(), &(claims.sub as i32)],
    ).await;

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "access_token": tokens.access_token,
            "refresh_token": tokens.refresh_token,
        })),
    )
        .into_response()
}

pub async fn auth_change_password(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<ChangePasswordRequest>,
) -> impl IntoResponse {
    if body.old_password.trim().is_empty() || body.new_password.trim().len() < 6 {
        return bad_request_response("Datos de contrasena invalidos (minimo 6 caracteres)");
    }

    let user_id = user.user_id_i32();
    let mut client = match state.pool.get().await {
        Ok(client) => client,
        Err(error) => return internal_error_response(format!("Error de conexion BD: {}", error)),
    };

    let current_hash = match load_password_hash(&mut client, user_id).await {
        Ok(Some(hash)) => hash,
        Ok(None) => return invalid_credentials_response("Usuario no tiene credenciales configuradas"),
        Err(error) => return internal_error_response(error),
    };

    let current_matches = bcrypt::verify(&body.old_password, &current_hash).unwrap_or(false);
    if !current_matches {
        return invalid_credentials_response("La contrasena actual es incorrecta");
    }

    let new_hash = match bcrypt::hash(&body.new_password, 10) {
        Ok(hash) => hash,
        Err(error) => return internal_error_response(format!("Error hashing password: {}", error)),
    };

    match client.execute(
        "UPDATE p_UsuariosCredenciales \
         SET passwordHash = @P1, fechaActualizacion = GETDATE() \
         WHERE idUsuario = @P2",
        &[&new_hash.as_str(), &user_id],
    ).await {
        Ok(_) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "message": "Contrasena actualizada correctamente",
            })),
        )
            .into_response(),
        Err(error) => internal_error_response(error.to_string()),
    }
}

pub async fn auth_get_config(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let user_id = user.user_id_i32();
    let mut client = match state.pool.get().await {
        Ok(client) => client,
        Err(error) => return internal_error_response(format!("Error de conexion BD: {}", error)),
    };

    if let Err(error) = ensure_agenda_config_column(&mut client).await {
        return internal_error_response(error);
    }

    let config_query = client.query(
        "SELECT menuPersonalizado, agendaConfig FROM p_UsuariosConfig WHERE idUsuario = @P1",
        &[&user_id],
    ).await;

    let response = match config_query {
        Ok(stream) => match stream.into_first_result().await {
            Ok(rows) => {
                if let Some(row) = rows.into_iter().next() {
                    let custom_menu = row
                        .try_get::<&str, _>("menuPersonalizado")
                        .ok()
                        .flatten()
                        .map(|value| value.to_string());
                    let agenda_config = row
                        .try_get::<&str, _>("agendaConfig")
                        .ok()
                        .flatten();
                    let (show_gestion, show_rapida) = parse_agenda_flags(agenda_config);

                    (
                        StatusCode::OK,
                        Json(serde_json::json!({
                            "customMenu": custom_menu,
                            "agendaShowGestion": show_gestion,
                            "agendaShowRapida": show_rapida,
                        })),
                    )
                        .into_response()
                } else {
                    (
                        StatusCode::OK,
                        Json(serde_json::json!({
                            "agendaShowGestion": true,
                            "agendaShowRapida": true,
                        })),
                    )
                        .into_response()
                }
            }
            Err(error) => internal_error_response(error.to_string()),
        },
        Err(error) => internal_error_response(error.to_string()),
    };

    response
}

pub async fn auth_update_config(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<UpdateConfigRequest>,
) -> impl IntoResponse {
    let user_id = user.user_id_i32();
    let show_gestion = boolish_flag(body.config.get("agendaShowGestion"), true);
    let show_rapida = boolish_flag(body.config.get("agendaShowRapida"), true);
    let agenda_json = serde_json::json!({
        "showGestion": show_gestion,
        "showRapida": show_rapida,
    })
    .to_string();

    let menu_personalizado = body
        .config
        .get("menuPersonalizado")
        .and_then(|value| match value {
            serde_json::Value::Null => None,
            serde_json::Value::String(text) => Some(text.to_string()),
            other => Some(other.to_string()),
        });

    let mut client = match state.pool.get().await {
        Ok(client) => client,
        Err(error) => return internal_error_response(format!("Error de conexion BD: {}", error)),
    };

    if let Err(error) = ensure_agenda_config_column(&mut client).await {
        return internal_error_response(error);
    }

    match client.execute(
        "UPDATE p_UsuariosConfig \
         SET agendaConfig = @P1, \
             menuPersonalizado = ISNULL(@P2, menuPersonalizado) \
         WHERE idUsuario = @P3",
        &[&agenda_json.as_str(), &menu_personalizado.as_deref(), &user_id],
    ).await {
        Ok(result) => {
            if result.total() == 0 {
                match client.execute(
                    "INSERT INTO p_UsuariosConfig (idUsuario, menuPersonalizado, agendaConfig) \
                     VALUES (@P1, @P2, @P3)",
                    &[&user_id, &menu_personalizado.as_deref(), &agenda_json.as_str()],
                ).await {
                    Ok(_) => success_flag_response(),
                    Err(error) => internal_error_response(error.to_string()),
                }
            } else {
                success_flag_response()
            }
        }
        Err(error) => internal_error_response(error.to_string()),
    }
}

fn success_flag_response() -> Response {
    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true
        })),
    )
        .into_response()
}

fn invalid_credentials_response(message: &str) -> Response {
    (
        StatusCode::UNAUTHORIZED,
        Json(crate::models::ApiResponse::error_with_code(
            message.to_string(),
            401,
            "INVALID_CREDENTIALS".to_string(),
        )),
    )
        .into_response()
}

fn bad_request_response(message: &str) -> Response {
    (
        StatusCode::BAD_REQUEST,
        Json(crate::models::ApiResponse::error(message.to_string(), 400)),
    )
        .into_response()
}

fn internal_error_response(message: impl Into<String>) -> Response {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(crate::models::ApiResponse::error(message.into(), 500)),
    )
        .into_response()
}

fn boolish_flag(value: Option<&serde_json::Value>, default: bool) -> bool {
    match value {
        Some(serde_json::Value::Bool(flag)) => *flag,
        Some(serde_json::Value::Number(number)) => number.as_i64().map(|n| n != 0).unwrap_or(default),
        Some(serde_json::Value::String(text)) => {
            let normalized = text.trim().to_ascii_lowercase();
            if normalized == "false" || normalized == "0" {
                false
            } else if normalized == "true" || normalized == "1" {
                true
            } else {
                default
            }
        }
        _ => default,
    }
}

fn parse_agenda_flags(raw: Option<&str>) -> (bool, bool) {
    if let Some(text) = raw {
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(text) {
            return (
                parsed.get("showGestion").and_then(|v| v.as_bool()).unwrap_or(true),
                parsed.get("showRapida").and_then(|v| v.as_bool()).unwrap_or(true),
            );
        }
    }

    (true, true)
}

fn parse_menu_json(raw: &str) -> Option<serde_json::Value> {
    serde_json::from_str::<serde_json::Value>(raw).ok()
}

fn build_role_value(user: &UserRow) -> Option<serde_json::Value> {
    user.id_rol.map(|id| {
        serde_json::json!({
            "idRol": id,
            "nombre": user.rol_nombre.clone().unwrap_or_default(),
            "descripcion": user.rol_descripcion,
            "esSistema": user.rol_es_sistema.unwrap_or(false),
            "reglas": user.rol_reglas.clone().unwrap_or_else(|| "[]".to_string()),
            "defaultMenu": user.rol_default_menu,
        })
    })
}

async fn ensure_agenda_config_column(client: &mut SqlConnection<'_>) -> Result<(), String> {
    client.execute(
        "IF NOT EXISTS (
            SELECT 1
            FROM sys.columns
            WHERE object_id = OBJECT_ID('p_UsuariosConfig')
              AND name = 'agendaConfig'
        )
        ALTER TABLE p_UsuariosConfig ADD agendaConfig NVARCHAR(MAX) NULL",
        &[],
    ).await.map(|_| ()).map_err(|error| error.to_string())
}

async fn load_user_by_identifier(client: &mut SqlConnection<'_>, identifier: &str) -> Result<Option<UserRow>, String> {
    let query = "
        SELECT
            u.idUsuario, u.correo, u.nombre, u.carnet, u.idRol, u.rolGlobal, u.pais, u.idOrg, u.cargo, u.departamento,
            c.passwordHash,
            r.nombre AS rolNombre,
            r.descripcion AS rolDescripcion,
            r.esSistema,
            r.reglas,
            r.defaultMenu
        FROM p_Usuarios u
        LEFT JOIN p_UsuariosCredenciales c ON u.idUsuario = c.idUsuario
        LEFT JOIN p_Roles r ON u.idRol = r.idRol
        WHERE (u.correo = @P1 OR u.carnet = @P1) AND u.activo = 1";

    client
        .query(query, &[&identifier])
        .await
        .map_err(|error| error.to_string())?
        .into_first_result()
        .await
        .map_err(|error| error.to_string())
        .map(|rows| rows.into_iter().next().map(map_user_row))
}

async fn load_user_by_id(client: &mut SqlConnection<'_>, user_id: i32) -> Result<Option<UserRow>, String> {
    let query = "
        SELECT
            u.idUsuario, u.correo, u.nombre, u.carnet, u.idRol, u.rolGlobal, u.pais, u.idOrg, u.cargo, u.departamento,
            c.passwordHash,
            r.nombre AS rolNombre,
            r.descripcion AS rolDescripcion,
            r.esSistema,
            r.reglas,
            r.defaultMenu
        FROM p_Usuarios u
        LEFT JOIN p_UsuariosCredenciales c ON u.idUsuario = c.idUsuario
        LEFT JOIN p_Roles r ON u.idRol = r.idRol
        WHERE u.idUsuario = @P1";

    client
        .query(query, &[&user_id])
        .await
        .map_err(|error| error.to_string())?
        .into_first_result()
        .await
        .map_err(|error| error.to_string())
        .map(|rows| rows.into_iter().next().map(map_user_row))
}

async fn load_password_hash(client: &mut SqlConnection<'_>, user_id: i32) -> Result<Option<String>, String> {
    client
        .query(
            "SELECT passwordHash FROM p_UsuariosCredenciales WHERE idUsuario = @P1",
            &[&user_id],
        )
        .await
        .map_err(|error| error.to_string())?
        .into_first_result()
        .await
        .map_err(|error| error.to_string())
        .map(|rows| {
            rows.into_iter().next().and_then(|row| {
                row.try_get::<&str, _>("passwordHash")
                    .ok()
                    .flatten()
                    .map(|value| value.to_string())
            })
        })
}

async fn load_refresh_token_hash(client: &mut SqlConnection<'_>, user_id: i32) -> Result<Option<String>, String> {
    client
        .query(
            "SELECT refreshTokenHash FROM p_UsuariosCredenciales WHERE idUsuario = @P1",
            &[&user_id],
        )
        .await
        .map_err(|error| error.to_string())?
        .into_first_result()
        .await
        .map_err(|error| error.to_string())
        .map(|rows| {
            rows.into_iter().next().and_then(|row| {
                row.try_get::<&str, _>("refreshTokenHash")
                    .ok()
                    .flatten()
                    .map(|value| value.to_string())
            })
        })
}

async fn load_subordinate_count(client: &mut SqlConnection<'_>, user: &UserRow) -> Result<u32, String> {
    let carnet = user.carnet.clone().unwrap_or_default();
    if carnet.is_empty() {
        return Ok(0);
    }

    client
        .query(
            "SELECT COUNT(*) AS cnt FROM p_Usuarios WHERE jefeCarnet = @P1 AND activo = 1",
            &[&carnet],
        )
        .await
        .map_err(|error| error.to_string())?
        .into_first_result()
        .await
        .map_err(|error| error.to_string())
        .map(|rows| {
            rows.into_iter()
                .next()
                .and_then(|row| {
                    row.try_get::<i32, _>("cnt")
                        .ok()
                        .flatten()
                        .or_else(|| row.try_get::<i64, _>("cnt").ok().flatten().map(|value| value as i32))
                })
                .unwrap_or(0) as u32
        })
}

async fn resolve_menu_config(
    client: &mut SqlConnection<'_>,
    user: &UserRow,
    subordinate_count: u32,
) -> Option<serde_json::Value> {
    if let Ok(stream) = client
        .query(
            "SELECT menuPersonalizado FROM p_UsuariosConfig WHERE idUsuario = @P1",
            &[&user.id_usuario],
        )
        .await
    {
        if let Ok(rows) = stream.into_first_result().await {
            if let Some(row) = rows.into_iter().next() {
                if let Some(custom_menu) = row
                    .try_get::<&str, _>("menuPersonalizado")
                    .ok()
                    .flatten()
                {
                    if let Some(parsed) = parse_menu_json(custom_menu) {
                        return Some(parsed);
                    }
                }
            }
        }
    }

    if subordinate_count > 0 {
        return Some(serde_json::json!({
            "profileType": "LEADER",
            "subordinateCount": subordinate_count,
        }));
    }

    if let Some(default_menu) = user.rol_default_menu.as_deref() {
        if let Some(parsed) = parse_menu_json(default_menu) {
            return Some(parsed);
        }
    }

    Some(serde_json::json!({
        "profileType": "EMPLOYEE"
    }))
}

fn issue_tokens(jwt_secret: &str, user: &UserRow) -> Result<TokenPair, String> {
    let now = chrono::Utc::now().timestamp() as usize;
    let access_claims = crate::auth::Claims {
        sub: user.id_usuario,
        correo: user.correo.clone(),
        user_id: user.id_usuario,
        carnet: user.carnet.clone(),
        nombre: Some(user.nombre.clone()),
        id_rol: user.id_rol,
        rol: user.rol_global.clone(),
        pais: user.pais.clone(),
        exp: now + 12 * 3600,
    };
    let refresh_claims = crate::auth::Claims {
        sub: user.id_usuario,
        correo: user.correo.clone(),
        user_id: user.id_usuario,
        carnet: user.carnet.clone(),
        nombre: Some(user.nombre.clone()),
        id_rol: user.id_rol,
        rol: user.rol_global.clone(),
        pais: user.pais.clone(),
        exp: now + 7 * 24 * 3600,
    };

    let key = EncodingKey::from_secret(jwt_secret.as_bytes());
    let access_token = encode(&Header::default(), &access_claims, &key)
        .map_err(|error| error.to_string())?;
    let refresh_token = encode(&Header::default(), &refresh_claims, &key)
        .map_err(|error| error.to_string())?;

    Ok(TokenPair {
        access_token,
        refresh_token,
    })
}

fn decode_refresh_claims(jwt_secret: &str, refresh_token: &str) -> Result<crate::auth::Claims, Response> {
    let key = jsonwebtoken::DecodingKey::from_secret(jwt_secret.as_bytes());
    let mut validation = jsonwebtoken::Validation::new(jsonwebtoken::Algorithm::HS256);
    validation.validate_exp = true;

    jsonwebtoken::decode::<crate::auth::Claims>(refresh_token, &key, &validation)
        .map(|data| data.claims)
        .map_err(|error| {
            tracing::warn!("Invalid refresh token: {:?}", error);
            invalid_credentials_response("Invalid Refresh Token")
        })
}

fn map_user_row(row: Row) -> UserRow {
    UserRow {
        id_usuario: row.try_get::<i32, _>("idUsuario").ok().flatten().unwrap_or(0) as i64,
        correo: row
            .try_get::<&str, _>("correo")
            .ok()
            .flatten()
            .unwrap_or("")
            .to_string(),
        nombre: row
            .try_get::<&str, _>("nombre")
            .ok()
            .flatten()
            .unwrap_or("")
            .to_string(),
        carnet: row
            .try_get::<&str, _>("carnet")
            .ok()
            .flatten()
            .map(|value| value.to_string()),
        id_rol: row.try_get::<i32, _>("idRol").ok().flatten(),
        rol_nombre: row
            .try_get::<&str, _>("rolNombre")
            .ok()
            .flatten()
            .map(|value| value.to_string()),
        rol_descripcion: row
            .try_get::<&str, _>("rolDescripcion")
            .ok()
            .flatten()
            .map(|value| value.to_string()),
        rol_es_sistema: row.try_get::<bool, _>("esSistema").ok().flatten(),
        rol_reglas: row
            .try_get::<&str, _>("reglas")
            .ok()
            .flatten()
            .map(|value| value.to_string()),
        rol_default_menu: row
            .try_get::<&str, _>("defaultMenu")
            .ok()
            .flatten()
            .map(|value| value.to_string()),
        rol_global: row
            .try_get::<&str, _>("rolGlobal")
            .ok()
            .flatten()
            .map(|value| value.to_string()),
        pais: row
            .try_get::<&str, _>("pais")
            .ok()
            .flatten()
            .map(|value| value.to_string()),
        id_org: row
            .try_get::<f64, _>("idOrg")
            .ok()
            .flatten()
            .or_else(|| row.try_get::<i32, _>("idOrg").ok().flatten().map(|value| value as f64))
            .or_else(|| row.try_get::<i64, _>("idOrg").ok().flatten().map(|value| value as f64)),
        cargo: row
            .try_get::<&str, _>("cargo")
            .ok()
            .flatten()
            .map(|value| value.to_string()),
        departamento: row
            .try_get::<&str, _>("departamento")
            .ok()
            .flatten()
            .map(|value| value.to_string()),
        password_hash: row
            .try_get::<&str, _>("passwordHash")
            .ok()
            .flatten()
            .map(|value| value.to_string()),
    }
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub correo: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub user: LoginUser,
}

#[derive(Serialize)]
pub struct LoginUser {
    #[serde(rename = "idUsuario")]
    pub id_usuario: i64,
    pub nombre: String,
    pub correo: String,
    pub carnet: Option<String>,
    pub rol: Option<serde_json::Value>,
    #[serde(rename = "rolGlobal")]
    pub rol_global: Option<String>,
    pub pais: Option<String>,
    #[serde(rename = "idOrg")]
    pub id_org: Option<serde_json::Value>,
    pub cargo: Option<String>,
    pub departamento: Option<String>,
    #[serde(rename = "subordinateCount")]
    pub subordinate_count: u32,
    #[serde(rename = "menuConfig")]
    pub menu_config: Option<serde_json::Value>,
}

pub struct UserRow {
    pub id_usuario: i64,
    pub correo: String,
    pub nombre: String,
    pub carnet: Option<String>,
    pub id_rol: Option<i32>,
    pub rol_nombre: Option<String>,
    pub rol_descripcion: Option<String>,
    pub rol_es_sistema: Option<bool>,
    pub rol_reglas: Option<String>,
    pub rol_default_menu: Option<String>,
    pub rol_global: Option<String>,
    pub pais: Option<String>,
    pub id_org: Option<f64>,
    pub cargo: Option<String>,
    pub departamento: Option<String>,
    pub password_hash: Option<String>,
}

struct TokenPair {
    access_token: String,
    refresh_token: String,
}

#[derive(Deserialize)]
pub struct RefreshRequest {
    #[serde(rename = "refreshToken", alias = "refresh_token")]
    pub refresh_token: String,
}

#[derive(Deserialize)]
pub struct ChangePasswordRequest {
    #[serde(rename = "oldPassword", alias = "old_password")]
    pub old_password: String,
    #[serde(rename = "newPassword", alias = "new_password")]
    pub new_password: String,
    #[serde(rename = "userId")]
    pub user_id: Option<i32>,
}

#[derive(Deserialize)]
pub struct UpdateConfigRequest {
    #[serde(flatten)]
    pub config: serde_json::Value,
}
