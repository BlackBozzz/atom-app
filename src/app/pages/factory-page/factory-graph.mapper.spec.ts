import { describe, expect, it } from 'vitest';
import type { EdificeStateDto } from '../../models/edifice-state.dto';
import { mapEdificesToFactoryGraph, toResourceStatus } from './factory-graph.mapper';

const source: EdificeStateDto = {
  idEdifice: 1,
  name: 'Водозабор',
  resourceTypes: ['water'],
  district: 'Западный',
  street: 'Речная',
  houseNumber: '3',
  resources: [
    { resourceType: 'water', status: { idStatus: 3, name: 'Авария', occurredAt: '2026-11-18T09:30:00' } },
  ],
  dependencies: [
    { idDependence: 5, resourceType: 'water', sourceId: 1, dependentId: 2,
      status: { idStatus: 3, name: 'Авария', occurredAt: '2026-11-18T09:30:00' } },
  ],
};
const dependent: EdificeStateDto = {
  idEdifice: 2,
  name: 'Насосная',
  resourceTypes: ['electricity', 'water'],
  district: 'Центральный',
  street: null,
  houseNumber: null,
  resources: [
    { resourceType: 'electricity', status: { idStatus: 2, name: 'Предупреждение', occurredAt: '2026-11-18T10:00:00' } },
    { resourceType: 'water', status: null },
  ],
  dependencies: [...source.dependencies],
};

describe('преобразование инфраструктуры в граф', () => {
  it('создаёт отдельные районы, узлы и одну направленную связь без дубля', () => {
    const graph = mapEdificesToFactoryGraph([source, dependent]);
    expect(graph.nodes.filter((node) => node.type === 'district')).toHaveLength(2);
    expect(graph.nodes.filter((node) => node.type === 'building')).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toMatchObject({
      id: 'dependence-5', source: 'edifice-1', target: 'edifice-2',
      sourcePort: 'port-water-out', targetPort: 'port-water-in',
      targetArrowhead: 'ng-diagram-arrow',
      data: { resourceType: 'water', status: 'emergency' },
    });
  });

  it('отсутствующий статус не подменяет нормой, хотя две строки ресурсов будут отображены', () => {
    const graph = mapEdificesToFactoryGraph([source, dependent]);
    const sourceNode = graph.nodes.find((node) => node.id === 'edifice-1')!;
    const dependentNode = graph.nodes.find((node) => node.id === 'edifice-2')!;
    expect(sourceNode.data).toMatchObject({ status: { water: 'emergency', electricity: undefined } });
    expect(dependentNode.data).toMatchObject({ status: { water: undefined, electricity: 'warning' } });
  });

  it('не создаёт фальшивые грани при отсутствии dependencies', () => {
    const graph = mapEdificesToFactoryGraph([{ ...source, dependencies: [], district: null }]);
    expect(graph.edges).toHaveLength(0);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].groupId).toBeUndefined();
  });

  it('не строит связи к неизвестным объектам и не принимает неизвестные ресурсы', () => {
    const graph = mapEdificesToFactoryGraph([{
      ...source,
      dependencies: [
        ...source.dependencies,
        { idDependence: 6, resourceType: 'heat', sourceId: 1, dependentId: 1, status: null },
      ],
    }]);
    expect(graph.edges).toHaveLength(0);
  });

  it('поддерживает только реальные статусы из БД', () => {
    expect(toResourceStatus({ idStatus: 1, name: 'Норма', occurredAt: null })).toBe('normal');
    expect(toResourceStatus({ idStatus: 2, name: 'Предупреждение', occurredAt: null })).toBe('warning');
    expect(toResourceStatus({ idStatus: 3, name: 'Авария', occurredAt: null })).toBe('emergency');
    expect(toResourceStatus(null)).toBeUndefined();
  });
});
