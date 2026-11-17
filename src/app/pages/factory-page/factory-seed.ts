import { computeLayout } from '../../service/layout-engine';
import { DEFAULT_SETTINGS, LayoutEdgeInput, LayoutNodeInput } from '../../service/layout.types';
import { InfrastructureNodeData } from '../../components/building-node/building-node.model';
import { DistrictNodeData } from '../../components/district-node/district-node.model';

export interface SeedNode {
  id: string;
  type: 'district' | 'building';
  isGroup?: boolean;
  groupId?: string;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  data: DistrictNodeData | InfrastructureNodeData;
}

export interface SeedEdge {
  id: string;
  source: string;
  target: string;
  sourcePort: string;
  targetPort: string;
  data: Record<string, unknown>;
}

const b = (
  id: string,
  name: string,
  code: string,
  water: InfrastructureNodeData['waterStatus'],
  power: InfrastructureNodeData['electricityStatus'],
  load: number,
  groupId?: string,
): SeedNode => ({
  id,
  type: 'building',
  ...(groupId ? { groupId } : {}),
  position: { x: 0, y: 0 },
  data: {
    name,
    code,
    iconId: 'infra-station-icon',
    waterStatus: water,
    electricityStatus: power,
    load,
  } as InfrastructureNodeData,
});

const RAW_NODES: SeedNode[] = [
  {
    id: 'district-north',
    type: 'district',
    isGroup: true,
    position: { x: 0, y: 0 },
    size: { width: 900, height: 520 },
    data: {
      name: 'Район «Северный»',
      code: 'DST-01',
      iconId: 'icon-factory',
      isCollapsed: false,
    } as DistrictNodeData,
  },
  {
    id: 'district-south',
    type: 'district',
    isGroup: true,
    position: { x: 0, y: 0 },
    size: { width: 640, height: 400 },
    data: {
      name: 'Район «Заречный»',
      code: 'DST-02',
      iconId: 'icon-factory',
      isCollapsed: false,
    } as DistrictNodeData,
  },

  b('intake-a', 'Водозабор №1', 'SRC-W1', 'normal', 'normal', 74),
  b('substation-a', 'Подстанция 110 кВ', 'SRC-P1', 'normal', 'repair', 58),

  b('pump-1', 'Насосная П-1', 'BLD-101', 'normal', 'normal', 81, 'district-north'),
  b('treat-1', 'Очистные сооружения', 'BLD-102', 'repair', 'normal', 46, 'district-north'),
  b('tower-1', 'Водонапорная башня', 'BLD-103', 'normal', 'normal', 33, 'district-north'),
  b('block-a', 'Жилой квартал А', 'BLD-104', 'normal', 'emergency', 92, 'district-north'),
  b('block-b', 'Жилой квартал Б', 'BLD-105', 'normal', 'normal', 67, 'district-north'),
  b('depot', 'Ремонтное депо', 'BLD-106', 'repair', 'repair', 12, 'district-north'),

  b('pump-2', 'Насосная П-2', 'BLD-201', 'emergency', 'normal', 88, 'district-south'),
  b('clinic', 'Городская клиника', 'BLD-202', 'normal', 'normal', 54, 'district-south'),
  b('plant', 'Завод «Прогресс»', 'BLD-203', 'normal', 'emergency', 96, 'district-south'),

  b('consumer', 'Промзона «Восток»', 'SNK-01', 'normal', 'normal', 71),
  b('reserve', 'Резервный узел', 'SNK-02', 'normal', 'normal', 8),
];

