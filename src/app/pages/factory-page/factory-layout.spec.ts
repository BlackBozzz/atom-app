import { describe, expect, it } from 'vitest';
import type { Edge, Node } from 'ng-diagram';
import type { FactorySeedNode } from './factory-layout';
import { layoutFactoryGraph } from './factory-layout';

const nodes: FactorySeedNode[] = [
  { id: 'district-1', type: 'district', isGroup: true, data: { name: 'Северный' } },
  { id: 'edifice-1', type: 'building', groupId: 'district-1', data: { name: 'Подстанция' } },
  { id: 'edifice-2', type: 'building', groupId: 'district-1', data: { name: 'Насосная' } },
  { id: 'edifice-3', type: 'building', data: { name: 'Больница' } },
];
const edges: Edge[] = [
  { id: 'dependence-1', source: 'edifice-1', target: 'edifice-2',
    sourcePort: 'port-electricity-out', targetPort: 'port-electricity-in', targetArrowhead: 'ng-diagram-arrow', data: {} },
  { id: 'dependence-2', source: 'edifice-2', target: 'edifice-3',
    sourcePort: 'port-water-out', targetPort: 'port-water-in', targetArrowhead: 'ng-diagram-arrow', data: {} },
];

const size = (node: Node) => node.size ?? { width: 250, height: 154 };

function overlap(a: Node, b: Node): boolean {
  const as = size(a);
  const bs = size(b);
  return a.position.x < b.position.x + bs.width
    && b.position.x < a.position.x + as.width
    && a.position.y < b.position.y + bs.height
    && b.position.y < a.position.y + as.height;
}

function crossesBuilding(a: { x: number; y: number }, b: { x: number; y: number }, node: Node): boolean {
  const { x, y } = node.position;
  const { width, height } = size(node);
  if (Math.abs(a.x - b.x) < 0.1) {
    return a.x > x && a.x < x + width && Math.min(a.y, b.y) < y + height && Math.max(a.y, b.y) > y;
  }
  if (Math.abs(a.y - b.y) < 0.1) {
    return a.y > y && a.y < y + height && Math.min(a.x, b.x) < x + width && Math.max(a.x, b.x) > x;
  }
  return false;
}

describe('совместная раскладка ELK и маршрутизация', () => {
  it('размещает узлы и отдаёт реальные ортогональные маршруты со стрелками', async () => {
    const graph = await layoutFactoryGraph(nodes, edges);
    expect(graph.nodes).toHaveLength(nodes.length);
    expect(graph.edges).toHaveLength(edges.length);
    expect(graph.edges.every((edge) => edge.targetArrowhead === 'ng-diagram-arrow')).toBe(true);
    expect(graph.nodes.every((node) => Number.isFinite(node.position.x) && Number.isFinite(node.position.y))).toBe(true);
    expect(graph.edges.every((edge) => edge.routingMode === 'manual' && (edge.points?.length ?? 0) >= 2)).toBe(true);

    // Стрелка должна заканчиваться на точке ресурса, а не где-то в границе района.
    const source = graph.nodes.find((node) => node.id === 'edifice-1')!;
    const electricity = graph.edges.find((edge) => edge.id === 'dependence-1')!;
    expect(electricity.points?.[0]).toEqual({ x: source.position.x + 250, y: source.position.y + 127 });
    const recipient = graph.nodes.find((node) => node.id === 'edifice-2')!;
    expect(electricity.points?.at(-1)).toEqual({ x: recipient.position.x, y: recipient.position.y + 127 });
  });

  it('помещает объекты внутрь района без пересечений с внешними зданиями', async () => {
    const graph = await layoutFactoryGraph(nodes, edges);
    const district = graph.nodes.find((node) => node.id === 'district-1')!;
    const districtSize = size(district);
    for (const child of graph.nodes.filter((node) => node.groupId === district.id)) {
      const childSize = size(child);
      expect(child.position.x).toBeGreaterThan(district.position.x);
      expect(child.position.y).toBeGreaterThan(district.position.y + 38);
      expect(child.position.x + childSize.width).toBeLessThan(district.position.x + districtSize.width);
      expect(child.position.y + childSize.height).toBeLessThan(district.position.y + districtSize.height);
    }
    const external = graph.nodes.find((node) => node.id === 'edifice-3')!;
    expect(overlap(district, external)).toBe(false);
  });

  it('не прокладывает 50 линий через другие карточки при межрайонных связях', async () => {
    const districts: FactorySeedNode[] = Array.from({ length: 5 }, (_, i) =>
      ({ id: `district-${i}`, type: 'district', isGroup: true, data: { name: `Район ${i}` } }));
    const buildings: FactorySeedNode[] = Array.from({ length: 20 }, (_, i) =>
      ({ id: `building-${i}`, type: 'building', groupId: `district-${i % 5}`, data: { name: `Здание ${i}` } }));
    let randomSeed = 91343;
    const random = () => ((randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const dependencies: Edge[] = [];
    const used = new Set<string>();
    while (dependencies.length < 50) {
      const a = Math.floor(random() * 20);
      const b = Math.floor(random() * 20);
      const resource = random() < 0.5 ? 'water' : 'electricity';
      const key = `${a}:${b}:${resource}`;
      if (a === b || used.has(key)) continue;
      used.add(key);
      dependencies.push({
        id: `dep-${dependencies.length}`, source: `building-${a}`, target: `building-${b}`,
        sourcePort: `port-${resource}-out`, targetPort: `port-${resource}-in`,
        targetArrowhead: 'ng-diagram-arrow', data: {},
      });
    }

    const graph = await layoutFactoryGraph([...districts, ...buildings], dependencies);
    expect(graph.edges).toHaveLength(50);
    const realBuildings = graph.nodes.filter((node) => node.type === 'building');
    for (const edge of graph.edges) {
      expect(edge.routingMode).toBe('manual');
      const points = edge.points ?? [];
      expect(points.length).toBeGreaterThan(1);
      for (const building of realBuildings) {
        if (building.id === edge.source || building.id === edge.target) continue;
        for (let i = 1; i < points.length; i++) {
          expect(crossesBuilding(points[i - 1], points[i], building)).toBe(false);
        }
      }
    }
  });
});
