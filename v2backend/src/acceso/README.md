# Módulo Acceso - Permisos, Visibilidad e Importación

## 📋 Resumen

El **módulo Acceso** implementa un sistema completo de:

- **Gestión de empleados** (importación JSON/Excel)
- **Árbol organizacional** jerárquico
- **Permisos por área** (acceso a subárboles)
- **Permisos por empleado** (acceso puntual)
- **Delegación de visibilidad** (secretaria ve lo del gerente)
- **Cálculo de visibilidad** con CTE recursivo

**Clave única de persona:** `carnet` (string)

---

## 🚀 Inicio Rápido

### 1. Iniciar el backend (crea las tablas automáticamente con TypeORM)
```bash
cd backend
npm run start:dev
```

### 2. Importar empleados via JSON
```bash
POST /acceso/importar/empleados
Content-Type: application/json

{
  "empleados": [
    {
      "carnet": "EMP001",
      "nombreCompleto": "Juan Pérez",
      "correo": "jperez@empresa.com",
      "departamento": "TI",
      "cargo": "Desarrollador"
    }
  ],
  "modo": "MERGE",
  "fuente": "API"
}
```

### 3. Importar desde Excel
```bash
POST /acceso/importar/empleados/excel?modo=MERGE
Content-Type: multipart/form-data
file: archivo.xlsx
```

---

## 🗂️ Estructura del Módulo

```
src/acceso/
├── acceso.module.ts           # Módulo principal
├── acceso.controller.ts       # CRUD permisos y delegaciones
├── acceso.service.ts          # Lógica de negocio CRUD
├── visibilidad.controller.ts  # Endpoints de visibilidad
├── visibilidad.service.ts     # CTE recursivo para visibilidad
├── visibilidad.guard.ts       # Guard de seguridad
├── import.controller.ts       # Importación JSON/Excel
├── import.service.ts          # Lógica de importación masiva
├── usuario-carnet.decorator.ts # Decorator para extraer carnet
├── index.ts                   # Barrel exports
├── entities/
│   ├── empleado.entity.ts          # ~35 campos
│   ├── organizacion-nodo-rh.entity.ts
│   ├── permiso-area.entity.ts
│   ├── permiso-empleado.entity.ts
│   ├── delegacion-visibilidad.entity.ts
│   └── index.ts
├── dto/
│   ├── crear-permiso-area.dto.ts
│   ├── crear-permiso-empleado.dto.ts
│   ├── crear-delegacion.dto.ts
│   ├── importar-empleados.dto.ts
│   └── index.ts
└── sql/                       # DDL de referencia (TypeORM crea automático)
    ├── 01_ddl_postgres.sql
    ├── 01_ddl_sqlserver.sql
    ├── 02_sync_sigho1.sql
    └── 03_query_visibilidad.sql
```

---

## 🗃️ Entidad Empleado (campos completos)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| **Identificación** | | |
| `carnet` | VARCHAR(100) PK | **Clave única** |
| `cedula` | VARCHAR(50) | Cédula |
| `nombreCompleto` | VARCHAR(250) | Nombre |
| `correo` | VARCHAR(150) UNIQUE | Email |
| `telefono` | VARCHAR(50) | Teléfono |
| **Ubicación Org** | | |
| `idOrg` | BIGINT FK | Nodo organizacional |
| `cargo` | VARCHAR(200) | Cargo |
| `departamento` | VARCHAR(200) | **Departamento** |
| `area` | VARCHAR(200) | **Área** |
| `gerencia` | VARCHAR(200) | **Gerencia** |
| `direccion` | VARCHAR(200) | Dirección org |
| `empresa` | VARCHAR(150) | Empresa |
| `ubicacion` | VARCHAR(200) | Ubicación física |
| `pais` | VARCHAR(50) | Código país (NI, HN, etc) |
| **Niveles Org** | | |
| `primerNivel..sextoNivel` | VARCHAR(200) | Niveles jerárquicos |
| **Jefatura** | | |
| `carnetJefe1..4` | VARCHAR(100) | Carnets de jefes |
| `jefe1Nombre` | VARCHAR(250) | Nombre del jefe 1 |
| `jefe1Correo` | VARCHAR(150) | Email del jefe 1 |
| **Niveles/Permisos** | | |
| `userLevel` | INT | Nivel de usuario |
| `managerLevel` | VARCHAR(100) | Nivel de manager |
| `tipoEmpleado` | VARCHAR(50) | Tipo |
| `tipoContrato` | VARCHAR(100) | Contrato |
| **Fechas/Estado** | | |
| `fechaIngreso` | TIMESTAMP | Fecha ingreso |
| `fechaBaja` | TIMESTAMP | Fecha baja |
| `activo` | BOOLEAN | Estado activo |
| **Auditoría** | | |
| `createdAt` | TIMESTAMP | Creación |
| `updatedAt` | TIMESTAMP | Actualización |
| `importadoPor` | VARCHAR(100) | Quién importó |
| `fuente` | VARCHAR(50) | EXCEL, API, SIGHO1, MANUAL |

---

## 🌐 Endpoints API

### Importación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/acceso/importar/empleados` | Importar JSON |
| POST | `/acceso/importar/empleados/excel` | Importar Excel |
| POST | `/acceso/importar/empleados/excel/preview` | Preview Excel |
| POST | `/acceso/importar/organizacion` | Importar nodos org |
| GET | `/acceso/importar/estadisticas` | Stats de importación |
| GET | `/acceso/importar/empleados/exportar` | Exportar (JSON/CSV) |
| GET | `/acceso/importar/plantilla` | Plantilla Excel |