const RAW_EDGES: SeedEdge[] = [
  {
    id: 'e-01',
    source: 'intake-a',
    target: 'pump-1',
    sourcePort: 'port-water-out',
    targetPort: 'port-water-in',
    data: {},
  },
  {
    id: 'e-02',
    source: 'substation-a',
    target: 'pump-1',
    sourcePort: 'port-electricity-out',
    targetPort: 'port-electricity-in',
    data: {},
  },
  {
    id: 'e-03',
    source: 'pump-1',
    target: 'treat-1',
    sourcePort: 'port-water-out',
    targetPort: 'port-water-in',
    data: {},
  },
  {
    id: 'e-04',
    source: 'treat-1',
    target: 'tower-1',
    sourcePort: 'port-water-out',
    targetPort: 'port-water-in',
    data: {},
  },
  {
    id: 'e-05',
    source: 'tower-1',
    target: 'block-a',
    sourcePort: 'port-water-out',
    targetPort: 'port-water-in',
    data: {},
  },
  {
    id: 'e-06',
    source: 'tower-1',
    target: 'block-b',
    sourcePort: 'port-water-out',
    targetPort: 'port-water-in',
    data: {},
  },
  {
    id: 'e-07',
    source: 'substation-a',
    target: 'block-a',
    sourcePort: 'port-electricity-out',
    targetPort: 'port-electricity-in',
    data: {},
  },
  {
    id: 'e-08',
    source: 'substation-a',
    target: 'depot',
    sourcePort: 'port-electricity-out',
    targetPort: 'port-electricity-in',
    data: {},
  },
  {
    id: 'e-09',
    source: 'intake-a',
    target: 'pump-2',
    sourcePort: 'port-water-out',
    targetPort: 'port-water-in',
    data: {},
  },
  {
    id: 'e-10',
    source: 'pump-2',
    target: 'clinic',
    sourcePort: 'port-water-out',
    targetPort: 'port-water-in',
    data: {},
  },
  {
    id: 'e-11',
    source: 'pump-2',
    target: 'plant',
    sourcePort: 'port-water-out',
    targetPort: 'port-water-in',
    data: {},
  },
  {
    id: 'e-12',
    source: 'substation-a',
    target: 'plant',
    sourcePort: 'port-electricity-out',
    targetPort: 'port-electricity-in',
    data: {},
  },
  {
    id: 'e-13',
    source: 'block-b',
    target: 'consumer',
    sourcePort: 'port-water-out',
    targetPort: 'port-water-in',
    data: {},
  },
  {
    id: 'e-14',
    source: 'plant',
    target: 'consumer',
    sourcePort: 'port-electricity-out',
    targetPort: 'port-electricity-in',
    data: {},
  },
  {
    id: 'e-15',
    source: 'clinic',
    target: 'reserve',
    sourcePort: 'port-water-out',
    targetPort: 'port-water-in',
    data: {},
  },
];

/**
 * Позиции считаются СИНХРОННО до создания модели.
 * Даже если отложенный пересчёт не сработает, узлы никогда не окажутся в (0,0).
 */
export function buildSeededModel(nodeWidth = 260): { nodes: SeedNode[]; edges: SeedEdge[] } {
  const inputs: LayoutNodeInput[] = RAW_NODES.map((n) => ({
    id: n.id,
    width: n.isGroup ? (n.size?.width ?? 700) : nodeWidth,
    height: n.isGroup ? (n.size?.height ?? 420) : 158,
    parentId: n.groupId,
    isGroup: Boolean(n.isGroup),
    collapsed: Boolean((n.data as DistrictNodeData).isCollapsed),
    hidden: false,
  }));

  const edges: LayoutEdgeInput[] = RAW_EDGES.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
  }));
  const result = computeLayout(inputs, edges, DEFAULT_SETTINGS);
  const pos = new Map(result.nodes.map((p) => [p.id, p]));

  const nodes = RAW_NODES.map((n) => {
    const p = pos.get(n.id);
    return {
      ...n,
      position: { x: p?.x ?? 80, y: p?.y ?? 80 },
      ...(n.isGroup && p?.width && p?.height ? { size: { width: p.width, height: p.height } } : {}),
    };
  });

  return { nodes, edges: RAW_EDGES.map((e) => ({ ...e })) };
}

export const SEED_SNAPSHOT = buildSeededModel();
