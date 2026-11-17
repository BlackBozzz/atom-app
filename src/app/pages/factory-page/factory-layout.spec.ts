import { describe, expect, it } from 'vitest';
import type { Edge, Node } from 'ng-diagram';
import { factoryDemo } from './factory-page.data';
import { layoutFactoryGraph } from './factory-layout';

const size = (node: Node) => node.size ?? { width: 250, height: 205 };

function overlap(a: Node, b: Node): boolean {
  const as = size(a);
  const bs = size(b);
  return a.position.x < b.position.x + bs.width
    && b.position.x < a.position.x + as.width
    && a.position.y < b.position.y + bs.height
    && b.position.y < a.position.y + as.height;
}

describe('автоматическая раскладка ELK', () => {
  it('размещает узлы без ручных координат и сохраняет порты рёбер', async () => {
    expect(factoryDemo.nodes.every((node) => !('position' in node))).toBe(true);
    const result = await layoutFactoryGraph(factoryDemo.nodes, factoryDemo.edges);
    expect(result.nodes).toHaveLength(factoryDemo.nodes.length);
    expect(result.edges).toEqual(factoryDemo.edges);
    for (const node of result.nodes) {
      expect(Number.isFinite(node.position.x)).toBe(true);
      expect(Number.isFinite(node.position.y)).toBe(true);
    }
  });

  it('вмещает здания в район и не накладывает внешние узлы на район', async () => {
    const { nodes } = await layoutFactoryGraph(factoryDemo.nodes, factoryDemo.edges);
    const district = nodes.find((node) => node.id === 'group-1')!;
    const ds = size(district);
    expect(district.autoSize).toBe(false);
    for (const child of nodes.filter((node) => node.groupId === district.id)) {
      const cs = size(child);
      expect(child.position.x).toBeGreaterThan(district.position.x);
      expect(child.position.y).toBeGreaterThan(district.position.y + 38);
      expect(child.position.x + cs.width).toBeLessThan(district.position.x + ds.width);
      expect(child.position.y + cs.height).toBeLessThan(district.position.y + ds.height);
    }
    for (const external of nodes.filter((node) => !node.groupId && node.type !== 'district')) {
      expect(overlap(district, external)).toBe(false);
    }
  });

  it('раскладывает несколько районов и межрайонную связь', async () => {
    const extraNodes = [
      { id: 'group-2', type: 'district' as const, data: { name: 'Второй район' } },
      { id: 'group-2-building', type: 'building' as const, groupId: 'group-2', data: { name: 'Новое здание' } },
    ];
    const extraEdge: Edge = {
      id: 'inter-district', source: 'b-water-both', target: 'group-2-building',
      sourcePort: 'port-water-out', targetPort: 'port-water-in', data: {},
    };
    const { nodes, edges } = await layoutFactoryGraph([...factoryDemo.nodes, ...extraNodes], [...factoryDemo.edges, extraEdge]);
    const district = nodes.find((node) => node.id === 'group-2')!;
    const building = nodes.find((node) => node.id === 'group-2-building')!;
    expect(building.position.x).toBeGreaterThan(district.position.x);
    expect(edges.at(-1)).toEqual(extraEdge);
  });
});
