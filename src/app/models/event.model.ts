export interface EventDto {
  idEvent: number;
  idEdifice: number;
  edificeName: string;
  resourceType: string;
  occurredAt: string;          // ISO LocalDateTime (без зоны)
  idStatus: number;
  statusName: string;
  syncedAt: string;
}

export interface LastEventDto {
  idEvent: number;
  idEdifice: number;
  edificeName: string;
  resourceType: string;
  occurredAt: string;
  idStatus: number;
  statusName: string;
  syncedAt: string;
}

export interface EventQuery {
  idEdifice?: number;
  idStatus?: number;
  from?: string;               // ISO LocalDateTime
  to?: string;
}

export interface EventStatusDto {
  idStatus: number;
  name: string;
  syncedAt?: string;
}

export interface EdificeDependencyDto {
  idDependence: number;
  resourceType: string;
  idEdificeSource: number;
  sourceName: string;
  idEdificeDependent: number;
  dependentName: string;
  syncedAt: string;
}

export interface EdificeDependencyQuery {
  idSource?: number;
  idDependent?: number;
}
