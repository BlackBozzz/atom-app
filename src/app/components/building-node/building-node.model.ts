export type ResourceStatus = 'normal' | 'emergency' | 'repair';

/** Единственный источник истины для списка статусов. */
export const RESOURCE_STATUSES = [
  'normal',
  'emergency',
  'repair',
] as const satisfies readonly ResourceStatus[];

export interface InfrastructureNodeData {
  name: string;
  iconId?: string;
  waterStatus: ResourceStatus;
  electricityStatus: ResourceStatus;
  isHighlighted?: boolean;
  load?: number;
  code?: string;
}

export const STATUS_META: Record<ResourceStatus, { label: string; icon: string }> = {
  normal: { label: 'Норма', icon: 'status-normal' },
  emergency: { label: 'Авария', icon: 'status-emergency' },
  repair: { label: 'Ремонт', icon: 'status-repair' },
};

export function toResourceStatus(value: unknown): ResourceStatus {
  return typeof value === 'string' && (RESOURCE_STATUSES as readonly string[]).includes(value)
    ? (value as ResourceStatus)
    : 'normal';
}
