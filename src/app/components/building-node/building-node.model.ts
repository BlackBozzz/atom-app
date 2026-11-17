export type ResourceStatus = 'normal' | 'emergency' | 'repair';

export interface InfrastructureNodeData {
  name: string;
  iconId?: string;
  waterStatus: ResourceStatus;
  electricityStatus: ResourceStatus;
  isHighlighted?: boolean;
}
