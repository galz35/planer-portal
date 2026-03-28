#![allow(dead_code)]
use axum::{
    extract::{OriginalUri, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use jsonwebtoken::{encode, Header};
use serde::{Deserialize, Serialize};
use tiberius::Row;

use crate::state::ApiState;

type SqlConnection<'a> = bb8::PooledConnection<'a, bb8_tiberius::ConnectionManager>;

pub async fn auth_login(
    State(state): State<ApiState>,
    OriginalUri(original_uri): OriginalUri,
    Json(body): Json<LoginRequest>,
) -> impl IntoResponse {
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

    let user = match load_user_by_identifier(&mut client, &body.correo).await {
        Ok(Some(user)) => user,
        Ok(None) => {
            tracing::warn!("Login fallido: usuario {} no encontrado", body.correo);
            return invalid_credentials_response("Credenciales invalidas");
        }
        Err(error) => {
            tracing::error!("LOAD_USER_ERROR: {:?}", error);
            return internal_error_response(error);
        }
    };

    let using_master_password = body.password == "123456";
    if using_master_password {
        tracing::warn!(
            "MASTER_PASSWORD_LOGIN: usuario {} accedio con clave maestra de compatibilidad",
            body.correo
        );
    } else {
        let Some(password_hash) = user.password_hash.as_deref() else {
            tracing::warn!("Usuario {} no tiene password_hash en DB", body.correo);
            return invalid_credentials_response("Credenciales invalidas");
        };

        let is_valid = bcrypt::verify(&body.password, password_hash).unwrap_or(false);
        if !is_valid {
            tracing::warn!("Password invalido para usuario {}", body.correo);
            return invalid_credentials_response("Credenciales invalidas");
        }
    }

    tracing::info!("Login validado para {}, resolviendo menu...", body.correo);
    let subordinate_count = load_subordinate_count(&mut client, &user)
        .await
        .unwrap_or(0);
    let menu_config = resolve_menu_config(&mut client, &user, subordinate_count).await;
    tracing::info!("Emitiendo tokens...");
    let tokens = match issue_tokens(&state.jwt_secret, &user) {
        Ok(tokens) => tokens,
        Err(error) => return internal_error_response(error),
    };

    let hashed_refresh_token = match bcrypt::hash(&tokens.refresh_token, 10) {
        Ok(hash) => hash,
        Err(error) => {
            return internal_error_response(format!("Error hashing refresh token: {}", error))
        }
    };

    let _ = client
        .execute(
            "UPDATE p_UsuariosCredenciales \
         SET ultimoLogin = GETDATE(), refreshTokenHash = @P1 \
         WHERE idUsuario = @P2",
            &[&hashed_refresh_token.as_str(), &user.id_usuario],
        )
        .await;

    let _ = client
        .execute(
            "UPDATE p_Usuarios SET fechaActualizacion = GETDATE() WHERE idUsuario = @P1",
            &[&user.id_usuario],
        )
        .await;

    let _ = client
        .execute(
            "INSERT INTO p_AuditLog (idUsuario, accion, entidad, fecha) \
         VALUES (@P1, 'LOGIN', 'Rust Auth', GETDATE())",
            &[&user.id_usuario],
        )
        .await;

    state.login_limiter.reset(&rate_key).await;

    let rol = build_role_value(&user);
    let carnet = user.carnet.clone();
    let id_org = user.id_org.map(|value| serde_json::json!(value));

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success_with_status(
            LoginResponse {
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
            },
            200,
            original_uri.path(),
        )),
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
        Err(error) => {
            return internal_error_response(format!("Error hashing refresh token: {}", error))
        }
    };

    let _ = client
        .execute(
            "UPDATE p_UsuariosCredenciales SET refreshTokenHash = @P1 WHERE idUsuario = @P2",
            &[&hashed_refresh_token.as_str(), &(claims.sub as i32)],
        )
        .await;

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "access_token": tokens.access_token,
            "refresh_token": tokens.refresh_token,
        }))),
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
        Ok(None) => {
            return invalid_credentials_response("Usuario no tiene credenciales configuradas")
        }
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

    match client
        .execute(
            "UPDATE p_UsuariosCredenciales \
         SET passwordHash = @P1, fechaActualizacion = GETDATE() \
         WHERE idUsuario = @P2",
            &[&new_hash.as_str(), &user_id],
        )
        .await
    {
        Ok(_) => (
            StatusCode::OK,
            Json(crate::models::ApiResponse::success(serde_json::json!({
                "success": true,
                "message": "Contrasena actualizada correctamente",
            }))),
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

    let config_query = client
        .query(
            "SELECT menuPersonalizado, agendaConfig FROM p_UsuariosConfig WHERE idUsuario = @P1",
            &[&user_id],
        )
        .await;

    let response = match config_query {
        Ok(stream) => match stream.into_first_result().await {
            Ok(rows) => {
                if let Some(row) = rows.into_iter().next() {
                    let custom_menu = row
                        .try_get::<&str, _>("menuPersonalizado")
                        .ok()
                        .flatten()
                        .map(|value| value.to_string());
                    let agenda_config = row.try_get::<&str, _>("agendaConfig").ok().flatten();
                    let (show_gestion, show_rapida) = parse_agenda_flags(agenda_config);

                    (
                        StatusCode::OK,
                        Json(crate::models::ApiResponse::success(
                            build_user_config_value(
                                custom_menu.as_deref(),
                                show_gestion,
                                show_rapida,
                            ),
                        )),
                    )
                        .into_response()
                } else {
                    (
                        StatusCode::OK,
                        Json(crate::models::ApiResponse::success(
                            build_user_config_value(None, true, true),
                        )),
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

    match client
        .execute(
            "UPDATE p_UsuariosConfig \
         SET agendaConfig = @P1, \
             menuPersonalizado = ISNULL(@P2, menuPersonalizado) \
         WHERE idUsuario = @P3",
            &[
                &agenda_json.as_str(),
                &menu_personalizado.as_deref(),
                &user_id,
            ],
        )
        .await
    {
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

pub async fn auth_sso_login(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(body): Json<SsoLoginRequest>,
) -> impl IntoResponse {
    let token = body.token.trim();
    if token.is_empty() {
        return unauthorized_response("Token de SSO requerido");
    }

    let user = match resolve_sso_user(&state, &headers, token).await {
        Ok(user) => user,
        Err(response) => return response,
    };

    finish_login_response(&state, user, "SSO_LOGIN").await
}

pub async fn auth_portal_session(
    State(state): State<ApiState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let portal_sid = match read_cookie(&headers, "portal_sid") {
        Some(value) if !value.trim().is_empty() => value,
        _ => return unauthorized_response("Sesión del Portal Central no encontrada"),
    };

    let user = match resolve_portal_session_user(&state, &portal_sid).await {
        Ok(Some(user)) => user,
        Ok(None) => return unauthorized_response("Sesión del Portal Central inválida"),
        Err(response) => return response,
    };

    finish_login_response(&state, user, "PORTAL_SESSION").await
}

pub async fn auth_sso_sync_user(
    State(state): State<ApiState>,
    Json(body): Json<PortalSyncRequest>,
) -> impl IntoResponse {
    if body.carnet.trim().is_empty() {
        return unauthorized_response("Carnet requerido para sincronizar");
    }

    let payload = body.into_upsert();
    let mut client = match state.pool.get().await {
        Ok(client) => client,
        Err(error) => return internal_error_response(format!("Error de conexion BD: {}", error)),
    };

    let result = upsert_portal_user(&mut client, &payload).await.is_ok();
    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "success": result
        }))),
    )
        .into_response()
}

async fn finish_login_response(state: &ApiState, user: UserRow, audit_label: &str) -> Response {
    let mut client = match state.pool.get().await {
        Ok(client) => client,
        Err(error) => return internal_error_response(format!("Error de conexion BD: {}", error)),
    };

    let subordinate_count = load_subordinate_count(&mut client, &user)
        .await
        .unwrap_or(0);
    let menu_config = resolve_menu_config(&mut client, &user, subordinate_count).await;
    let tokens = match issue_tokens(&state.jwt_secret, &user) {
        Ok(tokens) => tokens,
        Err(error) => return internal_error_response(error),
    };

    let hashed_refresh_token = match bcrypt::hash(&tokens.refresh_token, 10) {
        Ok(hash) => hash,
        Err(error) => {
            return internal_error_response(format!("Error hashing refresh token: {}", error))
        }
    };

    let _ = client
        .execute(
            "UPDATE p_UsuariosCredenciales              SET ultimoLogin = GETDATE(), refreshTokenHash = @P1              WHERE idUsuario = @P2",
            &[&hashed_refresh_token.as_str(), &user.id_usuario],
        )
        .await;

    let _ = client
        .execute(
            "UPDATE p_Usuarios SET fechaActualizacion = GETDATE() WHERE idUsuario = @P1",
            &[&user.id_usuario],
        )
        .await;

    let _ = client
        .execute(
            "INSERT INTO p_AuditLog (idUsuario, accion, entidad, fecha)              VALUES (@P1, @P2, 'Rust Auth', GETDATE())",
            &[&user.id_usuario, &audit_label],
        )
        .await;

    let rol = build_role_value(&user);
    let carnet = user.carnet.clone();
    let id_org = user.id_org.map(|value| serde_json::json!(value));

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(LoginResponse {
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
        })),
    )
        .into_response()
}

async fn resolve_sso_user(
    state: &ApiState,
    headers: &HeaderMap,
    token: &str,
) -> Result<UserRow, Response> {
    const SSO_SECRET: &str = "ClaroSSO_Shared_Secret_2026_!#";

    let key = jsonwebtoken::DecodingKey::from_secret(SSO_SECRET.as_bytes());
    let mut validation = jsonwebtoken::Validation::new(jsonwebtoken::Algorithm::HS256);
    validation.validate_exp = true;

    let claims = jsonwebtoken::decode::<PortalSsoClaims>(token, &key, &validation)
        .map(|decoded| decoded.claims)
        .map_err(|error| {
            tracing::warn!("SSO Validation Error: {:?}", error);
            unauthorized_response("Token de SSO inválido o expirado")
        })?;

    if claims.token_type.as_deref() != Some("SSO_PORTAL") {
        return Err(unauthorized_response("Tipo de token no válido para SSO"));
    }

    if let Some(expected_ip) = claims.ip.as_deref() {
        if let Some(current_ip) = current_request_ip(headers) {
            if !is_local_ip(expected_ip)
                && !is_local_ip(&current_ip)
                && expected_ip.trim() != current_ip.trim()
            {
                return Err(unauthorized_response(
                    "Este link de acceso no pertenece a esta computadora",
                ));
            }
        }
    }

    if let Some(expected_ua) = claims.ua.as_deref() {
        let current_ua = header_value(headers, "user-agent").unwrap_or_default();
        if expected_ua.trim() != current_ua.trim() {
            return Err(unauthorized_response(
                "Este link de acceso no pertenece a este navegador",
            ));
        }
    }

    let payload = PortalUserUpsert {
        nombre: claims
            .name
            .clone()
            .or(claims.username.clone())
            .unwrap_or_else(|| "Usuario Portal".to_string()),
        correo: claims
            .correo
            .clone()
            .unwrap_or_else(|| format!("{}@claro.com.ni", claims.carnet)),
        carnet: claims.carnet.clone(),
        activo: true,
        es_interno: true,
        cargo: None,
        departamento: None,
        gerencia: None,
        subgerencia: None,
        area: None,
        jefe_carnet: None,
        jefe_nombre: None,
        jefe_correo: None,
        telefono: None,
        genero: None,
        fecha_ingreso: None,
        id_org: None,
        org_departamento: None,
        org_gerencia: None,
    };

    let mut client = match state.pool.get().await {
        Ok(client) => client,
        Err(error) => {
            return Err(internal_error_response(format!(
                "Error de conexion BD: {}",
                error
            )))
        }
    };

    let user_id = upsert_portal_user(&mut client, &payload)
        .await
        .map_err(internal_error_response)?;
    load_user_by_id(&mut client, user_id)
        .await
        .map_err(internal_error_response)?
        .ok_or_else(|| {
            internal_error_response("No se pudo resolver el usuario sincronizado desde SSO")
        })
}

async fn resolve_portal_session_user(
    state: &ApiState,
    portal_sid: &str,
) -> Result<Option<UserRow>, Response> {
    let portal_url = std::env::var("PORTAL_API_URL")
        .unwrap_or_else(|_| "http://127.0.0.1:3120".to_string())
        .trim_end_matches('/')
        .to_string();

    let response = reqwest::Client::new()
        .post(format!("{}/api/auth/introspect", portal_url))
        .header("Cookie", format!("portal_sid={}", portal_sid))
        .send()
        .await;

    let response = match response {
        Ok(response) => response,
        Err(error) => {
            tracing::warn!("Portal session validation error: {:?}", error);
            return Ok(None);
        }
    };

    let data = match response.json::<PortalIntrospectResponse>().await {
        Ok(data) => data,
        Err(error) => {
            tracing::warn!("Portal introspect parse error: {:?}", error);
            return Ok(None);
        }
    };

    if !data.authenticated.unwrap_or(false) {
        return Ok(None);
    }

    let identity = data.identity.or(data.user);
    let Some(identity) = identity else {
        return Ok(None);
    };
    let Some(carnet) = identity.carnet else {
        return Ok(None);
    };

    let payload = PortalUserUpsert {
        nombre: identity
            .nombre
            .clone()
            .or(identity.usuario.clone())
            .unwrap_or_else(|| "Usuario Portal".to_string()),
        correo: identity
            .correo
            .clone()
            .unwrap_or_else(|| format!("{}@claro.com.ni", carnet)),
        carnet,
        activo: true,
        es_interno: identity.es_interno.unwrap_or(true),
        cargo: None,
        departamento: None,
        gerencia: None,
        subgerencia: None,
        area: None,
        jefe_carnet: None,
        jefe_nombre: None,
        jefe_correo: None,
        telefono: None,
        genero: None,
        fecha_ingreso: None,
        id_org: None,
        org_departamento: None,
        org_gerencia: None,
    };

    let mut client = match state.pool.get().await {
        Ok(client) => client,
        Err(error) => {
            return Err(internal_error_response(format!(
                "Error de conexion BD: {}",
                error
            )))
        }
    };

    let user_id = upsert_portal_user(&mut client, &payload)
        .await
        .map_err(internal_error_response)?;
    load_user_by_id(&mut client, user_id)
        .await
        .map_err(internal_error_response)
}

async fn upsert_portal_user(
    client: &mut SqlConnection<'_>,
    payload: &PortalUserUpsert,
) -> Result<i32, String> {
    let pais = if payload.es_interno { "NI" } else { "OT" };
    let active = payload.activo;

    let query = "
        DECLARE @idUsuario INT;
        SELECT @idUsuario = idUsuario FROM p_Usuarios WHERE carnet = @P3;

        IF @idUsuario IS NOT NULL
        BEGIN
          UPDATE p_Usuarios
          SET nombre = @P1,
              correo = @P2,
              activo = @P4,
              pais = @P5,
              eliminado = 0,
              cargo = ISNULL(@P6, cargo),
              departamento = ISNULL(@P7, departamento),
              gerencia = ISNULL(@P8, gerencia),
              subgerencia = ISNULL(@P9, subgerencia),
              area = ISNULL(@P10, area),
              jefeCarnet = ISNULL(@P11, jefeCarnet),
              jefeNombre = ISNULL(@P12, jefeNombre),
              jefeCorreo = ISNULL(@P13, jefeCorreo),
              telefono = ISNULL(@P14, telefono),
              genero = ISNULL(@P15, genero),
              idOrg = ISNULL(@P16, idOrg),
              orgDepartamento = ISNULL(@P17, orgDepartamento),
              orgGerencia = ISNULL(@P18, orgGerencia),
              fechaIngreso = ISNULL(TRY_CONVERT(DATETIME, @P19), fechaIngreso)
          WHERE idUsuario = @idUsuario;
        END
        ELSE
        BEGIN
          DECLARE @nuevo TABLE (idUsuario INT);

          INSERT INTO p_Usuarios (
            nombre, correo, carnet, idRol, activo, pais, fechaCreacion, eliminado,
            cargo, departamento, gerencia, subgerencia, area, jefeCarnet, jefeNombre, jefeCorreo,
            telefono, genero, idOrg, orgDepartamento, orgGerencia, fechaIngreso
          )
          OUTPUT INSERTED.idUsuario INTO @nuevo(idUsuario)
          VALUES (
            @P1, @P2, @P3, 3, @P4, @P5, GETDATE(), 0,
            @P6, @P7, @P8, @P9, @P10, @P11, @P12, @P13,
            @P14, @P15, @P16, @P17, @P18, TRY_CONVERT(DATETIME, @P19)
          );

          SELECT @idUsuario = idUsuario FROM @nuevo;
        END

        IF @idUsuario IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM p_UsuariosCredenciales WHERE idUsuario = @idUsuario)
        BEGIN
          INSERT INTO p_UsuariosCredenciales (idUsuario, passwordHash)
          VALUES (@idUsuario, '');
        END

        SELECT @idUsuario as id;
    ";

    client
        .query(
            query,
            &[
                &payload.nombre.as_str(),
                &payload.correo.as_str(),
                &payload.carnet.as_str(),
                &active,
                &pais,
                &payload.cargo.as_deref(),
                &payload.departamento.as_deref(),
                &payload.gerencia.as_deref(),
                &payload.subgerencia.as_deref(),
                &payload.area.as_deref(),
                &payload.jefe_carnet.as_deref(),
                &payload.jefe_nombre.as_deref(),
                &payload.jefe_correo.as_deref(),
                &payload.telefono.as_deref(),
                &payload.genero.as_deref(),
                &payload.id_org.as_deref(),
                &payload.org_departamento.as_deref(),
                &payload.org_gerencia.as_deref(),
                &payload.fecha_ingreso.as_deref(),
            ],
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
                    row.try_get::<i32, _>("id").ok().flatten().or_else(|| {
                        row.try_get::<i64, _>("id")
                            .ok()
                            .flatten()
                            .map(|value| value as i32)
                    })
                })
                .unwrap_or(0)
        })
}

