export class ImportarClientesDto {
  // Definimos el payload que llegará cuando suban un Excel convertido en JSON.
  clientes: Array<{
    codigo: string;
    nombre: string;
    direccion?: string;
    telefono?: string;
    contacto?: string;
    lat?: number;
    long?: number;
    radio_metros?: number;
    zona?: string;
  }>;
}
