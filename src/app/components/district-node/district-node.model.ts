export interface DistrictNodeData {
  name: string;
  iconId?: string;
  isHighlighted?: boolean;
  isCollapsed?: boolean;
  expandedSize?: { width: number; height: number };
  code?: string;
}

/** Метаданные ребра при перенаправлении на группу. */
export interface EdgeRedirectMeta {
  originalSource?: string;
  originalTarget?: string;
  redirected?: boolean;
  [key: string]: unknown;
}