### Visibilidad
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/visibilidad/:carnet` | Carnets visibles |
| GET | `/visibilidad/:carnet/empleados` | Empleados visibles |
| GET | `/visibilidad/:carnet/puede-ver/:objetivo` | Verificar acceso |
| GET | `/visibilidad/:carnet/actores` | Actores efectivos |
| GET | `/visibilidad/organizacion/:idorg/subarbol` | Subárbol org |

### Permisos por Área
| POST | `/acceso/permiso-area` | Crear |
| GET | `/acceso/permiso-area` | Listar todos |
| GET | `/acceso/permiso-area/:carnetRecibe` | Listar por receptor |
| DELETE | `/acceso/permiso-area/:id` | Desactivar |

### Permisos por Empleado
| POST | `/acceso/permiso-empleado` | Crear |
| GET | `/acceso/permiso-empleado` | Listar todos |
| GET | `/acceso/permiso-empleado/:carnetRecibe` | Listar por receptor |
| DELETE | `/acceso/permiso-empleado/:id` | Desactivar |

### Delegaciones
| POST | `/acceso/delegacion` | Crear |
| GET | `/acceso/delegacion` | Listar todas |
| GET | `/acceso/delegacion/delegado/:carnet` | Por delegado |
| GET | `/acceso/delegacion/delegante/:carnet` | Por delegante |
| DELETE | `/acceso/delegacion/:id` | Desactivar |

### Consultas
| GET | `/acceso/empleado/:carnet` | Buscar empleado |
| GET | `/acceso/empleados` | Listar activos |
| GET | `/acceso/organizacion/buscar?q=` | Buscar nodos |

---

## 📊 Modos de Importación

| Modo | Descripción |
|------|-------------|
| `MERGE` | **(Default)** Upsert - inserta nuevos, actualiza existentes |
| `REPLACE` | Elimina todo y vuelve a insertar |
| `INSERT_ONLY` | Solo inserta nuevos, ignora existentes |

---

## 📤 Ejemplo: Importar desde Excel

### 1. Obtener plantilla
```bash
GET /acceso/importar/plantilla
```

### 2. Crear Excel con columnas:
- carnet (obligatorio)
- nombre_completo
- correo
- telefono
- cargo
- departamento
- area
- gerencia
- pais
- etc.

### 3. Subir Excel
```bash
POST /acceso/importar/empleados/excel?modo=MERGE&importadoPor=admin@empresa.com
Content-Type: multipart/form-data
file: empleados.xlsx
```

### 4. Respuesta
```json
{
  "mensaje": "Excel procesado: 500 filas, 498 válidos, 450 insertados, 48 actualizados",
  "resultado": {
    "total": 500,
    "insertados": 450,
    "actualizados": 48,
    "errores": 2,
    "detallesErrores": [
      { "carnet": "EMP999", "error": "Correo duplicado" }
    ],
    "duracionMs": 2340
  }
}
```

---

## 🔄 Regla MAESTRA de Visibilidad

```
Visibles = (Mi subárbol org) ∪ (Permisos área) ∪ (Permisos puntuales) ∪ (Delegaciones)
```

### CTE Recursivo (PostgreSQL)
```sql
WITH RECURSIVE
Actores AS (
  SELECT $1 AS carnet
  UNION
  SELECT carnet_delegante FROM p_delegacion_visibilidad
  WHERE carnet_delegado = $1 AND activo = true
),
Seeds AS (
  SELECT idorg FROM p_empleados WHERE carnet IN (SELECT carnet FROM Actores)
  UNION
  SELECT idorg_raiz FROM p_permiso_area WHERE carnet_recibe IN (SELECT carnet FROM Actores)
),
Arbol AS (
  SELECT idorg FROM p_organizacion_nodos WHERE idorg IN (SELECT idorg FROM Seeds)
  UNION ALL
  SELECT child.idorg FROM p_organizacion_nodos child JOIN Arbol ON child.padre = Arbol.idorg
)
SELECT DISTINCT e.carnet
FROM p_empleados e
WHERE e.idorg IN (SELECT idorg FROM Arbol)
   OR e.carnet IN (SELECT carnet_objetivo FROM p_permiso_empleado WHERE carnet_recibe IN (SELECT carnet FROM Actores));
```

---

## 🛡️ Uso del Guard

```typescript
import { UseGuards } from '@nestjs/common';
import { VisibilidadGuard } from 'src/acceso';

@UseGuards(VisibilidadGuard)
@Get('empleado/:carnetObjetivo/tareas')
async tareas(@Param('carnetObjetivo') carnet: string) {
  // Solo llega aquí si tiene permiso
}
```

---

## 📦 Dependencias Instaladas

```json
{
  "xlsx": "^0.18.x",           // Parseo de Excel
  "@fastify/multipart": "^8.x" // Upload de archivos
}
```

---

## ✅ Checklist

- [x] Entidad Empleado completa (~35 campos)
- [x] Entidades de permisos y delegación
- [x] Servicio de importación (JSON + Excel)
- [x] Controller de importación con preview
- [x] Servicio de visibilidad (CTE recursivo)
- [x] Guard de visibilidad
- [x] Integración al app.module.ts
- [x] DDL de referencia (SQL Server + Postgres)
- [ ] Configurar @fastify/multipart en main.ts
- [ ] Cargar datos de prueba
- [ ] Probar endpoints
