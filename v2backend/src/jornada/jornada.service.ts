/**
 * JornadaService — Lógica de negocio para Jornada Laboral
 *
 * Gestión de Horarios (Work Shifts), Patrones (Work Patterns)
 * y Asignaciones (Work Schedules) — Basado en estándar Oracle HCM.
 */
import { Injectable, Logger } from '@nestjs/common';
import {
    ejecutarSP,
    ejecutarQuery,
    NVarChar,
    Int,
    Decimal,
    DateTime,
} from '../db/base.repo';

// ==========================================
// TYPES
// ==========================================

export interface HorarioDto {
    nombre: string;
    hora_entrada: string; // HH:mm
    hora_salida: string; // HH:mm
    duracion_horas?: number;
    es_nocturno?: boolean;
    tolerancia_min?: number;
    descanso_min?: number;
}

export interface PatronDto {
    nombre: string;
    total_dias: number;
    descripcion?: string;
    detalle: PatronDetalleDto[];
}

export interface PatronDetalleDto {
    nro_dia: number;
    id_horario: number | null; // null = día libre
    etiqueta?: string;
}

export interface AsignacionDto {
    carnet: string;
    id_patron: number;
    fecha_inicio: string; // YYYY-MM-DD
    fecha_fin?: string;
}

// ==========================================
// SERVICE
// ==========================================

@Injectable()
export class JornadaService {
    private readonly logger = new Logger('JornadaService');

    // ─── RESOLVER ─────────────────────────────

    /**
     * Obtener el horario esperado para un usuario en una fecha específica
     */
    async resolverJornada(carnet: string, fecha?: string) {
        const result = await ejecutarSP(
            'sp_jornada_resolver',
            {
                carnet: { valor: carnet, tipo: NVarChar(20) },
                fecha: fecha ? { valor: new Date(fecha), tipo: DateTime } : null,
            },
            undefined,
            'JornadaService.resolverJornada',
        );

        return result[0] || { estado: 'SIN_ASIGNACION' };
    }

    /**
     * Obtener el horario de la semana completa para un usuario
     */
    async obtenerSemana(carnet: string, fecha?: string) {
        const result = await ejecutarSP(
            'sp_jornada_semana',
            {
                carnet: { valor: carnet, tipo: NVarChar(20) },
                fecha: fecha ? { valor: new Date(fecha), tipo: DateTime } : null,
            },
            undefined,
            'JornadaService.obtenerSemana',
        );

        return result || [];
    }

    // ─── HORARIOS (CRUD) ─────────────────────

    /**
     * Listar todos los horarios activos
     */
    async listarHorarios() {
        return ejecutarQuery(
            `SELECT * FROM marcaje_horarios WHERE activo = 1 ORDER BY nombre`,
            undefined,
            'JornadaService.listarHorarios',
        );
    }

    /**
     * Crear un nuevo horario (turno)
     */
    async crearHorario(dto: HorarioDto) {
        this.logger.log(`[HORARIO] Creando: ${dto.nombre}`);

        const result = await ejecutarQuery(
            `INSERT INTO marcaje_horarios (nombre, hora_entrada, hora_salida, duracion_horas, es_nocturno, tolerancia_min, descanso_min)
       OUTPUT INSERTED.*
       VALUES (@nombre, @hora_entrada, @hora_salida, @duracion, @nocturno, @tolerancia, @descanso)`,
            {
                nombre: { valor: dto.nombre, tipo: NVarChar(100) },
                hora_entrada: { valor: dto.hora_entrada, tipo: NVarChar(8) },
                hora_salida: { valor: dto.hora_salida, tipo: NVarChar(8) },
                duracion: { valor: dto.duracion_horas || 8, tipo: Decimal(4, 2) },
                nocturno: { valor: dto.es_nocturno ? 1 : 0, tipo: Int },
                tolerancia: { valor: dto.tolerancia_min || 10, tipo: Int },
                descanso: { valor: dto.descanso_min || 60, tipo: Int },
            },
            'JornadaService.crearHorario',
        );

        return result[0];
    }

    /**
     * Actualizar un horario existente
     */
    async actualizarHorario(id: number, dto: Partial<HorarioDto>) {
        const sets: string[] = [];
        const params: Record<string, any> = {
            id: { valor: id, tipo: Int },
        };

        if (dto.nombre !== undefined) {
            sets.push('nombre = @nombre');
            params.nombre = { valor: dto.nombre, tipo: NVarChar(100) };
        }
        if (dto.hora_entrada !== undefined) {
            sets.push('hora_entrada = @hora_entrada');
            params.hora_entrada = { valor: dto.hora_entrada, tipo: NVarChar(8) };
        }
        if (dto.hora_salida !== undefined) {
            sets.push('hora_salida = @hora_salida');
            params.hora_salida = { valor: dto.hora_salida, tipo: NVarChar(8) };
        }
        if (dto.duracion_horas !== undefined) {
            sets.push('duracion_horas = @duracion');
            params.duracion = { valor: dto.duracion_horas, tipo: Decimal(4, 2) };
        }
        if (dto.es_nocturno !== undefined) {
            sets.push('es_nocturno = @nocturno');
            params.nocturno = { valor: dto.es_nocturno ? 1 : 0, tipo: Int };
        }
        if (dto.tolerancia_min !== undefined) {
            sets.push('tolerancia_min = @tolerancia');
            params.tolerancia = { valor: dto.tolerancia_min, tipo: Int };
        }
        if (dto.descanso_min !== undefined) {
            sets.push('descanso_min = @descanso');
            params.descanso = { valor: dto.descanso_min, tipo: Int };
        }

        if (sets.length === 0) return { ok: false, mensaje: 'Nada que actualizar' };

        sets.push('actualizado_en = GETDATE()');

        await ejecutarQuery(
            `UPDATE marcaje_horarios SET ${sets.join(', ')} WHERE id_horario = @id`,
            params,
            'JornadaService.actualizarHorario',
        );

        return { ok: true };
    }

