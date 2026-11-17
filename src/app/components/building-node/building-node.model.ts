export type ResourceStatus = 'normal' | 'emergency' | 'repair';

export interface InfrastructureNodeData {
  name: string;
  iconId?: string;
  waterStatus: ResourceStatus;
  electricityStatus: ResourceStatus;
  isHighlighted?: boolean;
  load?: number;
  code?: string;
}

export const STATUS_META: Record<ResourceStatus, { label: string; icon: string; tone: string }> = {
  normal: { label: 'Норма', icon: 'status-normal', tone: 'ok' },
  emergency: { label: 'Авария', icon: 'status-emergency', tone: 'danger' },
  repair: { label: 'Ремонт', icon: 'status-repair', tone: 'warn' },
};
