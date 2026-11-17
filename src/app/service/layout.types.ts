export type LayoutMode = 'layered' | 'organic' | 'radial' | 'grid';
export type LayoutDirection = 'LR' | 'RL' | 'TB' | 'BT';

export interface LayoutNodeInput {
  id: string;
  width: number;
  height: number;
  parentId?: string;
  isGroup: boolean;
  collapsed: boolean;
  hidden: boolean;
}

export interface LayoutEdgeInput {
  id: string;
  source: string;
  target: string;
}

export interface LayoutSettings {
  mode: LayoutMode;
  direction: LayoutDirection;
  layerGap: number;
  nodeGap: number;
  groupPadding: number;
  groupHeader: number;
  relaxation: number;
  iterations: number;
  seed: number;
}

export interface LayoutPoint {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  isGroup: boolean;
}

export interface LayoutStats {
  nodes: number;
  groups: number;
  edges: number;
  layers: number;
  crossings: number;
  width: number;
  height: number;
  ms: number;
}

export interface LayoutResult {
  nodes: LayoutPoint[];
  stats: LayoutStats;
}

export const DEFAULT_SETTINGS: LayoutSettings = {
  mode: 'layered',
  direction: 'LR',
  layerGap: 130,
  nodeGap: 46,
  groupPadding: 34,
  groupHeader: 52,
  relaxation: 0.35,
  iterations: 14,
  seed: 7,
};
