# 🔥 FIREBASE_LEER: Guía de Notificaciones Push (FCM)

Este documento explica por qué y cómo usamos Firebase Cloud Messaging (FCM) para las notificaciones móviles, manteniendo nuestra infraestructura principal en **SQL Server** y **NestJS**.

---

## 1. ¿POR QUE FIREBASE? (La gran duda)

Aunque usamos **SQL Server** como cerebro de datos, los teléfonos (Android e iPhone) no permiten que SQL Server les hable directamente. Necesitamos un "Mensajero" oficial:

*   **El Mensajero:** Firebase Cloud Messaging (FCM) es el único servicio que tiene permiso de Google y Apple para "despertar" a un celular y mostrar una notificación sin gastar batería.
*   **El Costo:** Es **$100% GRATUITO**. No hay límite de mensajes ni de usuarios. Google lo ofrece gratis para que las apps funcionen bien.
*   **La Seguridad:** Solo tu servidor NestJS tendrá la "llave" para pedirle a Firebase que envíe mensajes.

---

## 2. FLUJO DE UNA NOTIFICACIÓN

1.  **ACCIÓN:** Un jefe asigna una tarea en la Web.
2.  **CEREBRO (SQL Server):** El servidor guarda la tarea en la base de datos de siempre.
3.  **DECISIÓN:** El código de NestJS dice: *"Esta tarea es nueva, debo avisarle al usuario"*.
4.  **PETICIÓN:** Tu Backend le envía un aviso a **Firebase** diciendo: *"Juan tiene una tarea nueva, avísale a su celular"*.
5.  **ENTREGA:** Firebase busca el celular de Juan y le entrega el mensaje en la pantalla de bloqueo.

---

## 3. PASOS PARA CONFIGURAR (Resumen Técnico)

### A. En la Consola de Firebase (Manual)
1.  Crear proyecto en [Firebase Console](https://console.firebase.google.com/).
2.  Registrar la App de Android/iOS.
3.  Descargar `google-services.json` y ponerlo en la carpeta `android/app/` de Flutter.

### B. En SQL Server (Base de Datos)
Necesitamos una tabla pequeña para saber qué "Id de Mensajería" (Token) tiene cada usuario:

```sql
CREATE TABLE p_UsuarioTokens (
    idToken INT IDENTITY(1,1) PRIMARY KEY,
    idUsuario INT NOT NULL, -- O Carnet
    fcmToken NVARCHAR(MAX) NOT NULL,
    dispositivo NVARCHAR(50), -- 'Android' o 'iOS'
    fechaRegistro DATETIME DEFAULT GETDATE(),
    activo BIT DEFAULT 1
);
```

### C. En Flutter (App Móvil)
1.  Instalar `firebase_messaging`.
2.  Al iniciar sesión, la app le pide a Firebase su "Token".
3.  La app envía ese Token a tu servidor para guardarlo en la tabla `p_UsuarioTokens`.

### D. En NestJS (Servidor)
1.  Instalar `firebase-admin`.
2.  Crear una función que, al detectar un cambio importante, busque el token del usuario en SQL Server y le diga a Firebase: `admin.messaging().send(message)`.

---

## 4. CONCLUSIÓN DE PROYECTO

*   **SQL Server** sigue siendo el dueño de la información.
*   **Firebase** es solo el cartero que entrega los avisos.
*   **Beneficio:** Los usuarios se enteran al instante de sus asignaciones sin tener que estar abriendo la app a cada rato.

---
*Documento preparado para: Proyecto Momentus Planner*
