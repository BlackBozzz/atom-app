import ELK, { type ElkNode, type ElkPoint, type ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
import type { Edge, Node, Point } from 'ng-diagram';
import type { DistrictNodeData } from '../../components/district-node/district-node.model';
import type { InfrastructureNodeData } from '../../components/building-node/building-node.model';

export interface FactorySeedNode {
  id: string;
  type: 'building' | 'district';
  groupId?: string;
  isGroup?: boolean;
  data: InfrastructureNodeData | DistrictNodeData;
}

const elk = new ELK();

// Размеры соответствуют building-node.scss: шапка 46px + две строки по 54px.
// Координаты портов берутся из building-node.html (слева вход, справа выход).
const BUILDING_WIDTH = 250;
const BUILDING_HEIGHT = 154;
const PORT_SIZE = 10;
const PORT_CENTER_Y = { water: 73, electricity: 127 } as const;
const CANVAS_MARGIN = 60;

// ВАЖНО: один ELK-расчёт для ВСЕХ районов и рёбер.
// Раздельная раскладка районов не учитывала реальные межрайонные линии,
// а ng-diagram потом строил новые маршруты прямо через чужие здания.
const layoutOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.layered.crossingMinimization.greedySwitchHierarchical.type': 'TWO_SIDED',
  'elk.layered.crossingMinimization.hierarchicalSweepiness': '0.8',
  'elk.layered.thoroughness': '30',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.nodePlacement.favorStraightEdges': 'true',
  'elk.spacing.nodeNode': '64',
  'elk.spacing.edgeNode': '28',
  'elk.spacing.edgeEdge': '14',
  'elk.layered.spacing.nodeNodeBetweenLayers': '145',
  'elk.layered.spacing.edgeNodeBetweenLayers': '32',
  'elk.layered.spacing.edgeEdgeBetweenLayers': '16',
  'elk.spacing.componentComponent': '100',
};

function createPorts(id: string): NonNullable<ElkNode['ports']> {
  return (['water', 'electricity'] as const).flatMap((resource) => [
    {
      id: `${id}.port-${resource}-in`,
      x: -PORT_SIZE / 2,
      y: PORT_CENTER_Y[resource] - PORT_SIZE / 2,
      width: PORT_SIZE,
      height: PORT_SIZE,
    },
    {
      id: `${id}.port-${resource}-out`,
      x: BUILDING_WIDTH - PORT_SIZE / 2,
      y: PORT_CENTER_Y[resource] - PORT_SIZE / 2,
      width: PORT_SIZE,
      height: PORT_SIZE,
    },
  ]);
}

function point(p: ElkPoint, origin: Point): Point {
  return { x: p.x + origin.x, y: p.y + origin.y };
}

function routedPoints(edge: ElkExtendedEdge | undefined, origins: ReadonlyMap<string, Point>): Point[] | undefined {
  // Для обычного ребра ELK возвращает один section с bendPoints,
  // включая повороты для обхода зданий и границ районов.
  const section = edge?.sections?.length === 1 ? edge.sections[0] : undefined;
  if (!section) return undefined;
  const route = [section.startPoint, ...(section.bendPoints ?? []), section.endPoint];
  // ELK возвращает sections в координатах edge.container (не всегда root).
  // В частности, локальные связи внутри района привязаны к координатам района.
  const origin = origins.get(edge!.container ?? 'factory-root');
  if (!origin) throw new Error(`ELK: не найден контейнер связи ${edge!.id}`);
  return route.map((p) => point(p, origin));
}

/** Истинное пересечение двух ортогональных сегментов, не считая общих концов. */
function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const eps = 0.1;
  if (Math.abs(a.x - b.x) < eps && Math.abs(c.y - d.y) < eps) {
    return a.x > Math.min(c.x, d.x) + eps && a.x < Math.max(c.x, d.x) - eps
      && c.y > Math.min(a.y, b.y) + eps && c.y < Math.max(a.y, b.y) - eps;
  }
  if (Math.abs(a.y - b.y) < eps && Math.abs(c.x - d.x) < eps) {
    return c.x > Math.min(a.x, b.x) + eps && c.x < Math.max(a.x, b.x) - eps
      && a.y > Math.min(c.y, d.y) + eps && a.y < Math.max(c.y, d.y) - eps;
  }
  return false;
}

