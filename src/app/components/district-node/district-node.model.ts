export interface DistrictNodeData {
  name: string;
  iconId?: string;
  isHighlighted?: boolean;
  isCollapsed?: boolean;
  expandedSize?: { width: number; height: number };
  code?: string;
}

/** Метаданные ребра при перенаправлении на район. */
export interface EdgeRedirectMeta {
  redirected?: boolean;
  originalSource?: string;
  originalTarget?: string;
  [key: string]: unknown;
}
