export class CheckinDto {
  cliente_id: number;
  lat: number;
  lon: number;
  accuracy?: number;
  timestamp?: string;
  agenda_id?: number;
  offline_id?: string;
}