function intersectsBuilding(a: Point, b: Point, building: Node): boolean {
  const { x, y } = building.position;
  const width = building.size?.width ?? BUILDING_WIDTH;
  const height = building.size?.height ?? BUILDING_HEIGHT;
  const eps = 0.1;
  if (Math.abs(a.x - b.x) < eps) {
    return a.x > x + eps && a.x < x + width - eps
      && Math.max(a.y, b.y) > y + eps && Math.min(a.y, b.y) < y + height - eps;
  }
  if (Math.abs(a.y - b.y) < eps) {
    return a.y > y + eps && a.y < y + height - eps
      && Math.max(a.x, b.x) > x + eps && Math.min(a.x, b.x) < x + width - eps;
  }
  return false;
}

/** Оценивает маршруты по пересечениям зданий, линий и суммарной длине. */
function layoutCost(nodes: readonly Node[], edges: readonly Edge[]): number {
  const buildings = nodes.filter((node) => node.type === 'building');
  let buildingHits = 0;
  let wireCrossings = 0;
  let length = 0;
  for (const edge of edges) {
    const points = edge.points ?? [];
    if (points.length < 2) buildingHits += 1000;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      length += Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
      for (const building of buildings) {
        if (building.id === edge.source || building.id === edge.target) continue;
        if (intersectsBuilding(a, b, building)) buildingHits++;
      }
    }
  }
  for (let i = 0; i < edges.length; i++) {
    const first = edges[i];
    for (let j = i + 1; j < edges.length; j++) {
      const second = edges[j];
      // Общие входные/выходные порты неизбежно собирают несколько линий.
      if (first.source === second.source || first.target === second.target) continue;
      const ap = first.points ?? [];
      const bp = second.points ?? [];
      for (let a = 1; a < ap.length; a++) {
        for (let b = 1; b < bp.length; b++) {
          if (segmentsCross(ap[a - 1], ap[a], bp[b - 1], bp[b])) wireCrossings++;
        }
      }
    }
  }
  // Сначала исключаем линии через здания, затем минимизируем пересечения
  // между линиями; длина пути служит критерием выбора при равном счёте.
  return buildingHits * 1e9 + wireCrossings * 1e6 + length;
}

