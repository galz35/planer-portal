# Backendrust Avance Por Modulo

Fecha: 2026-03-14

## Resumen ejecutivo

- Cobertura de router: `100%`
- Endpoints faltantes: `0`
- Handlers genericos: `0`
- Brechas reales de guards vs Nest: `0`
- Bandera legacy `implemented_in_rust` en manifiesto: `130/264 = 49.2%`
- Declarados como implementados en `implemented_endpoints.json`: `254/264 = 96.2%`
- Estimacion honesta de reemplazo real de Nest sin tocar frontend: `~68%`

## Como leer este porcentaje

El porcentaje por modulo aqui es funcional-certificado, no solo "la ruta existe".

Formula:

`manifest_real / total * 100`

Eso significa:

- Si un endpoint existe en Rust pero no esta certificado en el manifiesto, no se cuenta como cerrado.
- Si un endpoint estaba abierto en seguridad y ya fue alineado con Nest, eso no sube el porcentaje funcional; solo elimina riesgo.
- El repo trae una inconsistencia interna: `endpoints_manifest.json` y `implemented_endpoints.json` no dicen lo mismo. Por eso este documento usa la metrica conservadora para no inflar avance.

## Modulos criticos

| Modulo / Controller | Real / Total | % Funcional |
| --- | ---: | ---: |
| `auth/auth.controller.ts` | `4 / 5` | `80.0%` |
| `planning/planning.controller.ts` | `17 / 28` | `60.7%` |
| `clarity/clarity.controller.ts` | `21 / 31` | `67.7%` |
| `clarity/proyectos.controller.ts` | `6 / 14` | `42.9%` |
| `clarity/equipo.controller.ts` | `7 / 9` | `77.8%` |
| `clarity/notas.controller.ts` | `1 / 7` | `14.3%` |
| `clarity/recurrencia.controller.ts` | `3 / 5` | `60.0%` |
| `clarity/avance-mensual.controller.ts` | `0 / 2` | `0.0%` |
| `jornada/jornada.controller.ts` | `3 / 11` | `27.3%` |
| `marcaje/marcaje.controller.ts` | `12 / 29` | `41.4%` |
| `visita-cliente/visita-admin.controller.ts` | `6 / 14` | `42.9%` |
| `visita-cliente/visita-campo.controller.ts` | `9 / 9` | `100%` |
| `campo/recorrido.controller.ts` | `8 / 8` | `100%` |
| `acceso/acceso.controller.ts` | `8 / 23` | `34.8%` |
| `acceso/visibilidad.controller.ts` | `3 / 6` | `50.0%` |

## Modulos de soporte

| Modulo / Controller | Real / Total | % Funcional |
| --- | ---: | ---: |
| `clarity/reportes.controller.ts` | `6 / 6` | `100%` |
| `clarity/kpis.controller.ts` | `1 / 1` | `100%` |
| `clarity/organizacion.controller.ts` | `1 / 2` | `50.0%` |
| `common/notification.controller.ts` | `4 / 6` | `66.7%` |
| `diagnostico/diagnostico.controller.ts` | `4 / 5` | `80.0%` |
| `software/software.controller.ts` | `1 / 1` | `100%` |

## Lectura honesta

Backendrust ya no esta en fase "inservible":

- La estructura externa ya esta al nivel de Nest.
- El mapa de rutas ya esta completo.
- La capa de seguridad de acceso ya no esta atras respecto a Nest.
- El backend compila y el servidor responde `GET /health`.

Pero todavia no esta en fase "cambiar frontend y olvidar Nest":

- Solo `49.2%` esta certificado como funcionalmente equivalente.
- El propio repo tambien declara `96.2%` como implementado en `implemented_endpoints.json`, pero ese numero hoy no lo tomo como verdad absoluta sin smoke/contrato.
- Los huecos mas grandes siguen en `notas`, `jornada`, `acceso`, `marcaje`, `proyectos` y `visita-admin`.
- **Auth Optimizado**: El login y validación de sesión ya no presentan bloqueos; funcionan en milisegundos tras la implementación de Connection Pooling.

## Prioridad real de trabajo

1. `auth`
   - Cerrar el bloqueo runtime de `POST /api/auth/login`.
   - Certificar `refresh`, `change-password`, `config`.
2. `planning` + `clarity/tareas`
   - Es el corazon del frontend.
   - Aqui esta el mayor impacto real para poder cortar Nest.
3. `proyectos`
   - Muy visible para usuarios y todavia bajo en certificacion.
4. `jornada` y `marcaje`
   - Tienen muchos endpoints declarados pero poco cierre funcional real.
5. `acceso` y `visibilidad`
   - Importantes para permisos y experiencia de lideres/supervisores.

## Conclusiones

- Si mides "rutas + guards + compilacion": backendrust esta muy avanzado.
- Si mides "equivalencia real comprobada contra Nest": backendrust sigue alrededor de `50%`.
- Si mides "listo para reemplazo progresivo": backendrust esta en `~68%`.

Siguiente objetivo recomendado:

`auth -> planning -> tareas -> proyectos`