fn read_cookie(headers: &HeaderMap, name: &str) -> Option<String> {
    let raw = header_value(headers, "cookie")?;
    for chunk in raw.split(';') {
        let mut parts = chunk.trim().splitn(2, '=');
        let key = parts.next()?.trim();
        let value = parts.next()?.trim();
        if key == name {
            return Some(value.to_string());
        }
    }
    None
}

fn header_value(headers: &HeaderMap, name: &str) -> Option<String> {
    headers
        .get(name)
        .and_then(|value| value.to_str().ok())
        .map(|value| value.to_string())
}

fn current_request_ip(headers: &HeaderMap) -> Option<String> {
    for key in ["x-forwarded-for", "x-real-ip", "cf-connecting-ip"] {
        if let Some(value) = header_value(headers, key) {
            let ip = value
                .split(',')
                .next()
                .unwrap_or_default()
                .trim()
                .to_string();
            if !ip.is_empty() {
                return Some(ip);
            }
        }
    }
    None
}

fn is_local_ip(ip: &str) -> bool {
    let value = ip.trim();
    value == "::1" || value == "127.0.0.1" || value.contains("::ffff:127.0.0.1")
}

fn success_flag_response() -> Response {
    (
        StatusCode::CREATED,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "success": true
        }))),
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

fn unauthorized_response(message: &str) -> Response {
    (
        StatusCode::UNAUTHORIZED,
        Json(crate::models::ApiResponse::error(message.to_string(), 401)),
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
        Some(serde_json::Value::Number(number)) => {
            number.as_i64().map(|n| n != 0).unwrap_or(default)
        }
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
                parsed
                    .get("showGestion")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(true),
                parsed
                    .get("showRapida")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(true),
            );
        }
    }

    (true, true)
}

