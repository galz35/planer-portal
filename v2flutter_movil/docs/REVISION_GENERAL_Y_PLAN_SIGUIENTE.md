# Revisión general del proyecto y plan de trabajo siguiente

## Resultado de la revisión rápida (codebase móvil)

Se revisó estructura, módulos principales y puntos críticos offline/online para detectar huecos antes de avanzar a release.

### Lo que está bien encaminado
- Arquitectura offline-first consistente (write-local-first + cola de sync + fallback cache).
- Módulos clave conectados a endpoints reales (Agenda, Pendientes/Mi Asignación, Proyectos, Equipo, Reportes).
- Sesión y refresh base implementados.
- Ajustes ahora tiene preferencias de notificaciones persistidas (base de opt-in/opt-out).

### Riesgos/huecos detectados
1. **Push todavía no conectado**
   - Ya existen preferencias, pero no hay canal real FCM/APNs conectado a backend.
2. **Conectividad parcialmente cerrada**
   - Ya existe disparador automático por cambios de red + resume con debounce; falta endurecer escenarios edge (flapping/red cautiva).
3. **Sin telemetría operativa de sync**
   - No hay métricas de tasa de éxito/fallo para soporte en producción.
4. **Cobertura de pruebas limitada**
   - No hay suite robusta por feature (offline/online, colisiones, retries, sesión).

---

## Plan de trabajo siguiente (priorizado)

## Fase 1 — Notificaciones asíncronas reales (alto impacto)
1. Integrar proveedor push (FCM/APNs) y token por usuario/dispositivo.
2. Exponer endpoint backend para registrar/actualizar token y preferencias.
3. Enlazar preferencias de Ajustes con payload/categorías de notificación:
   - Nuevas asignaciones.
   - Recordatorios de pendientes.
4. Aplicar lógica opt-in/opt-out en cliente y backend.

**Criterio de salida:** usuario recibe o no recibe notificaciones según switches de Ajustes.

## Fase 2 — Sync automática por conectividad
1. Endurecer detector de conectividad para escenarios edge (flapping, red cautiva).
2. Ajustar debounce según telemetría real de dispositivos.
3. Extender trazabilidad de sincronización (última ejecución, resultado y errores frecuentes).

**Criterio de salida:** al volver internet, la cola se procesa sin acción manual.

## Fase 3 — QA técnico mínimo para estabilidad
1. Pruebas unitarias de repositorio/sync queue/reintentos.
2. Pruebas de integración de casos críticos:
   - crear tarea offline → reconexión → sincroniza.
   - token expirado → refresh → retry exitoso.
3. Checklist manual en dispositivo real (Android/iOS).

**Criterio de salida:** flujo crítico validado en escenarios offline/online reales.

## Fase 4 — Endurecimiento previo a release
1. Telemetría básica (errores red, sync fallida, latencia endpoint).
2. Hardening de seguridad local (biometría/PIN opcional).
3. Pulido UX de estados vacíos/errores/reintentos.

**Criterio de salida:** app lista para piloto controlado.

---

## Nota sobre Ajustes (corrección aplicada)
Al desactivar notificaciones globales, ahora no se sobrescriben permanentemente los switches específicos.
Eso permite reactivar global y conservar la preferencia fina previa del usuario.
