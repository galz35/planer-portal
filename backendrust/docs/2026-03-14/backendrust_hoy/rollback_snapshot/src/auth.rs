use serde::{Deserialize, Serialize};
use axum::{
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
    response::{IntoResponse, Response},
    Json,
};

/// Claims del JWT, tanto para access como refresh tokens.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: i64, // userId
    pub correo: String,
    #[serde(rename = "userId")]
    pub user_id: i64,
    pub carnet: Option<String>,
    pub nombre: Option<String>,
    #[serde(rename = "idRol")]
    pub id_rol: Option<i32>,
    pub rol: Option<String>,
    pub pais: Option<String>,
    pub exp: usize,
}

/// Extractor de Axum que valida JWT y extrae los claims del usuario autenticado.
///
/// Uso en handlers:
/// ```rust
/// pub async fn mi_handler(user: AuthUser, State(state): State<ApiState>) -> impl IntoResponse {
///     let carnet = user.carnet(); // "500708"
///     let user_id = user.user_id(); // 23
/// }
/// ```
///
/// Para endpoints opcionales (donde el auth es opcional):
/// ```rust
/// pub async fn public_handler(user: Option<AuthUser>) -> impl IntoResponse { ... }
/// ```
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub claims: Claims,
}

impl AuthUser {
    /// Carnet del usuario autenticado, con fallback a "UNKNOWN"
    pub fn carnet(&self) -> &str {
        self.claims.carnet.as_deref().unwrap_or("UNKNOWN")
    }

    /// ID numérico del usuario
    pub fn user_id(&self) -> i64 {
        self.claims.sub
    }

    /// User ID como i32 (para queries SQL Server que usan INT)
    pub fn user_id_i32(&self) -> i32 {
        self.claims.sub as i32
    }

    /// Correo del usuario
    pub fn correo(&self) -> &str {
        &self.claims.correo
    }

    /// País detectado
    pub fn pais(&self) -> &str {
        self.claims.pais.as_deref().unwrap_or("UNKNOWN")
    }

    /// Rol global
    pub fn rol(&self) -> &str {
        self.claims.rol.as_deref().unwrap_or("user")
    }

    /// ¿Es admin?
    pub fn is_admin(&self) -> bool {
        matches!(self.rol(), "admin" | "Admin" | "ADMIN" | "superadmin")
    }

    /// ID del rol
    pub fn id_rol(&self) -> i32 {
        self.claims.id_rol.unwrap_or(0)
    }
}

/// Error de autenticación
pub struct AuthError {
    message: String,
    status: StatusCode,
}

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(crate::models::ApiResponse::error(
                self.message,
                self.status.as_u16(),
            )),
        )
            .into_response()
    }
}

/// Implementación del extractor FromRequestParts para Axum.
/// Esto intercepta cada request, busca el header Authorization,
/// decodifica el JWT y pone AuthUser disponible en el handler.
#[axum::async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = AuthError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        // 1. Buscar header Authorization
        let auth_header = parts
            .headers
            .get("Authorization")
            .and_then(|v| v.to_str().ok())
            .ok_or_else(|| AuthError {
                message: "Token de autenticación requerido".to_string(),
                status: StatusCode::UNAUTHORIZED,
            })?;

        // 2. Extraer "Bearer <token>"
        let token = auth_header
            .strip_prefix("Bearer ")
            .or_else(|| auth_header.strip_prefix("bearer "))
            .ok_or_else(|| AuthError {
                message: "Formato de token inválido. Use: Bearer <token>".to_string(),
                status: StatusCode::UNAUTHORIZED,
            })?;

        // 3. Obtener jwt_secret del state (lo ponemos en extensions durante la creación del router)
        let jwt_secret = parts
            .extensions
            .get::<JwtSecret>()
            .map(|s| s.0.clone())
            .ok_or_else(|| AuthError {
                message: "JWT secret no configurado".to_string(),
                status: StatusCode::INTERNAL_SERVER_ERROR,
            })?;

        // 4. Decodificar y validar JWT
        let key = jsonwebtoken::DecodingKey::from_secret(jwt_secret.as_bytes());
        let mut validation = jsonwebtoken::Validation::new(jsonwebtoken::Algorithm::HS256);
        validation.validate_exp = true;

        let token_data = jsonwebtoken::decode::<Claims>(token, &key, &validation)
            .map_err(|e| {
                let msg = match e.kind() {
                    jsonwebtoken::errors::ErrorKind::ExpiredSignature => {
                        "Token expirado. Por favor inicie sesión nuevamente."
                    }
                    jsonwebtoken::errors::ErrorKind::InvalidToken => {
                        "Token inválido."
                    }
                    jsonwebtoken::errors::ErrorKind::InvalidSignature => {
                        "Firma del token inválida."
                    }
                    _ => "Error de autenticación.",
                };
                AuthError {
                    message: msg.to_string(),
                    status: StatusCode::UNAUTHORIZED,
                }
            })?;

        Ok(AuthUser {
            claims: token_data.claims,
        })
    }
}

/// Wrapper para pasar jwt_secret a los extractors via extensions
#[derive(Clone)]
pub struct JwtSecret(pub String);