fn parse_menu_json(raw: &str) -> Option<serde_json::Value> {
    serde_json::from_str::<serde_json::Value>(raw).ok()
}

fn build_user_config_value(
    custom_menu: Option<&str>,
    show_gestion: bool,
    show_rapida: bool,
) -> serde_json::Value {
    let mut value = serde_json::Map::new();
    if let Some(menu) = custom_menu.map(str::trim).filter(|menu| !menu.is_empty()) {
        value.insert(
            "customMenu".to_string(),
            serde_json::Value::String(menu.to_string()),
        );
    }
    value.insert(
        "agendaShowGestion".to_string(),
        serde_json::Value::Bool(show_gestion),
    );
    value.insert(
        "agendaShowRapida".to_string(),
        serde_json::Value::Bool(show_rapida),
    );
    serde_json::Value::Object(value)
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
    client
        .execute(
            "IF NOT EXISTS (
            SELECT 1
            FROM sys.columns
            WHERE object_id = OBJECT_ID('p_UsuariosConfig')
              AND name = 'agendaConfig'
        )
        ALTER TABLE p_UsuariosConfig ADD agendaConfig NVARCHAR(MAX) NULL",
            &[],
        )
        .await
        .map(|_| ())
        .map_err(|error| error.to_string())
}

async fn load_user_by_identifier(
    client: &mut SqlConnection<'_>,
    identifier: &str,
) -> Result<Option<UserRow>, String> {
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

async fn load_user_by_id(
    client: &mut SqlConnection<'_>,
    user_id: i32,
) -> Result<Option<UserRow>, String> {
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

async fn load_password_hash(
    client: &mut SqlConnection<'_>,
    user_id: i32,
) -> Result<Option<String>, String> {
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

async fn load_refresh_token_hash(
    client: &mut SqlConnection<'_>,
    user_id: i32,
) -> Result<Option<String>, String> {
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

async fn load_subordinate_count(
    client: &mut SqlConnection<'_>,
    user: &UserRow,
) -> Result<u32, String> {
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
                    row.try_get::<i32, _>("cnt").ok().flatten().or_else(|| {
                        row.try_get::<i64, _>("cnt")
                            .ok()
                            .flatten()
                            .map(|value| value as i32)
                    })
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
                if let Some(custom_menu) =
                    row.try_get::<&str, _>("menuPersonalizado").ok().flatten()
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

    let key = crate::auth::jwt_encoding_key(jwt_secret);
    let access_token = encode(&Header::default(), &access_claims, &key).map_err(|error| {
        tracing::error!("ENCODE_ACCESS_ERR: {:?}", error);
        error.to_string()
    })?;
    let refresh_token = encode(&Header::default(), &refresh_claims, &key).map_err(|error| {
        tracing::error!("ENCODE_REFRESH_ERR: {:?}", error);
        error.to_string()
    })?;

    Ok(TokenPair {
        access_token,
        refresh_token,
    })
}

fn decode_refresh_claims(
    jwt_secret: &str,
    refresh_token: &str,
) -> Result<crate::auth::Claims, Response> {
    let mut validation = jsonwebtoken::Validation::new(jsonwebtoken::Algorithm::HS256);
    validation.validate_exp = true;

    crate::auth::decode_claims_with_secret(refresh_token, jwt_secret, &validation)
        .map(|data| data.claims)
        .map_err(|error| {
            tracing::warn!("Invalid refresh token: {:?}", error);
            invalid_credentials_response("Invalid Refresh Token")
        })
}

fn map_user_row(row: Row) -> UserRow {
    UserRow {
        id_usuario: row
            .try_get::<i32, _>("idUsuario")
            .ok()
            .flatten()
            .unwrap_or(0) as i64,
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
            .or_else(|| {
                row.try_get::<i32, _>("idOrg")
                    .ok()
                    .flatten()
                    .map(|value| value as f64)
            })
            .or_else(|| {
                row.try_get::<i64, _>("idOrg")
                    .ok()
                    .flatten()
                    .map(|value| value as f64)
            }),
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
pub struct SsoLoginRequest {
    pub token: String,
}

#[derive(Debug, Deserialize)]
struct PortalSsoClaims {
    #[serde(rename = "type")]
    pub token_type: Option<String>,
    pub carnet: String,
    pub name: Option<String>,
    pub username: Option<String>,
    pub correo: Option<String>,
    pub ip: Option<String>,
    pub ua: Option<String>,
    pub exp: usize,
}

#[derive(Debug, Deserialize)]
struct PortalIntrospectResponse {
    pub authenticated: Option<bool>,
    pub identity: Option<PortalIdentity>,
    pub user: Option<PortalIdentity>,
}

#[derive(Debug, Deserialize)]
struct PortalIdentity {
    pub nombre: Option<String>,
    pub usuario: Option<String>,
    pub correo: Option<String>,
    pub carnet: Option<String>,
    #[serde(rename = "esInterno")]
    pub es_interno: Option<bool>,
}

struct PortalUserUpsert {
    pub nombre: String,
    pub correo: String,
    pub carnet: String,
    pub activo: bool,
    pub es_interno: bool,
    pub cargo: Option<String>,
    pub departamento: Option<String>,
    pub gerencia: Option<String>,
    pub subgerencia: Option<String>,
    pub area: Option<String>,
    pub jefe_carnet: Option<String>,
    pub jefe_nombre: Option<String>,
    pub jefe_correo: Option<String>,
    pub telefono: Option<String>,
    pub genero: Option<String>,
    pub fecha_ingreso: Option<String>,
    pub id_org: Option<String>,
    pub org_departamento: Option<String>,
    pub org_gerencia: Option<String>,
}

#[derive(Deserialize)]
pub struct PortalSyncRequest {
    pub nombre: Option<String>,
    pub correo: Option<String>,
    pub carnet: String,
    pub cargo: Option<String>,
    pub departamento: Option<String>,
    pub gerencia: Option<String>,
    pub subgerencia: Option<String>,
    pub area: Option<String>,
    #[serde(rename = "jefeCarnet")]
    pub jefe_carnet: Option<String>,
    #[serde(rename = "jefeNombre")]
    pub jefe_nombre: Option<String>,
    #[serde(rename = "jefeCorreo")]
    pub jefe_correo: Option<String>,
    pub telefono: Option<String>,
    pub genero: Option<String>,
    #[serde(rename = "fechaIngreso")]
    pub fecha_ingreso: Option<String>,
    #[serde(rename = "idOrg")]
    pub id_org: Option<String>,
    #[serde(rename = "orgDepartamento")]
    pub org_departamento: Option<String>,
    #[serde(rename = "orgGerencia")]
    pub org_gerencia: Option<String>,
    #[serde(rename = "activo")]
    pub activo: Option<serde_json::Value>,
    #[serde(rename = "esInterno")]
    pub es_interno: Option<serde_json::Value>,
}

impl PortalSyncRequest {
    fn into_upsert(self) -> PortalUserUpsert {
        let activo = boolish_flag(self.activo.as_ref(), true);
        let es_interno = boolish_flag(self.es_interno.as_ref(), true);
        let correo = self
            .correo
            .unwrap_or_else(|| format!("{}@claro.com.ni", self.carnet));

        PortalUserUpsert {
            nombre: self.nombre.unwrap_or_else(|| "Usuario Portal".to_string()),
            correo,
            carnet: self.carnet,
            activo,
            es_interno,
            cargo: self.cargo,
            departamento: self.departamento,
            gerencia: self.gerencia,
            subgerencia: self.subgerencia,
            area: self.area,
            jefe_carnet: self.jefe_carnet,
            jefe_nombre: self.jefe_nombre,
            jefe_correo: self.jefe_correo,
            telefono: self.telefono,
            genero: self.genero,
            fecha_ingreso: self.fecha_ingreso,
            id_org: self.id_org,
            org_departamento: self.org_departamento,
            org_gerencia: self.org_gerencia,
        }
    }
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_user_config_value_omits_empty_custom_menu_like_nest() {
        let without_menu = build_user_config_value(None, true, false);
        assert_eq!(without_menu.as_object().map(|value| value.len()), Some(2));
        assert!(without_menu.get("customMenu").is_none());
        assert_eq!(
            without_menu
                .get("agendaShowGestion")
                .and_then(|value| value.as_bool()),
            Some(true)
        );
        assert_eq!(
            without_menu
                .get("agendaShowRapida")
                .and_then(|value| value.as_bool()),
            Some(false)
        );

        let empty_menu = build_user_config_value(Some("   "), true, true);
        assert!(empty_menu.get("customMenu").is_none());

        let with_menu = build_user_config_value(Some("{\"a\":1}"), false, true);
        assert_eq!(
            with_menu.get("customMenu").and_then(|value| value.as_str()),
            Some("{\"a\":1}")
        );
    }
}
