export type ResourceKind = 'water' | 'electricity';
export type ResourceStatus = 'normal' | 'emergency' | 'repair';

export interface InfrastructureNodeData {
  name: string;
  iconId?: string;
  status?: Partial<Record<ResourceKind, ResourceStatus>>;
  // Совместимость с существующими данными.
  waterStatus?: ResourceStatus;
  electricityStatus?: ResourceStatus;
  isHighlighted?: boolean;
}