/** Рассчитывает одновременно расположение зданий, районов и трассировку всех линий. */
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

  // Количество связей у здания влияет на порядок обхода при минимизации
  // пересечений. ELK использует эвристики, поэтому сравниваем несколько
  // исходных порядков и выбираем самый чистый получившийся маршрут.
  const degree = new Map(seeds.map((node) => [node.id, 0]));
  const elkEdges: ElkExtendedEdge[] = edges.map((edge) => {
    if (!byId.has(edge.source) || !byId.has(edge.target)) {
      throw new Error(`Связь ${edge.id}: отсутствует здание-источник или получатель`);
    }
    degree.set(edge.source, degree.get(edge.source)! + 1);
    degree.set(edge.target, degree.get(edge.target)! + 1);
    const source = byId.get(edge.source)!;
    const target = byId.get(edge.target)!;
    return {
      id: edge.id,
      sources: [source.type === 'building' && edge.sourcePort
        ? `${edge.source}.${edge.sourcePort}` : edge.source],
      targets: [target.type === 'building' && edge.targetPort
        ? `${edge.target}.${edge.targetPort}` : edge.target],
    };
  });

  async function calculate(orderedSeeds: readonly FactorySeedNode[]): Promise<{ nodes: Node[]; edges: Edge[] }> {
    // Строим настоящее compound-дерево ELK, а не отдельно раскладываем районы.
    const buildChildren = (parentId: string | undefined, ancestors: ReadonlySet<string>): ElkNode[] =>
      orderedSeeds.filter((seed) => seed.groupId === parentId).map((seed): ElkNode => {
        if (ancestors.has(seed.id)) throw new Error(`Цикл вложенности: ${seed.id}`);
        if (seed.type === 'building') {
          return {
            id: seed.id,
            width: BUILDING_WIDTH,
            height: BUILDING_HEIGHT,
            layoutOptions: { 'elk.portConstraints': 'FIXED_POS' },
            ports: createPorts(seed.id),
          };
        }
        return {
          id: seed.id,
          layoutOptions: { 'elk.padding': '[top=64,left=42,bottom=35,right=42]' },
          children: buildChildren(seed.id, new Set([...ancestors, seed.id])),
        };
      });

    const result = await elk.layout({
      id: 'factory-root', layoutOptions,
      children: buildChildren(undefined, new Set()),
      edges: elkEdges.map((edge) => ({ ...edge, sources: [...edge.sources], targets: [...edge.targets] })),
    });

    const positioned: Node[] = [];
    const origins = new Map<string, Point>([['factory-root', { x: CANVAS_MARGIN, y: CANVAS_MARGIN }]]);
    function collect(children: readonly ElkNode[], offsetX: number, offsetY: number): void {
      for (const item of children) {
        const seed = byId.get(item.id);
        if (!seed) throw new Error(`ELK вернул неизвестный узел: ${item.id}`);
        const x = offsetX + (item.x ?? 0);
        const y = offsetY + (item.y ?? 0);
        origins.set(item.id, { x, y });
        const base = {
          id: seed.id, type: seed.type, position: { x, y }, data: seed.data,
          ...(seed.groupId ? { groupId: seed.groupId } : {}),
        };
        positioned.push(seed.type === 'district'
          ? {
            ...base, isGroup: true, autoSize: false,
            size: { width: item.width ?? 280, height: item.height ?? 160 },
          } as Node
          : { ...base, size: { width: BUILDING_WIDTH, height: BUILDING_HEIGHT } } as Node);
        if (item.children) collect(item.children, x, y);
      }
    }
    collect(result.children ?? [], CANVAS_MARGIN, CANVAS_MARGIN);
    if (positioned.length !== seeds.length) throw new Error('Не все узлы диаграммы удалось разместить');

    const routed = new Map(result.edges?.map((edge) => [edge.id, routedPoints(edge, origins)]));
    const buildings = new Map(positioned.filter((node) => node.type === 'building').map((node) => [node.id, node]));
    const routedEdges = edges.map((edge) => {
      const points = routed.get(edge.id);
      if (!points || points.length < 2) return { ...edge };
      // ELK даёт координату внешней границы 10px порта; для ng-diagram
      // ставим первую и последнюю точки точно в центр видимой точки порта.
      const source = buildings.get(edge.source);
      const target = buildings.get(edge.target);
      const sourceResource = edge.sourcePort?.includes('water') ? 'water' : 'electricity';
      const targetResource = edge.targetPort?.includes('water') ? 'water' : 'electricity';
      if (source && edge.sourcePort) {
        points[0] = { x: source.position.x + BUILDING_WIDTH, y: source.position.y + PORT_CENTER_Y[sourceResource] };
      }
      if (target && edge.targetPort) {
        points[points.length - 1] = { x: target.position.x, y: target.position.y + PORT_CENTER_Y[targetResource] };
      }
      // В manual-режиме ng-diagram отрисовывает точки ELK без пересчёта пути.
      return { ...edge, points, routingMode: 'manual' as const, routing: 'orthogonal' };
    });
    return { nodes: positioned, edges: routedEdges };
  }

  const byName = (a: FactorySeedNode, b: FactorySeedNode) => a.id.localeCompare(b.id);
  const byDegree = (descending: boolean) => (a: FactorySeedNode, b: FactorySeedNode) =>
    (degree.get(a.id)! - degree.get(b.id)!) * (descending ? -1 : 1) || byName(a, b);

  // На небольших схемах (типичные 20 зданий/50 связей) 5 попыток обычно
  // занимают около секунды; на больших не умножаем нагрузку на браузер.
  const orders = seeds.length <= 100 && edges.length <= 120
    ? [seeds, [...seeds].sort(byName), [...seeds].sort(byDegree(true)),
      [...seeds].sort(byDegree(false)), [...seeds].sort((a, b) => byName(b, a))]
    : [seeds];

  let best: { nodes: Node[]; edges: Edge[] } | undefined;
  let lowestCost = Infinity;
  for (const order of orders) {
    const candidate = await calculate(order);
    const cost = layoutCost(candidate.nodes, candidate.edges);
    if (cost < lowestCost) {
      best = candidate;
      lowestCost = cost;
    }
  }
  return best!;
}
