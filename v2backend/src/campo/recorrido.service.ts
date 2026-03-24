/**
 * RecorridoService — Lógica de negocio para Recorridos de Campo
 *
 * Flujo simple del operador móvil:
 *   1. Inicia recorrido → el GPS empieza a grabar
 *   2. Registra puntos (automático cada X seg) + visitas a clientes
 *   3. Finaliza recorrido → se calculan km y tiempo total
 *
 * El mapa se renderiza en el frontend con los puntos guardados.
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

@Injectable()
export class RecorridoService {
    private readonly logger = new Logger('RecorridoService');

    /**
     * Iniciar un nuevo recorrido de campo
     */
    async iniciarRecorrido(carnet: string, lat?: number, lon?: number) {
        this.logger.log(`[RECORRIDO] Iniciando para ${carnet}`);
        const result = await ejecutarSP(
            'sp_campo_iniciar_recorrido',
            {
                carnet: { valor: carnet, tipo: NVarChar(20) },
                lat: lat != null ? { valor: lat, tipo: Decimal(10, 7) } : null,
                lon: lon != null ? { valor: lon, tipo: Decimal(10, 7) } : null,
            },
            undefined,
            'RecorridoService.iniciarRecorrido',
        );
        return result[0] || { estado: 'ERROR', mensaje: 'Sin resultado' };
    }

    /**
     * Finalizar el recorrido activo
     */
    async finalizarRecorrido(
        carnet: string,
        lat?: number,
        lon?: number,
        notas?: string,
    ) {
        this.logger.log(`[RECORRIDO] Finalizando para ${carnet}`);
        const result = await ejecutarSP(
            'sp_campo_finalizar_recorrido',
            {
                carnet: { valor: carnet, tipo: NVarChar(20) },
                lat: lat != null ? { valor: lat, tipo: Decimal(10, 7) } : null,
                lon: lon != null ? { valor: lon, tipo: Decimal(10, 7) } : null,
                notas: notas ? { valor: notas, tipo: NVarChar(500) } : null,
            },
            undefined,
            'RecorridoService.finalizarRecorrido',
        );
        return result[0] || { estado: 'ERROR', mensaje: 'Sin resultado' };
    }

    /**
     * Registrar un punto GPS en el recorrido activo
     */
    async registrarPunto(
        carnet: string,
        punto: {
            lat: number;
            lon: number;
            accuracy?: number;
            velocidad_kmh?: number;
            tipo?: string;
            id_cliente?: number;
            notas?: string;
        },
    ) {
        const result = await ejecutarSP(
            'sp_campo_registrar_punto',
            {
                carnet: { valor: carnet, tipo: NVarChar(20) },
                lat: { valor: punto.lat, tipo: Decimal(10, 7) },
                lon: { valor: punto.lon, tipo: Decimal(10, 7) },
                accuracy:
                    punto.accuracy != null
                        ? { valor: punto.accuracy, tipo: Decimal(8, 2) }
                        : null,
                velocidad_kmh:
                    punto.velocidad_kmh != null
                        ? { valor: punto.velocidad_kmh, tipo: Decimal(6, 2) }
                        : null,
                tipo: punto.tipo
                    ? { valor: punto.tipo, tipo: NVarChar(20) }
                    : null,
                id_cliente: punto.id_cliente
                    ? { valor: punto.id_cliente, tipo: Int }
                    : null,
                notas: punto.notas
                    ? { valor: punto.notas, tipo: NVarChar(200) }
                    : null,
            },
            undefined,
            'RecorridoService.registrarPunto',
        );
        return result[0] || { ok: false };
    }

    /**
     * Registrar lote de puntos GPS (sync offline del móvil)
     */
    async registrarPuntosBatch(
        carnet: string,
        puntos: Array<{
            lat: number;
            lon: number;
            accuracy?: number;
            velocidad_kmh?: number;
            tipo?: string;
        }>,
    ) {
        let insertados = 0;
        for (const p of puntos) {
            const res = await this.registrarPunto(carnet, p);
            if (res?.ok) insertados++;
        }
        return { insertados, total: puntos.length };
    }

    /**
     * Obtener recorrido activo (EN_CURSO) para un usuario
     */
    async getRecorridoActivo(carnet: string) {
        const result = await ejecutarQuery(
            `SELECT r.*, 
        (SELECT COUNT(*) FROM campo_recorrido_puntos WHERE id_recorrido = r.id_recorrido) AS total_puntos,
        DATEDIFF(MINUTE, r.hora_inicio, GETDATE()) AS minutos_transcurridos
       FROM campo_recorridos r
       WHERE r.carnet = @carnet AND r.estado = 'EN_CURSO'`,
            { carnet: { valor: carnet, tipo: NVarChar(20) } },
            'RecorridoService.getRecorridoActivo',
        );
        return result[0] || null;
    }

    /**
     * Obtener puntos de un recorrido (para pintar el mapa)
     */
    async getPuntosRecorrido(idRecorrido: number) {
        return ejecutarQuery(
            `SELECT lat, lon, accuracy, velocidad_kmh, timestamp_gps, tipo, id_cliente, notas
       FROM campo_recorrido_puntos
       WHERE id_recorrido = @id
       ORDER BY timestamp_gps ASC`,
            { id: { valor: idRecorrido, tipo: Int } },
            'RecorridoService.getPuntosRecorrido',
        );
    }

    /**
     * Historial de recorridos de un usuario (últimos 30 días)
     */
    async getHistorialRecorridos(carnet: string) {
        return ejecutarQuery(
            `SELECT TOP 50 r.*,
        (SELECT COUNT(*) FROM campo_recorrido_puntos WHERE id_recorrido = r.id_recorrido) AS total_puntos
       FROM campo_recorridos r
       WHERE r.carnet = @carnet
         AND r.fecha >= DATEADD(DAY, -30, CAST(GETDATE() AS DATE))
       ORDER BY r.hora_inicio DESC`,
            { carnet: { valor: carnet, tipo: NVarChar(20) } },
            'RecorridoService.getHistorialRecorridos',
        );
    }

    /**
     * Admin: ver recorridos de todos (con nombre de colaborador)
     */
    async adminGetRecorridos(fecha?: string) {
        const f = fecha || new Date().toISOString().split('T')[0];
        return ejecutarQuery(
            `SELECT r.*, c.Colaborador AS nombre_colaborador,
        (SELECT COUNT(*) FROM campo_recorrido_puntos WHERE id_recorrido = r.id_recorrido) AS total_puntos
       FROM campo_recorridos r
       LEFT JOIN rrhh.Colaboradores c ON c.Carnet = r.carnet
       WHERE r.fecha = @fecha
       ORDER BY r.hora_inicio DESC`,
            { fecha: { valor: new Date(f), tipo: DateTime } },
            'RecorridoService.adminGetRecorridos',
        );
    }
}
