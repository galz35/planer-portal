export interface GpsPointDto {
  lat: number;
  lon: number;
  accuracy?: number;
  velocidad?: number;
  timestamp: string;
  fuente?: string;
}

export class BatchTrackingDto {
  puntos: GpsPointDto[];
}
