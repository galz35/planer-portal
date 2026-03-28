use crate::config::AppConfig;
use crate::db::Pool;
use anyhow::{anyhow, Context, Result};
use lettre::message::header::ContentType;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{Message, SmtpTransport, Transport};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PushPayload {
    pub tokens: Vec<String>,
    pub title: String,
    pub body: String,
    pub data: Option<serde_json::Value>,
}

pub struct NotificationService {
    config: AppConfig,
    http_client: reqwest::Client,
    pool: Pool,
    tera: tera::Tera,
}

impl NotificationService {
    pub fn new(config: AppConfig, pool: Pool) -> Self {
        let mut tera = tera::Tera::default();
        // Intentar cargar plantillas si el directorio existe
        if let Ok(t) = tera::Tera::new("templates/**/*") {
            tera = t;
        } else {
            tracing::warn!("No se pudieron cargar las plantillas de email desde 'templates/'. Verifique que el directorio existe.");
        }

        Self {
            config,
            http_client: reqwest::Client::new(),
            pool,
            tera,
        }
    }

    /// Obtiene el token de acceso para Firebase usando el Service Account
    async fn get_fcm_token(&self) -> Result<String> {
        let creds_path = &self.config.firebase_credentials_path;
        if creds_path.is_empty() {
            return Err(anyhow!("FIREBASE_CREDENTIALS_PATH no configurado"));
        }

        let secret = yup_oauth2::read_service_account_key(creds_path)
            .await
            .context("Error leyendo Service Account Key")?;

        let auth = yup_oauth2::ServiceAccountAuthenticator::builder(secret)
            .build()
            .await
            .context("Error creando autenticador")?;

        let token = auth
            .token(&["https://www.googleapis.com/auth/cloud-platform"])
            .await?;
        Ok(token.token().unwrap_or("").to_string())
    }

    pub async fn send_push(&self, payload: PushPayload) -> Result<()> {
        if payload.tokens.is_empty() {
            return Ok(());
        }

        let access_token = self.get_fcm_token().await?;

        let project_id = self.extract_project_id().await?;
        let url = format!(
            "https://fcm.googleapis.com/v1/projects/{}/messages:send",
            project_id
        );

        for token in payload.tokens {
            let message = serde_json::json!({
                "message": {
                    "token": token,
                    "notification": {
                        "title": payload.title,
                        "body": payload.body,
                    },
                    "data": payload.data.as_ref().unwrap_or(&serde_json::json!({})),
                    "android": {
                        "priority": "high",
                        "notification": {
                            "sound": "default",
                            "click_action": "FLUTTER_NOTIFICATION_CLICK"
                        }
                    },
                    "apns": {
                        "payload": {
                            "aps": {
                                "sound": "default",
                                "badge": 1
                            }
                        }
                    }
                }
            });

            let response = self
                .http_client
                .post(&url)
                .bearer_auth(&access_token)
                .json(&message)
                .send()
                .await?;

            if !response.status().is_success() {
                let err_text = response.text().await?;
                tracing::error!("Error enviando push a {}: {}", token, err_text);
            } else {
                tracing::info!("Push enviado con éxito a {}", token);
            }
        }

        Ok(())
    }

    async fn extract_project_id(&self) -> Result<String> {
        let creds_content =
            tokio::fs::read_to_string(&self.config.firebase_credentials_path).await?;
        let json: serde_json::Value = serde_json::from_str(&creds_content)?;
        json["project_id"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| anyhow!("Project ID no encontrado en JSON de Firebase"))
    }

    pub async fn send_templated_email(
        &self,
        to: &str,
        subject: &str,
        template_name: &str,
        context: &tera::Context,
        meta: Option<serde_json::Value>,
    ) -> Result<()> {
        let html = self
            .tera
            .render(template_name, context)
            .map_err(|e| anyhow!("Error renderizando plantilla {}: {}", template_name, e))?;

        self.send_email(to, subject, html, meta).await
    }

    pub async fn send_email(
        &self,
        to: &str,
        subject: &str,
        html_content: String,
        meta: Option<serde_json::Value>,
    ) -> Result<()> {
        let creds = Credentials::new(self.config.mail_user.clone(), self.config.mail_pass.clone());

        let email = Message::builder()
            .from(self.config.mail_from.parse()?)
            .to(to.parse()?)
            .subject(subject)
            .header(ContentType::TEXT_HTML)
            .body(html_content.clone())?;

        let mailer = SmtpTransport::relay(&self.config.mail_host)?
            .credentials(creds)
            .port(self.config.mail_port)
            .build();

        match mailer.send(&email) {
            Ok(_) => {
                tracing::info!("Email enviado a {}", to);
                let _ = self
                    .registrar_notificacion(to, subject, "EMAIL", "ENVIADO", None, meta)
                    .await;
                Ok(())
            }
            Err(e) => {
                let err_msg = e.to_string();
                tracing::error!("Error enviando email a {}: {}", to, err_msg);
                let _ = self
                    .registrar_notificacion(
                        to,
                        subject,
                        "EMAIL",
                        "FALLIDO",
                        Some(err_msg.as_str()),
                        meta,
                    )
                    .await;
                Err(e.into())
            }
        }
    }

    async fn registrar_notificacion(
        &self,
        correo: &str,
        asunto: &str,
        tipo: &str,
        estado: &str,
        error: Option<&str>,
        meta: Option<serde_json::Value>,
    ) -> Result<()> {
        let mut client = self.pool.get().await?;

        let id_usuario = meta
            .as_ref()
            .and_then(|m| m["idUsuario"].as_i64())
            .map(|v| v as i32);
        let carnet = meta.as_ref().and_then(|m| m["carnet"].as_str());
        let id_entidad = meta.as_ref().and_then(|m| m["idEntidad"].as_str());

        let sql = "INSERT INTO p_Notificaciones_Enviadas (idUsuario, carnet, correo, tipo, asunto, idEntidad, estado, error, fechaEnvio) \
                   VALUES (@p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, GETDATE())";

        client
            .execute(
                sql,
                &[
                    &id_usuario,
                    &carnet,
                    &correo,
                    &tipo,
                    &asunto,
                    &id_entidad,
                    &estado,
                    &error,
                ],
            )
            .await?;

        Ok(())
    }
}
