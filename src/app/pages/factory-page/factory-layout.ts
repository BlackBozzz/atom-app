import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js';
import type { Edge, Node } from 'ng-diagram';
import type { DistrictNodeData } from '../../components/district-node/district-node.model';
import type { InfrastructureNodeData } from '../../components/building-node/building-node.model';

export interface FactorySeedNode {
  id: string;
  type: 'building' | 'district';
  groupId?: string;
  isGroup?: boolean;
  data: InfrastructureNodeData | DistrictNodeData;
}

interface PlacedNode {
  seed: FactorySeedNode;
  x: number;
  y: number;
  width: number;
  height: number;
  children?: PlacedLevel;
}

interface PlacedLevel {
  width: number;
  height: number;
  nodes: PlacedNode[];
}

const elk = new ELK();

// Размеры шаблона building-node; дополнительное пространство оставлено под порты.
const BUILDING_WIDTH = 250;
const BUILDING_HEIGHT = 205;
const GROUP_PADDING_X = 32;
const GROUP_PADDING_TOP = 62;
const GROUP_PADDING_BOTTOM = 28;
const CANVAS_MARGIN = 60;

const layoutOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.spacing.nodeNode': '45',
  'elk.layered.spacing.nodeNodeBetweenLayers': '90',
  'elk.spacing.componentComponent': '50',
  'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
};

/** Вычисляет позиции всех зданий и районов без координат во входных данных. */
export async function layoutFactoryGraph(
  seeds: readonly FactorySeedNode[],
  edges: readonly Edge[],
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const byId = new Map(seeds.map((node) => [node.id, node]));
  if (byId.size !== seeds.length) throw new Error('Повторяющийся ID узла');
  for (const node of seeds) {
    if (node.groupId && byId.get(node.groupId)?.type !== 'district') {
      throw new Error(`Узел ${node.id}: район ${node.groupId} не найден`);
    }
  }

  // На уровне района внешние связи преобразуются в связи с группой только
  // для расчёта раскладки. Сами ng-diagram edges остаются без изменений.
  function childAtLevel(nodeId: string, parentId: string | undefined): string | undefined {
    let current = byId.get(nodeId);
    const visited = new Set<string>();
    while (current && current.groupId !== parentId) {
      if (visited.has(current.id)) throw new Error(`Цикл вложенности: ${current.id}`);
      visited.add(current.id);
      current = current.groupId ? byId.get(current.groupId) : undefined;
    }
    return current?.id;
  }

  const activeGroups = new Set<string>();

  async function layoutLevel(parentId?: string): Promise<PlacedLevel> {
    if (parentId && activeGroups.has(parentId)) throw new Error(`Цикл вложенности района: ${parentId}`);
    if (parentId) activeGroups.add(parentId);
    try {
      const children = seeds.filter((node) => node.groupId === parentId);
      const nested = new Map<string, PlacedLevel>();
      const sizes = new Map<string, { width: number; height: number }>();

      for (const child of children) {
        if (child.type === 'district') {
          const inner = await layoutLevel(child.id);
          nested.set(child.id, inner);
          sizes.set(child.id, {
            width: Math.max(280, inner.width + 2 * GROUP_PADDING_X),
            height: Math.max(160, inner.height + GROUP_PADDING_TOP + GROUP_PADDING_BOTTOM),
          });
        } else {
          sizes.set(child.id, { width: BUILDING_WIDTH, height: BUILDING_HEIGHT });
        }
      }

      const links = new Set<string>();
      const layoutEdges: NonNullable<ElkNode['edges']> = [];
      for (const edge of edges) {
        const source = childAtLevel(edge.source, parentId);
        const target = childAtLevel(edge.target, parentId);
        if (!source || !target || source === target) continue;
        const key = `${source}\u0000${target}`;
        if (links.has(key)) continue;
        links.add(key);
        layoutEdges.push({ id: `link-${layoutEdges.length}`, sources: [source], targets: [target] });
      }

      const graph: ElkNode = {
        id: parentId ?? 'factory-root',
        layoutOptions,
        children: children.map((child) => ({ id: child.id, ...sizes.get(child.id)! })),
        edges: layoutEdges,
      };
      const result = await elk.layout(graph);
      const positions = new Map(result.children?.map((node) => [node.id, node]));

      return {
        width: result.width ?? 0,
        height: result.height ?? 0,
        nodes: children.map((seed) => ({
          seed,
          x: positions.get(seed.id)?.x ?? 0,
          y: positions.get(seed.id)?.y ?? 0,
          ...sizes.get(seed.id)!,
          children: nested.get(seed.id),
        })),
      };
    } finally {
      if (parentId) activeGroups.delete(parentId);
    }
  }

  const top = await layoutLevel();
  const positioned: Node[] = [];

  function collect(level: PlacedLevel, left: number, top: number): void {
    for (const item of level.nodes) {
      const x = left + item.x;
      const y = top + item.y;
      const { seed } = item;
      const base = {
        id: seed.id,
        type: seed.type,
        position: { x, y },
        data: seed.data,
        ...(seed.groupId ? { groupId: seed.groupId } : {}),
      };
      positioned.push(seed.type === 'district'
        ? { ...base, isGroup: true, autoSize: false, size: { width: item.width, height: item.height } } as Node
        : base as Node);
      if (item.children) {
        collect(item.children, x + GROUP_PADDING_X, y + GROUP_PADDING_TOP);
      }
    }
  }

  collect(top, CANVAS_MARGIN, CANVAS_MARGIN);
  if (positioned.length !== seeds.length) throw new Error('Не все узлы диаграммы удалось разместить');
  return { nodes: positioned, edges: edges.map((edge) => ({ ...edge })) };
}
