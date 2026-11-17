export interface EdificeDto {
  idEdifice: number;
  name: string;
  resourceType: string[];      // varchar[] на бэке
  district?: string | null;
  street?: string | null;
  houseNumber?: string | null;
  syncedAt: string;            // ISO Instant
}

export interface EdificeQuery {
  district?: string;
  street?: string;
}
