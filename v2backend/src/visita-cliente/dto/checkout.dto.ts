export class CheckoutDto {
  visita_id: number;
  lat?: number;
  lon?: number;
  accuracy?: number;
  timestamp?: string;
  observacion?: string;
  foto_path?: string;
  firma_path?: string;
}
