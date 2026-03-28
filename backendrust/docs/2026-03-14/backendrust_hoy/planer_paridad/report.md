# Auditoria de paridad backendrust vs Nest

## Resumen

- Endpoints Nest contabilizados: 264
- Endpoints Rust certificados por bandera legacy en manifiesto: 130
- Endpoints Rust declarados como implementados en implemented_endpoints.json: 254
- Endpoints Rust declarados pero no marcados como implementados: 134
- Endpoints Rust con handler generico: 0
- Endpoints Rust faltantes en router: 0
- Hints de posible brecha de seguridad: 0
- Nota: existe una inconsistencia entre endpoints_manifest.json (implemented_in_rust) y implemented_endpoints.json; ambos numeros se reportan por separado.
- Nota: 'Readiness' en esta auditoria significa cobertura de router sin handler generico. No equivale a certificacion funcional completa.

## Controladores con menor readiness

| Controller | Total | Real | Declarado no certificado | Generico | Faltante | Hints seguridad | Cobertura router |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| clarity/seed.controller.ts | 1 | 1 | 0 | 0 | 0 | 0 | 100% |
| common/notification.controller.ts | 6 | 4 | 2 | 0 | 0 | 0 | 100% |
| diagnostico/diagnostico.controller.ts | 5 | 4 | 1 | 0 | 0 | 0 | 100% |
| clarity/reportes.controller.ts | 6 | 6 | 0 | 0 | 0 | 0 | 100% |
| clarity/organizacion.controller.ts | 2 | 1 | 1 | 0 | 0 | 0 | 100% |
| clarity/proyectos.controller.ts | 14 | 6 | 8 | 0 | 0 | 0 | 100% |
| clarity/recurrencia.controller.ts | 5 | 3 | 2 | 0 | 0 | 0 | 100% |
| software/software.controller.ts | 1 | 1 | 0 | 0 | 0 | 0 | 100% |
| visita-cliente/visita-admin.controller.ts | 14 | 6 | 8 | 0 | 0 | 0 | 100% |
| visita-cliente/visita-campo.controller.ts | 9 | 9 | 0 | 0 | 0 | 0 | 100% |
| planning/planning.controller.ts | 28 | 17 | 11 | 0 | 0 | 0 | 100% |
| jornada/jornada.controller.ts | 11 | 3 | 8 | 0 | 0 | 0 | 100% |

## Endpoints faltantes

| Controller | Metodo | Path |
| --- | --- | --- |

## Endpoints genericos o mock

| Controller | Metodo | Path | Handler |
| --- | --- | --- | --- |

## Endpoints declarados en Rust pero no certificados por manifiesto

| Controller | Metodo | Path | Handler | Auth hint |
| --- | --- | --- | --- | --- |
| acceso/acceso.controller.ts | POST | /acceso/permiso-area | acceso_permiso_area_create | json |
| acceso/acceso.controller.ts | GET | /acceso/permiso-area/:carnetRecibe | acceso_permiso_area_por_carnet |  |
| acceso/acceso.controller.ts | GET | /acceso/permiso-area | acceso_permiso_area_list |  |
| acceso/acceso.controller.ts | DELETE | /acceso/permiso-area/:id | acceso_permiso_delete |  |
| acceso/acceso.controller.ts | POST | /acceso/permiso-empleado | acceso_permiso_empleado_create | json |
| acceso/acceso.controller.ts | GET | /acceso/permiso-empleado/:carnetRecibe | acceso_permiso_empleado_por_carnet |  |
| acceso/acceso.controller.ts | GET | /acceso/permiso-empleado | acceso_permiso_empleado_list |  |
| acceso/acceso.controller.ts | DELETE | /acceso/permiso-empleado/:id | acceso_permiso_delete |  |
| acceso/acceso.controller.ts | POST | /acceso/delegacion | acceso_delegacion_create | auth-user, json |
| acceso/acceso.controller.ts | GET | /acceso/delegacion/delegado/:carnetDelegado | acceso_delegacion_delegado |  |
| acceso/acceso.controller.ts | GET | /acceso/delegacion/delegante/:carnetDelegante | acceso_delegacion_delegante |  |
| acceso/acceso.controller.ts | GET | /acceso/delegacion | acceso_delegacion_list | auth-user |
| acceso/acceso.controller.ts | GET | /acceso/empleados/gerencia/:nombre | acceso_empleados_gerencia |  |
| acceso/acceso.controller.ts | GET | /acceso/organizacion/nodo/:idOrg | acceso_organizacion_nodo |  |
| acceso/acceso.controller.ts | GET | /acceso/organizacion/nodo/:idOrg/preview | acceso_organizacion_nodo_preview |  |
| acceso/visibilidad.controller.ts | GET | /visibilidad/:carnet/puede-ver/:carnetObjetivo | visibilidad_puede_ver |  |
| acceso/visibilidad.controller.ts | GET | /visibilidad/organizacion/:idorg/subarbol | visibilidad_subarbol |  |
| acceso/visibilidad.controller.ts | GET | /visibilidad/:carnet/quien-puede-verme | visibilidad_quien_puede_verme |  |
| admin/admin-security.controller.ts | GET | /admin/security/users-access | admin_security_users_access | admin-middleware |
| admin/admin-security.controller.ts | POST | /admin/security/assign-menu | admin_security_assign_menu | admin-middleware |
| admin/admin-security.controller.ts | DELETE | /admin/security/assign-menu/:id | admin_security_delete_assign_menu | admin-middleware |
| admin/admin-security.controller.ts | GET | /admin/security/profiles | admin_security_profiles | admin-middleware |
| admin/admin.controller.ts | GET | /admin/stats | admin_stats | admin-middleware |
| admin/admin.controller.ts | GET | /admin/usuarios | admin_usuarios | admin-middleware |
| admin/admin.controller.ts | PATCH | /admin/usuarios/:id/rol | admin_patch_usuario_rol | admin-middleware |
| admin/admin.controller.ts | POST | /admin/usuarios/:id/menu | admin_usuario_menu | admin-middleware |
| admin/admin.controller.ts | POST | /admin/usuarios | admin_create_usuario | admin-middleware |
| admin/admin.controller.ts | PATCH | /admin/usuarios/:id | admin_patch_usuario | admin-middleware |
| admin/admin.controller.ts | GET | /admin/usuarios/:id/visibilidad-efectiva | admin_visibilidad_efectiva | admin-middleware |
| admin/admin.controller.ts | GET | /admin/roles | admin_roles | admin-middleware |

## Hints de brecha de seguridad

| Controller | Metodo | Path | Guards Nest | Auth Rust |
| --- | --- | --- | --- | --- |

## Archivos generados

- `summary.json`
- `controller_summary.csv`
- `endpoint_matrix.csv`
