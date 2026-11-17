import { DistrictNodeData } from '../components/district-node/district-node.model';
import {
  InfrastructureNodeData,
  toResourceStatus,
} from '../components/building-node/building-node.model';

export function readData<T>(raw: unknown): T {
  return (raw ?? {}) as unknown as T;
}

export function readDistrict(raw: unknown): DistrictNodeData {
  const d = readData<Partial<DistrictNodeData>>(raw);
  return {
    name: d.name ?? 'Без названия',
    iconId: d.iconId,
    isHighlighted: Boolean(d.isHighlighted),
    isCollapsed: Boolean(d.isCollapsed),
    expandedSize: d.expandedSize,
    code: d.code,
  };
}

export function readBuilding(raw: unknown): InfrastructureNodeData {
  const d = readData<Partial<InfrastructureNodeData>>(raw);
  return {
    name: d.name ?? 'Без названия',
    iconId: d.iconId,
    waterStatus: toResourceStatus(d.waterStatus),
    electricityStatus: toResourceStatus(d.electricityStatus),
    isHighlighted: Boolean(d.isHighlighted),
    load: typeof d.load === 'number' ? d.load : 62,
    code: d.code,
  };
}
