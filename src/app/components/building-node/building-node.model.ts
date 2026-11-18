export type ResourceKind = 'water' | 'electricity';
export type ResourceStatus = 'normal' | 'warning' | 'emergency';

export interface InfrastructureNodeData {
  name: string;
  iconId?: string;
  status?: Partial<Record<ResourceKind, ResourceStatus | undefined>>;
  isHighlighted?: boolean;
}
