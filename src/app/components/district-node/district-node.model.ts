export interface DistrictNodeData {
  name: string;
  iconId?: string;
  isHighlighted?: boolean;
  isCollapsed?: boolean;
  expandedSize?: { width: number; height: number };
  visibleChildIds?: string[];
}
