# Estado del Backend (Planer / Momentus)

Este documento describe la arquitectura actual, configuración y estado del Backend desplegado en el servidor Linux.

## 1. Información de Despliegue
*   **Servidor:** Linux (Ubuntu/Debian probable)
*   **IP Pública:** `100.26.176.32`
*   **URL Documentación:** [http://100.26.176.32/api/docs](http://100.26.176.32/api/docs)
*   **Puerto Interno:** 3000 (Expuesto como 80/443 probablemente vía Nginx Reverse Proxy).
*   **Motor:** Node.js con PM2 (Cluster Mode).

## 2. Arquitectura Técnica
El backend **NO** es un NestJS convencional. Tiene optimizaciones específicas de alto rendimiento.

### Framework
*   **Core:** [NestJS](https://nestjs.com/) v11
*   **Motor HTTP:** `Fastify` (en lugar de Express). Esto lo hace **2x más rápido**, pero requiere ajustes especiales para subir archivos (ya configurados en `main.ts`).
*   **Logger:** `Winston` (Logs rotativos en archivo, no solo consola).

### Base de Datos (Punto Crítico)
*   **Motor:** SQL Server.
*   **Estrategia:** **SIN ORM**.
    *   Se eliminó TypeORM/Prisma de la lógica principal.
    *   Se usa un **Pool de Conexiones Nativo** (`src/db/sqlserver.provider.ts`) usando la librería `mssql`.
    *   **Ventaja:** Máximo rendimiento y control total de queries complejos.
    *   **Desventaja:** Requiere escribir SQL manual en los Repositorios.

### Autenticación
*   **Método:** JWT (JSON Web Tokens).
*   **Flujo:**
    1.  Login recibe usuario/pass.
    2.  Valida contra tabla `Usuario` y `Credenciales` usando Store Procedures o SQL directo.
    3.  Devuelve `access_token` (12h) y `refresh_token` (7d).
*   **Seguridad:** Las contraseñas se comparan usando `bcrypt`.

## 3. Módulos Principales
La aplicación está dividida en dominios claros en `src/`:
1.  **Auth:** Login, Tokens, Permisos.
2.  **Clarity:** Lógica de negocio principal (proyectos, tareas).
3.  **Admin:** Gestión de usuarios y configuración.
4.  **Planning:** Módulo de planeación avanzada.
5.  **Diagnostico:** Herramientas para verificar integridad de datos.
6.  **Audit:** Registro de acciones (quién hizo qué).

## 4. Estado Actual del Código
*   **Pruebas:** Hay muchos scripts de prueba manual (`check_*.js`) en la raíz. Esto indica que se ha hecho mucha verificación "a mano" o migraciones de datos recientes.
*   **Producción:** El archivo `ecosystem.config.js` está listo para PM2, configurado para usar todos los núcleos del CPU (`instances: 'max'`) y reiniciar si supera 1GB de RAM.
*   **Swagger:** Está activo y configurado públicamente. Es la mejor herramienta para que el equipo de Flutter (móvil) entienda qué endpoints llamar.

## 5. Recomendaciones para el Equipo Móvil
Para integrar la App Flutter con este Backend:
1.  **Base URL:** Usar `http://100.26.176.32/api`
2.  **Auth:** El endpoint `/auth/login` devuelve un objeto `user` complejo con roles y permisos. Es vital guardar este objeto completo en el móvil.
3.  **Docs:** Revisar siempre el Swagger (`/api/docs`) antes de preguntar "qué parámetros lleva esto".
