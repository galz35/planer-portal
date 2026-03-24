import { Injectable } from '@nestjs/common';
import { ejecutarSP, NVarChar, DateTime } from '../../db/base.repo';
import { GpsPointDto } from '../dto/batch-tracking.dto';

@Injectable()
export class TrackingRepo {
  async insertarLoteGps(carnet: string, puntos: GpsPointDto[]) {
    return await ejecutarSP(
      'sp_vc_tracking_batch',
      {
        carnet: { valor: carnet, tipo: NVarChar(20) },
        puntos: { valor: JSON.stringify(puntos), tipo: NVarChar },
      },
      undefined,
      'TrackingRepo.insertarLoteGps',
    );
  }

  async calculoKmDia(carnet: string, fecha?: string) {
    return await ejecutarSP(
      'sp_vc_calculo_km_dia',
      {
        carnet: { valor: carnet, tipo: NVarChar(20) },
        fecha: fecha ? { valor: new Date(fecha), tipo: DateTime } : null,
      },
      undefined,
      'TrackingRepo.calculoKmDia',
    );
  }

  async obtenerTrackingRaw(carnet: string, fecha?: string) {
    return await ejecutarSP(
      'sp_vc_tracking_por_dia',
      {
        carnet: { valor: carnet, tipo: NVarChar(20) },
        fecha: fecha ? { valor: new Date(fecha), tipo: DateTime } : null,
      },
      undefined,
      'TrackingRepo.obtenerTrackingRaw',
    );
  }

  async obtenerUsuariosConTracking() {
    return await ejecutarSP(
      'sp_vc_usuarios_con_tracking',
      {},
      undefined,
      'TrackingRepo.obtenerUsuariosConTracking',
    );
  }
}
