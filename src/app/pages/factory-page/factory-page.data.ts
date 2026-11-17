import type { Edge } from 'ng-diagram';
import type { DistrictNodeData } from '../../components/district-node/district-node.model';
import type { InfrastructureNodeData } from '../../components/building-node/building-node.model';
import type { FactorySeedNode } from './factory-layout';
// Координат здесь нет: их рассчитывает ELK при загрузке страницы.
export const factoryDemo: { nodes: FactorySeedNode[]; edges: Edge[] } = {
  nodes: [
      {
        id: 'group-1',
        isGroup: true,
        type: 'district',
        data: {
          name: 'Район №1',
          iconId: 'icon-factory',
          isCollapsed: false,
        } as DistrictNodeData,
      },
      {
        id: 'b-only-water-in',
        type: 'building',
        groupId: 'group-1',
        data: {
          name: 'Только вход воды',
          iconId: 'icon-building',
          status: { water: 'normal', electricity: 'normal' },
        } as InfrastructureNodeData,
      },
      {
        id: 'b-only-water-out',
        type: 'building',
        groupId: 'group-1',
        data: {
          name: 'Только выход воды',
          iconId: 'icon-building',
          status: { water: 'emergency', electricity: 'normal' },
        } as InfrastructureNodeData,
      },
      {
        id: 'b-only-power-in',
        type: 'building',
        groupId: 'group-1',
        data: {
          name: 'Только вход эл-ва',
          iconId: 'icon-building',
          status: { water: 'normal', electricity: 'repair' },
        } as InfrastructureNodeData,
      },
      {
        id: 'b-only-power-out',
        type: 'building',
        groupId: 'group-1',
        data: {
          name: 'Только выход эл-ва',
          iconId: 'icon-building',
          status: { water: 'normal', electricity: 'normal' },
        } as InfrastructureNodeData,
      },
      {
        id: 'b-water-both',
        type: 'building',
        groupId: 'group-1',
        data: {
          name: 'Транзит воды',
          iconId: 'icon-building',
          status: { water: 'normal', electricity: 'normal' },
        } as InfrastructureNodeData,
      },
      {
        id: 'b-power-both',
        type: 'building',
        groupId: 'group-1',
        data: {
          name: 'Транзит эл-ва',
          iconId: 'icon-building',
          status: { water: 'normal', electricity: 'emergency' },
        } as InfrastructureNodeData,
      },
      {
        id: 'b-all-ports',
        type: 'building',
        groupId: 'group-1',
        data: {
          name: 'Все порты заняты',
          iconId: 'icon-building',
          status: { water: 'repair', electricity: 'emergency' },
        } as InfrastructureNodeData,
      },
      {
        id: 'b-free',
        type: 'building',
        groupId: 'group-1',
        data: {
          name: 'Свободный узел',
          iconId: 'icon-building',
          status: { water: 'normal', electricity: 'normal' },
        } as InfrastructureNodeData,
      },
      {
        id: 'ext-water-source',
        type: 'building',
        data: {
          name: 'Водозабор',
          iconId: 'icon-building',
          status: { water: 'normal', electricity: 'normal' },
        } as InfrastructureNodeData,
      },
      {
        id: 'ext-power-source',
        type: 'building',
        data: {
          name: 'Подстанция',
          iconId: 'icon-building',
          status: { water: 'normal', electricity: 'normal' },
        } as InfrastructureNodeData,
      },
      {
        id: 'ext-consumer',
        type: 'building',
        data: {
          name: 'Потребитель',
          iconId: 'icon-building',
          status: { water: 'normal', electricity: 'normal' },
        } as InfrastructureNodeData,
      },
    ],

  edges: [
      {
        id: 'e1',
        source: 'ext-water-source',
        target: 'b-only-water-in',
        sourcePort: 'port-water-out',
        targetPort: 'port-water-in',
        data: {},
      },
      {
        id: 'e2',
        source: 'b-only-water-out',
        target: 'ext-consumer',
        sourcePort: 'port-water-out',
        targetPort: 'port-water-in',
        data: {},
      },
      {
        id: 'e3',
        source: 'ext-power-source',
        target: 'b-only-power-in',
        sourcePort: 'port-electricity-out',
        targetPort: 'port-electricity-in',
        data: {},
      },
      {
        id: 'e4',
        source: 'b-only-power-out',
        target: 'ext-consumer',
        sourcePort: 'port-electricity-out',
        targetPort: 'port-electricity-in',
        data: {},
      },
      {
        id: 'e5',
        source: 'ext-water-source',
        target: 'b-water-both',
        sourcePort: 'port-water-out',
        targetPort: 'port-water-in',
        data: {},
      },
      {
        id: 'e6',
        source: 'b-water-both',
        target: 'ext-consumer',
        sourcePort: 'port-water-out',
        targetPort: 'port-water-in',
        data: {},
      },
      {
        id: 'e7',
        source: 'ext-power-source',
        target: 'b-power-both',
        sourcePort: 'port-electricity-out',
        targetPort: 'port-electricity-in',
        data: {},
      },
      {
        id: 'e8',
        source: 'b-power-both',
        target: 'ext-consumer',
        sourcePort: 'port-electricity-out',
        targetPort: 'port-electricity-in',
        data: {},
      },
      {
        id: 'e9',
        source: 'ext-water-source',
        target: 'b-all-ports',
        sourcePort: 'port-water-out',
        targetPort: 'port-water-in',
        data: {},
      },
      {
        id: 'e10',
        source: 'b-all-ports',
        target: 'ext-consumer',
        sourcePort: 'port-water-out',
        targetPort: 'port-water-in',
        data: {},
      },
      {
        id: 'e11',
        source: 'ext-power-source',
        target: 'b-all-ports',
        sourcePort: 'port-electricity-out',
        targetPort: 'port-electricity-in',
        data: {},
      },
      {
        id: 'e12',
        source: 'b-all-ports',
        target: 'ext-consumer',
        sourcePort: 'port-electricity-out',
        targetPort: 'port-electricity-in',
        data: {},
      },
      {
        id: 'e-internal-water',
        source: 'b-only-water-in',
        target: 'b-water-both',
        sourcePort: 'port-water-out',
        targetPort: 'port-water-in',
        data: {},
      },
      {
        id: 'e-internal-power',
        source: 'b-only-power-in',
        target: 'b-power-both',
        sourcePort: 'port-electricity-out',
        targetPort: 'port-electricity-in',
        data: {},
      },
    ],
};
