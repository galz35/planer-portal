import { Injectable } from '@nestjs/common';
import { ejecutarQuery, Int, Bit, SqlDate, NVarChar } from '../db/base.repo';
import { FocoAgregarDto, FocoActualizarDto } from './dto/clarity.dtos';

@Injectable()
export class FocoService {
  async getFocoDelDia(idUsuario: number, fecha: string) {
    const sql = `
            SELECT f.idFoco, f.idTarea, f.fecha, f.esEstrategico, f.completado, f.orden,
                   t.nombre as tituloTarea, t.estado as estadoTarea
            FROM p_FocoDiario_v2 f
            INNER JOIN p_Tareas t ON f.idTarea = t.idTarea
            WHERE f.idUsuario = @idUsuario AND CAST(f.fecha AS DATE) = CAST(@fecha AS DATE)
            ORDER BY f.orden ASC
        `;
    return ejecutarQuery(sql, {
      idUsuario: { valor: idUsuario, tipo: Int },
      fecha: { valor: fecha, tipo: NVarChar },
    });
  }

  async agregarAlFoco(idUsuario: number, dto: FocoAgregarDto) {
    // Verificar si ya existe
    const checkSql = `
            SELECT idFoco FROM p_FocoDiario_v2 
            WHERE idUsuario = @idUsuario AND idTarea = @idTarea AND CAST(fecha AS DATE) = CAST(@fecha AS DATE)
        `;
    const existing = await ejecutarQuery(checkSql, {
      idUsuario: { valor: idUsuario, tipo: Int },
      idTarea: { valor: dto.idTarea, tipo: Int },
      fecha: { valor: dto.fecha, tipo: NVarChar },
    });

    if (existing && existing.length > 0) return existing[0];

    // Obtener max orden
    const maxOrdenSql = `
            SELECT COALESCE(MAX(orden), 0) + 1 as nextOrden
            FROM p_FocoDiario_v2
            WHERE idUsuario = @idUsuario AND CAST(fecha AS DATE) = CAST(@fecha AS DATE)
        `;
    const resOrden = await ejecutarQuery(maxOrdenSql, {
      idUsuario: { valor: idUsuario, tipo: Int },
      fecha: { valor: dto.fecha, tipo: NVarChar },
    });
    const nextOrden = resOrden[0]?.nextOrden || 1;

    const insertSql = `
            INSERT INTO p_FocoDiario_v2 (idUsuario, idTarea, fecha, esEstrategico, completado, orden, creadoEn)
            VALUES (@idUsuario, @idTarea, @fecha, @esEstrategico, 0, @orden, GETDATE());
            SELECT SCOPE_IDENTITY() as id;
        `;

    return ejecutarQuery(insertSql, {
      idUsuario: { valor: idUsuario, tipo: Int },
      idTarea: { valor: dto.idTarea, tipo: Int },
      fecha: { valor: dto.fecha, tipo: NVarChar },
      esEstrategico: { valor: dto.esEstrategico ? 1 : 0, tipo: Bit },
      orden: { valor: nextOrden, tipo: Int },
    });
  }

  async actualizarFoco(
    idFoco: number,
    idUsuario: number,
    dto: FocoActualizarDto,
    fecha?: string,
  ) {
    const updates: string[] = [];
    const params: any = {
      idFoco: { valor: idFoco, tipo: Int },
      idUsuario: { valor: idUsuario, tipo: Int },
    };

    if (dto.esEstrategico !== undefined) {
      updates.push('esEstrategico = @esEstrategico');
      params.esEstrategico = { valor: dto.esEstrategico ? 1 : 0, tipo: Bit };
    }
    if (dto.completado !== undefined) {
      updates.push('completado = @completado');
      params.completado = { valor: dto.completado ? 1 : 0, tipo: Bit };
    }

    if (updates.length === 0) return { success: true };

    const sql = `
            UPDATE p_FocoDiario_v2
            SET ${updates.join(', ')}
            WHERE idFoco = @idFoco AND idUsuario = @idUsuario
        `;

    await ejecutarQuery(sql, params);

    if (fecha) {
      return this.getFocoDelDia(idUsuario, fecha);
    }
    return { success: true };
  }

  async quitarDelFoco(idFoco: number, idUsuario: number) {
    const sql = `DELETE FROM p_FocoDiario_v2 WHERE idFoco = @idFoco AND idUsuario = @idUsuario`;
    return ejecutarQuery(sql, {
      idFoco: { valor: idFoco, tipo: Int },
      idUsuario: { valor: idUsuario, tipo: Int },
    });
  }

  async reordenarFocos(idUsuario: number, fecha: string, ids: number[]) {
    const queries: string[] = [];
    for (let i = 0; i < ids.length; i++) {
      queries.push(
        `UPDATE p_FocoDiario_v2 SET orden = ${i + 1} WHERE idFoco = ${ids[i]} AND idUsuario = @idUsuario`,
      );
    }

    const sql = queries.join('; ');
    const updSql = sql.replace(/@idUsuario/g, idUsuario.toString()); // Simple replace for batch if using raw string
    return ejecutarQuery(updSql);
  }

  async getEstadisticasFoco(idUsuario: number, month: number, year: number) {
    const sql = `
            SELECT 
                COUNT(*) as totalItems,
                SUM(CASE WHEN completado = 1 THEN 1 ELSE 0 END) as completados
            FROM p_FocoDiario_v2
            WHERE idUsuario = @idUsuario 
              AND MONTH(fecha) = @month AND YEAR(fecha) = @year
        `;
    const res = await ejecutarQuery(sql, {
      idUsuario: { valor: idUsuario, tipo: Int },
      month: { valor: month, tipo: Int },
      year: { valor: year, tipo: Int },
    });

    const total = res[0]?.totalItems || 0;
    const completados = res[0]?.completados || 0;

    return {
      totalItems: total,
      completados: completados,
      efectividad: total > 0 ? (completados / total) * 100 : 0,
    };
  }
}
