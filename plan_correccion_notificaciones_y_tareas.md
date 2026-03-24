# Plan de Corrección: Notificaciones (Email/Push) — VALIDADO Y EJECUTADO

## ✅ Problema 1: Plantillas de Correo no encontradas (ENOENT)
**Estado: CORREGIDO Y VERIFICADO**
- Se modificó `nest-cli.json` para persistir las plantillas en `dist`.
- Se verificó el envío real a `gustavo.lira@claro.com.ni` exitosamente.

## ✅ Problema 2: SP `sp_Dispositivos_ObtenerPorUsuario` no existía
**Estado: CORREGIDO**
  - Si NO hay tokens → salta el push sin error (línea 72: `if (!this.configured || tokens.length === 0) return;`)
  - El correo se envía SIEMPRE que exista `destino.correo` (independiente de tokens push)

## ✅ Problema 4: Flujo de Supervisión (Jefa asigna tarea)
**Estado: VALIDADO — El flujo SÍ notifica**
- Cuando un jefe asigna una tarea desde PlanTrabajoPage:
  - **Creación**: `postTarea` → `tareaCrearRapida` → verifica `if (dto.idResponsable && dto.idResponsable !== dto.idUsuario)` → llama `enviarNotificacionAsignacion`
  - **Reasignación**: `actualizarTarea` con `idResponsable` → verifica cambio → llama `enviarNotificacionAsignacion`
- El **único motivo** por el que el correo no llegó es el Problema 1 (plantillas .pug no encontradas en dist).
- Con el fix de plantillas aplicado, los correos DEBEN empezar a llegar.

## 📝 Config de Email Verificada
```
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_USER=rrrhh1930@gmail.com
MAIL_PASSWORD=****(definida)
MAIL_FROM="Planner-EF <rrrhh1930@gmail.com>"
```

## 🔥 Firebase Verificado
```
FIREBASE_CREDENTIALS_PATH=./planner-ef-4772a-firebase-adminsdk-fbsvc-9439db0939.json
Proyecto: planner-ef-4772a
Estado: ✅ Inicializado correctamente (log confirmado)
```

## 📁 Archivos Clave
| Archivo | Rol |
|---------|-----|
| `v2backend/nest-cli.json` | Config de compilación (assets) |
| `v2backend/src/common/notification.module.ts` | Config de Mailer (ruta templates) |
| `v2backend/src/common/notification.service.ts` | Lógica de envío Push + Email |
| `v2backend/src/clarity/tasks.service.ts` | Triggers de notificación (líneas 1621-1684) |
| `v2backend/src/common/templates/*.pug` | 6 plantillas de correo |
| BD: `p_Dispositivos` | Tabla de tokens FCM |
| BD: `sp_Dispositivos_ObtenerPorUsuario` | SP para obtener tokens (RECIÉN CREADO) |
| BD: `sp_Dispositivos_Registrar` | SP para registrar tokens desde la app |

## 🧪 Siguiente Paso Recomendado
Para verificar que el correo ya funciona, crear una tarea asignada a otro usuario desde el sistema y monitorear:
```sql
SELECT TOP 5 tipo, estado, error FROM p_Notificaciones_Enviadas ORDER BY fechaEnvio DESC
```
Si el estado cambia de `FALLIDO` a `ENVIADO`, el fix está completo.
