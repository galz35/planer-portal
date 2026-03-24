# Checklist final para cerrar al 100% en tu entorno local

Este checklist está pensado para que tú hagas el último tramo en móvil local (Android/iOS) con Flutter instalado.

## 1) Configurar entorno y backend real
- [ ] Correr app con `API_BASE_URL` real usando `--dart-define`.
- [ ] Validar login real con un usuario existente.
- [ ] Confirmar refresh token (forzar expiración y verificar reintento).

## 2) Verificar sincronización offline/online
- [ ] Crear tarea sin red (modo avión) y confirmar guardado local.
- [ ] Volver a conectar y confirmar que la cola se sincroniza automáticamente.
- [ ] Revisar pantalla **Sincronización**:
  - [ ] `Eventos sincronizados en último intento` cambia.
  - [ ] `Última sincronización` muestra timestamp.
  - [ ] Si hay error, aparece mensaje en rojo y luego desaparece al sincronizar bien.

## 3) Endpoints por módulo (smoke funcional)
- [ ] Agenda (`/mi-dia`) carga online y hace fallback cache offline.
- [ ] Pendientes / Mi Asignación (`/tareas/mias`) carga online y fallback offline.
- [ ] Proyectos (`/planning/my-projects`) y Equipo (`/planning/team`) cargan y cachean.
- [ ] Dashboard (`/planning/stats`) carga y cae a cache cuando no hay red.

## 4) Pendientes reales para “100% release-ready”
- [ ] Integrar push real FCM/APNs + registro de token en backend.
- [ ] Completar contrato backend para notas sincronizadas.
- [ ] Añadir pruebas unitarias/integración críticas de sync y sesión.
- [ ] Añadir telemetría mínima de errores de red/sync para soporte.

## 5) Comandos sugeridos (local)
```bash
flutter pub get
flutter analyze
flutter test
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```
