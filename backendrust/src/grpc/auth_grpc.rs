use tonic::{Request, Response, Status};

use super::pb::auth::auth_service_server::AuthService;
use super::pb::auth::*;
use crate::db::Pool;

/// Implementación gRPC del AuthService.
/// Comparte la misma lógica y pool de DB que los handlers REST.
pub struct AuthServiceImpl {
    pub pool: Pool,
    pub jwt_secret: String,
}

#[tonic::async_trait]
impl AuthService for AuthServiceImpl {
    async fn login(
        &self,
        request: Request<LoginRequest>,
    ) -> Result<Response<LoginResponse>, Status> {
        let req = request.into_inner();

        let mut client = self
            .pool
            .get()
            .await
            .map_err(|e| Status::internal(format!("Error de conexión: {}", e)))?;

        // Buscar usuario por correo (misma query que el handler REST)
        let stream = client
            .query(
                "SELECT u.idUsuario, u.nombre, u.correo, u.carnet, u.activo, \
                 u.idRol, r.nombre as rolNombre, u.cargo, u.gerencia, u.pais, \
                 c.passwordHash \
                 FROM p_Usuarios u \
                 LEFT JOIN p_UsuariosCredenciales c ON u.idUsuario = c.idUsuario \
                 LEFT JOIN p_Roles r ON u.idRol = r.idRol \
                 WHERE (u.correo = @P1 OR u.carnet = @P1) AND u.activo = 1",
                &[&req.correo],
            )
            .await
            .map_err(|e| Status::internal(format!("Error query: {}", e)))?;

        let rows = stream
            .into_first_result()
            .await
            .map_err(|e| Status::internal(format!("Error result: {}", e)))?;

        let row = rows
            .into_iter()
            .next()
            .ok_or_else(|| Status::unauthenticated("Credenciales inválidas"))?;

        // Verificar contraseña
        let hash = row
            .try_get::<&str, _>("passwordHash")
            .ok()
            .flatten()
            .unwrap_or("");
        let password_ok = bcrypt::verify(&req.password, hash).unwrap_or(false);
        if !password_ok {
            return Err(Status::unauthenticated("Credenciales inválidas"));
        }

        // Extraer datos del usuario
        let id_usuario = row
            .try_get::<i32, _>("idUsuario")
            .ok()
            .flatten()
            .unwrap_or(0);
        let nombre = row
            .try_get::<&str, _>("nombre")
            .ok()
            .flatten()
            .unwrap_or("")
            .to_string();
        let correo = row
            .try_get::<&str, _>("correo")
            .ok()
            .flatten()
            .unwrap_or("")
            .to_string();
        let carnet = row
            .try_get::<&str, _>("carnet")
            .ok()
            .flatten()
            .unwrap_or("")
            .to_string();
        let cargo = row
            .try_get::<&str, _>("cargo")
            .ok()
            .flatten()
            .unwrap_or("")
            .to_string();
        let id_rol = row.try_get::<i32, _>("idRol").ok().flatten().unwrap_or(0);
        let rol_nombre = row
            .try_get::<&str, _>("rolNombre")
            .ok()
            .flatten()
            .unwrap_or("")
            .to_string();
        let gerencia = row
            .try_get::<&str, _>("gerencia")
            .ok()
            .flatten()
            .unwrap_or("")
            .to_string();
        let pais = row
            .try_get::<&str, _>("pais")
            .ok()
            .flatten()
            .unwrap_or("")
            .to_string();

        // Generar JWT
        let claims = serde_json::json!({
            "sub": id_usuario,
            "carnet": carnet,
            "correo": correo,
            "nombre": nombre,
            "idRol": id_rol,
            "exp": chrono::Utc::now().timestamp() + 86400
        });

        let key = crate::auth::jwt_encoding_key(&self.jwt_secret);

        let token = jsonwebtoken::encode(&jsonwebtoken::Header::default(), &claims, &key)
            .map_err(|e| Status::internal(format!("Error generando token: {}", e)))?;

        let response = LoginResponse {
            success: true,
            access_token: token,
            refresh_token: String::new(), // TODO: implementar refresh
            usuario: Some(UserInfo {
                id_usuario,
                nombre,
                correo,
                carnet,
                cargo,
                id_rol,
                rol_nombre,
                gerencia,
                pais,
            }),
        };

        Ok(Response::new(response))
    }

    async fn refresh(
        &self,
        _request: Request<RefreshRequest>,
    ) -> Result<Response<TokenPair>, Status> {
        Err(Status::unimplemented(
            "Refresh token pendiente de implementar",
        ))
    }

    async fn change_password(
        &self,
        _request: Request<ChangePasswordRequest>,
    ) -> Result<Response<ChangePasswordResponse>, Status> {
        Err(Status::unimplemented("Change password pendiente"))
    }

    async fn get_config(
        &self,
        _request: Request<GetConfigRequest>,
    ) -> Result<Response<UserConfig>, Status> {
        Ok(Response::new(UserConfig {
            agenda_show_gestion: true,
            agenda_show_rapida: true,
        }))
    }

    async fn update_config(
        &self,
        request: Request<UserConfig>,
    ) -> Result<Response<UserConfig>, Status> {
        Ok(Response::new(request.into_inner()))
    }
}
