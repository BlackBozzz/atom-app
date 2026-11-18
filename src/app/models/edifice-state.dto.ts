/** JSON, возвращаемый GET /api/edifices/status/current. */
export type ResourceTypeDto = 'water' | 'electricity';

export interface StatusDto {
  idStatus: number;
  name: string;
  occurredAt: string | null;
}

export interface ResourceStatusDto {
  resourceType: string;
  status: StatusDto | null;
}

export interface DependencyStatusDto {
  idDependence: number;
  resourceType: string;
  sourceId: number;
  dependentId: number;
  status: StatusDto | null;
}

export interface EdificeStateDto {
  idEdifice: number;
  name: string;
  resourceTypes: string[];
  district: string | null;
  street: string | null;
  houseNumber: string | null;
  resources: ResourceStatusDto[];
  dependencies: DependencyStatusDto[];
}
