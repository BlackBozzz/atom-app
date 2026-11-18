import type { Edge } from 'ng-diagram';

// Храним исходный конец связи отдельно для каждого района.
type Endpoint = { nodeId: string; portId?: string };
type SavedEndpoints = { source?: Endpoint; target?: Endpoint };
type EdgeData = Record<string, unknown> & {
  districtEndpoints?: Record<string, SavedEndpoints>;
  // При сворачивании маршруты ELK больше не подходят к портам группы.
  unfoldedRoute?: Pick<Edge, 'points' | 'routingMode' | 'routing'>;
};

type EdgeUpdate = Pick<Edge, 'id'> & Partial<Edge>;

const INPUT_PORTS = ['port-water-in', 'port-electricity-in'] as const;
const OUTPUT_PORTS = ['port-water-out', 'port-electricity-out'] as const;

function districtPort(port: string | undefined, opposite: string | undefined, isSource: boolean): string {
  const expected: readonly string[] = isSource ? OUTPUT_PORTS : INPUT_PORTS;
  if (port && expected.includes(port)) return port;
  if (port || !opposite) {
    throw new Error(`Не удалось определить порт связи: ${port ?? '(не указан)'}`);
  }
  if (opposite.startsWith('port-water-')) return `port-water-${isSource ? 'out' : 'in'}`;
  if (opposite.startsWith('port-electricity-')) return `port-electricity-${isSource ? 'out' : 'in'}`;
  throw new Error(`Неизвестный порт связи: ${opposite}`);
}

export function collapseDistrictEdges(edges: readonly Edge[], districtId: string, childIds: ReadonlySet<string>): EdgeUpdate[] {
  return edges.flatMap((edge): EdgeUpdate[] => {
    const fromChild = childIds.has(edge.source);
    const toChild = childIds.has(edge.target);
    if (fromChild === toChild) return [];

    const data = (edge.data ?? {}) as EdgeData;
    const unfoldedRoute = data.unfoldedRoute ?? {
      points: edge.points, routingMode: edge.routingMode, routing: edge.routing,
    };
    const saved: SavedEndpoints = fromChild
      ? { source: { nodeId: edge.source, portId: edge.sourcePort } }
      : { target: { nodeId: edge.target, portId: edge.targetPort } };

    return [{
      id: edge.id,
      ...(fromChild
        ? { source: districtId, sourcePort: districtPort(edge.sourcePort, edge.targetPort, true) }
        : { target: districtId, targetPort: districtPort(edge.targetPort, edge.sourcePort, false) }),
      // В свёрнутом состоянии ng-diagram прокладывает временную линию к группе.
      // Иначе сохранённые ELK-координаты ведут к скрытому зданию.
      points: undefined,
      routingMode: 'auto',
      data: {
        ...data, unfoldedRoute,
        districtEndpoints: { ...data.districtEndpoints, [districtId]: saved },
      },
    }];
  });
}

export function expandDistrictEdges(edges: readonly Edge[], districtId: string): EdgeUpdate[] {
  return edges.flatMap((edge): EdgeUpdate[] => {
    const data = (edge.data ?? {}) as EdgeData;
    const saved = data.districtEndpoints?.[districtId];
    if (!saved) return [];

    const districtEndpoints = { ...data.districtEndpoints };
    delete districtEndpoints[districtId];
    const updatedData: EdgeData = { ...data };
    const stillCollapsed = Object.keys(districtEndpoints).length > 0;
    if (stillCollapsed) {
      updatedData.districtEndpoints = districtEndpoints;
    } else {
      delete updatedData.districtEndpoints;
    }

    const original = data.unfoldedRoute;
    if (!stillCollapsed) delete updatedData.unfoldedRoute;

    return [{
      id: edge.id,
      ...(stillCollapsed ? { points: undefined, routingMode: 'auto' as const } : {
        points: original?.points, routingMode: original?.routingMode, routing: original?.routing,
      }),
      ...(saved.source ? { source: saved.source.nodeId, sourcePort: saved.source.portId } : {}),
      ...(saved.target ? { target: saved.target.nodeId, targetPort: saved.target.portId } : {}),
      data: updatedData,
    }];
  });
}
