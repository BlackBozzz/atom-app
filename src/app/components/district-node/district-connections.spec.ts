import { describe, expect, it } from 'vitest';
import type { Edge } from 'ng-diagram';
import { collapseDistrictEdges, expandDistrictEdges } from './district-connections';

function edge(id: string, source: string, target: string, sourcePort: string, targetPort: string): Edge {
  return { id, source, target, sourcePort, targetPort, data: { color: 'blue' } } as Edge;
}

function apply(edges: Edge[], changes: (Pick<Edge, 'id'> & Partial<Edge>)[]): Edge[] {
  return edges.map((existing) => {
    const change = changes.find((item) => item.id === existing.id);
    return change ? { ...existing, ...change } : existing;
  });
}

describe('district connections', () => {
  it('maps only external edges and keeps their water/electricity ports', () => {
    const edges = [
      edge('water-in', 'outside', 'a', 'port-water-out', 'port-water-in'),
      edge('power-out', 'a', 'outside', 'port-electricity-out', 'port-electricity-in'),
      edge('inside', 'a', 'b', 'port-water-out', 'port-water-in'),
      edge('unrelated', 'outside', 'other', 'port-water-out', 'port-water-in'),
    ];

    const collapsed = apply(edges, collapseDistrictEdges(edges, 'district', new Set(['a', 'b'])));
    expect(collapsed[0]).toMatchObject({ source: 'outside', target: 'district', targetPort: 'port-water-in' });
    expect(collapsed[1]).toMatchObject({ source: 'district', target: 'outside', sourcePort: 'port-electricity-out' });
    expect(collapsed[2]).toEqual(edges[2]);
    expect(collapsed[3]).toEqual(edges[3]);

    const restored = apply(collapsed, expandDistrictEdges(collapsed, 'district'));
    expect(restored).toEqual(edges);
  });

  it('switches to auto-route when collapsed, then restores the ELK waypoints', () => {
    const connection: Edge = {
      ...edge('routed', 'a', 'b', 'port-water-out', 'port-water-in'),
      routingMode: 'manual', routing: 'orthogonal',
      points: [{ x: 10, y: 40 }, { x: 45, y: 40 }, { x: 45, y: 90 }, { x: 100, y: 90 }],
    };
    const collapsed = apply([connection], collapseDistrictEdges([connection], 'district', new Set(['a'])));
    expect(collapsed[0].routingMode).toBe('auto');
    expect(collapsed[0].points).toBeUndefined();

    const expanded = apply(collapsed, expandDistrictEdges(collapsed, 'district'));
    expect(expanded[0].routingMode).toBe('manual');
    expect(expanded[0].points).toEqual(connection.points);
    expect(expanded[0].data).toEqual(connection.data);
  });

  it('restores only the requested district when two districts share an edge', () => {
    const edges = [edge('cross', 'a', 'b', 'port-water-out', 'port-water-in')];
    const aCollapsed = apply(edges, collapseDistrictEdges(edges, 'district-a', new Set(['a'])));
    const bothCollapsed = apply(aCollapsed, collapseDistrictEdges(aCollapsed, 'district-b', new Set(['b'])));
    expect(bothCollapsed[0]).toMatchObject({ source: 'district-a', target: 'district-b' });

    const aExpanded = apply(bothCollapsed, expandDistrictEdges(bothCollapsed, 'district-a'));
    expect(aExpanded[0]).toMatchObject({ source: 'a', target: 'district-b' });
    const bothExpanded = apply(aExpanded, expandDistrictEdges(aExpanded, 'district-b'));
    expect(bothExpanded).toEqual(edges);
  });

  it('infers the appropriate port side from the other end if the child port is missing', () => {
    const connection = edge('missing', 'a', 'outside', 'port-electricity-out', 'port-electricity-in');
    connection.sourcePort = undefined;
    const updates = collapseDistrictEdges([connection], 'district', new Set(['a']));
    expect(updates[0].sourcePort).toBe('port-electricity-out');
    const restored = apply(apply([connection], updates), expandDistrictEdges(apply([connection], updates), 'district'));
    expect(restored).toEqual([connection]);
  });

  it('rejects unknown external ports instead of silently attaching an incorrect resource', () => {
    const connection = edge('bad', 'a', 'outside', 'some-other-port', 'port-water-in');
    expect(() => collapseDistrictEdges([connection], 'district', new Set(['a']))).toThrow('порт');
  });
});