    /**
     * Desactivar un horario (soft delete)
     */
    async desactivarHorario(id: number) {
        await ejecutarQuery(
            `UPDATE marcaje_horarios SET activo = 0, actualizado_en = GETDATE() WHERE id_horario = @id`,
            { id: { valor: id, tipo: Int } },
            'JornadaService.desactivarHorario',
        );
        return { ok: true };
    }

    // ─── PATRONES (CRUD) ─────────────────────

    /**
     * Listar todos los patrones con su detalle
     */
    async listarPatrones() {
        const patrones = await ejecutarQuery(
            `SELECT * FROM marcaje_patrones WHERE activo = 1 ORDER BY nombre`,
            undefined,
            'JornadaService.listarPatrones',
        );

        // Cargar detalle de cada patrón
        for (const p of patrones) {
            p.detalle = await ejecutarQuery(
                `SELECT d.*, h.nombre AS nombre_horario, h.hora_entrada, h.hora_salida, h.es_nocturno
         FROM marcaje_patrones_detalle d
         LEFT JOIN marcaje_horarios h ON h.id_horario = d.id_horario
         WHERE d.id_patron = @id
         ORDER BY d.nro_dia`,
                { id: { valor: p.id_patron, tipo: Int } },
                'JornadaService.listarPatrones.detalle',
            );
        }

        return patrones;
    }

    /**
     * Crear un patrón con su detalle completo
     */
    async crearPatron(dto: PatronDto) {
        this.logger.log(
            `[PATRON] Creando: ${dto.nombre} (${dto.total_dias} días)`,
        );

        // 1. Crear el patrón
        const result = await ejecutarQuery(
            `INSERT INTO marcaje_patrones (nombre, total_dias, descripcion)
       OUTPUT INSERTED.*
       VALUES (@nombre, @total, @desc)`,
            {
                nombre: { valor: dto.nombre, tipo: NVarChar(100) },
                total: { valor: dto.total_dias, tipo: Int },
                desc: dto.descripcion
                    ? { valor: dto.descripcion, tipo: NVarChar(500) }
                    : null,
            },
            'JornadaService.crearPatron',
        );

        const patron = result[0];

        // 2. Insertar detalle
        for (const d of dto.detalle) {
            await ejecutarQuery(
                `INSERT INTO marcaje_patrones_detalle (id_patron, nro_dia, id_horario, etiqueta)
         VALUES (@patron, @dia, @horario, @etiqueta)`,
                {
                    patron: { valor: patron.id_patron, tipo: Int },
                    dia: { valor: d.nro_dia, tipo: Int },
                    horario: d.id_horario ? { valor: d.id_horario, tipo: Int } : null,
                    etiqueta: d.etiqueta
                        ? { valor: d.etiqueta, tipo: NVarChar(50) }
                        : null,
                },
                'JornadaService.crearPatron.detalle',
            );
        }

        return patron;
    }

    // ─── ASIGNACIONES ─────────────────────────

    /**
     * Listar asignaciones activas (con nombre de colaborador y patrón)
     */
    async listarAsignaciones() {
        return ejecutarQuery(
            `SELECT a.*, p.nombre AS nombre_patron, p.total_dias,
              c.Colaborador AS nombre_colaborador
       FROM marcaje_asignacion a
       INNER JOIN marcaje_patrones p ON p.id_patron = a.id_patron
       LEFT JOIN rrhh.Colaboradores c ON c.Carnet = a.carnet
       WHERE a.activo = 1
       ORDER BY c.Colaborador`,
            undefined,
            'JornadaService.listarAsignaciones',
        );
    }

    /**
     * Asignar un patrón a un colaborador
     */
    async asignarPatron(dto: AsignacionDto) {
        this.logger.log(
            `[ASIGNACION] ${dto.carnet} → Patrón ${dto.id_patron} desde ${dto.fecha_inicio}`,
        );

        // Desactivar asignaciones anteriores del mismo carnet
        await ejecutarQuery(
            `UPDATE marcaje_asignacion SET activo = 0, actualizado_en = GETDATE()
       WHERE carnet = @carnet AND activo = 1`,
            { carnet: { valor: dto.carnet, tipo: NVarChar(20) } },
            'JornadaService.asignarPatron.deactivate',
        );

        // Crear nueva asignación
        const result = await ejecutarQuery(
            `INSERT INTO marcaje_asignacion (carnet, id_patron, fecha_inicio, fecha_fin)
       OUTPUT INSERTED.*
       VALUES (@carnet, @patron, @inicio, @fin)`,
            {
                carnet: { valor: dto.carnet, tipo: NVarChar(20) },
                patron: { valor: dto.id_patron, tipo: Int },
                inicio: { valor: new Date(dto.fecha_inicio), tipo: DateTime },
                fin: dto.fecha_fin
                    ? { valor: new Date(dto.fecha_fin), tipo: DateTime }
                    : null,
            },
            'JornadaService.asignarPatron',
        );

        return result[0];
    }

    /**
     * Desactivar asignación
     */
    async desactivarAsignacion(id: number) {
        await ejecutarQuery(
            `UPDATE marcaje_asignacion SET activo = 0, actualizado_en = GETDATE()
       WHERE id_asignacion = @id`,
            { id: { valor: id, tipo: Int } },
            'JornadaService.desactivarAsignacion',
        );
        return { ok: true };
    }
}
