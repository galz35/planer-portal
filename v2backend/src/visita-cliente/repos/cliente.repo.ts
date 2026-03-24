import { Injectable } from '@nestjs/common';
import {
  ejecutarSP,
  ejecutarQuery,
  NVarChar,
  Int,
  Decimal,
  Bit,
} from '../../db/base.repo';

@Injectable()
export class ClienteRepo {
  async importarClientes(clientesJson: string) {
    return await ejecutarSP(
      'sp_vc_importar_clientes',
      {
        clientes_json: { valor: clientesJson, tipo: NVarChar },
      },
      undefined,
      'ClienteRepo.importarClientes',
    );
  }

  async listarTodos() {
    return await ejecutarQuery(
      'SELECT * FROM vc_clientes WHERE activo = 1 ORDER BY nombre',
    );
  }

  async crearCliente(data: any) {
    return await ejecutarSP(
      'sp_vc_cliente_crear',
      {
        codigo: { valor: data.codigo, tipo: NVarChar(50) },
        nombre: { valor: data.nombre, tipo: NVarChar(200) },
        direccion: { valor: data.direccion, tipo: NVarChar(500) },
        telefono: { valor: data.telefono, tipo: NVarChar(20) },
        contacto: { valor: data.contacto, tipo: NVarChar(100) },
        lat:
          data.lat !== undefined
            ? { valor: data.lat, tipo: Decimal(10, 7) }
            : null,
        long:
          data.long !== undefined
            ? { valor: data.long, tipo: Decimal(10, 7) }
            : null,
        radio_metros: { valor: data.radio_metros || 100, tipo: Int },
        zona: { valor: data.zona, tipo: NVarChar(100) },
      },
      undefined,
      'ClienteRepo.crearCliente',
    );
  }

  async actualizarCliente(id: number, data: any) {
    return await ejecutarSP(
      'sp_vc_cliente_actualizar',
      {
        id: { valor: id, tipo: Int },
        codigo: { valor: data.codigo, tipo: NVarChar(50) },
        nombre: { valor: data.nombre, tipo: NVarChar(200) },
        direccion: { valor: data.direccion, tipo: NVarChar(500) },
        telefono: { valor: data.telefono, tipo: NVarChar(20) },
        contacto: { valor: data.contacto, tipo: NVarChar(100) },
        lat:
          data.lat !== undefined
            ? { valor: data.lat, tipo: Decimal(10, 7) }
            : null,
        long:
          data.long !== undefined
            ? { valor: data.long, tipo: Decimal(10, 7) }
            : null,
        radio_metros: { valor: data.radio_metros || 100, tipo: Int },
        zona: { valor: data.zona, tipo: NVarChar(100) },
        activo:
          data.activo !== undefined
            ? { valor: data.activo ? 1 : 0, tipo: Bit }
            : null,
      },
      undefined,
      'ClienteRepo.actualizarCliente',
    );
  }

  async eliminarCliente(id: number) {
    return await ejecutarSP(
      'sp_vc_cliente_eliminar',
      {
        id: { valor: id, tipo: Int },
      },
      undefined,
      'ClienteRepo.eliminarCliente',
    );
  }
}
