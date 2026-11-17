import { Component } from '@angular/core';
import {
  initializeModel,
  NgDiagramBackgroundComponent,
  NgDiagramComponent,
  provideNgDiagram,
  NgDiagramNodeTemplateMap,
} from 'ng-diagram';
import { DistrictNode } from '../../components/district-node/district-node';
import { BuildingNode } from '../../components/building-node/building-node';
import { DistrictNodeData } from '../../components/district-node/district-node.model';
import { InfrastructureNodeData } from '../../components/building-node/building-node.model';

@Component({
  selector: 'app-factory-page',
  standalone: true,
  imports: [NgDiagramComponent, NgDiagramBackgroundComponent],
  templateUrl: './factory-page.html',
  styleUrl: './factory-page.scss',
  providers: [provideNgDiagram()],
})
export class FactoryPage {
  nodeTemplateMap = new NgDiagramNodeTemplateMap([
    ['district', DistrictNode],
    ['building', BuildingNode],
  ]);

  model = initializeModel({
    nodes: [
      // ============================================================
      // ГРУППА (район)
      // ============================================================
      {
        id: 'group-1',
        isGroup: true,
        type: 'district',
        position: { x: 100, y: 80 },
        size: { width: 900, height: 500 },
        data: {
          name: 'Район №1',
          iconId: 'icon-factory',
          isCollapsed: false,
        } as DistrictNodeData,
      },

      // ============================================================
      // Дочерние узлы внутри группы — разные варианты занятости портов
      // ============================================================

      // Вариант 1: занят ТОЛЬКО water-in (принимает воду извне)
      {
        id: 'b-only-water-in',
        type: 'building',
        groupId: 'group-1',
        position: { x: 140, y: 140 },
        data: {
          name: 'Только вход воды',
          iconId: 'icon-building',
          waterStatus: 'normal',
          electricityStatus: 'normal',
        } as InfrastructureNodeData,
      },

      // Вариант 2: занят ТОЛЬКО water-out (отдаёт воду наружу)
      {
        id: 'b-only-water-out',
        type: 'building',
        groupId: 'group-1',
        position: { x: 400, y: 140 },
        data: {
          name: 'Только выход воды',
          iconId: 'icon-building',
          waterStatus: 'emergency',
          electricityStatus: 'normal',
        } as InfrastructureNodeData,
      },

      // Вариант 3: занят ТОЛЬКО electricity-in
      {
        id: 'b-only-power-in',
        type: 'building',
        groupId: 'group-1',
        position: { x: 660, y: 140 },
        data: {
          name: 'Только вход эл-ва',
          iconId: 'icon-building',
          waterStatus: 'normal',
          electricityStatus: 'repair',
        } as InfrastructureNodeData,
      },

      // Вариант 4: занят ТОЛЬКО electricity-out
      {
        id: 'b-only-power-out',
        type: 'building',
        groupId: 'group-1',
        position: { x: 140, y: 280 },
        data: {
          name: 'Только выход эл-ва',
          iconId: 'icon-building',
          waterStatus: 'normal',
          electricityStatus: 'normal',
        } as InfrastructureNodeData,
      },

      // Вариант 5: заняты ОБА порта воды (in + out) — транзит воды
      {
        id: 'b-water-both',
        type: 'building',
        groupId: 'group-1',
        position: { x: 400, y: 280 },
        data: {
          name: 'Транзит воды',
          iconId: 'icon-building',
          waterStatus: 'normal',
          electricityStatus: 'normal',
        } as InfrastructureNodeData,
      },

      // Вариант 6: заняты ОБА порта электричества (in + out) — транзит эл-ва
      {
        id: 'b-power-both',
        type: 'building',
        groupId: 'group-1',
        position: { x: 660, y: 280 },
        data: {
          name: 'Транзит эл-ва',
          iconId: 'icon-building',
          waterStatus: 'normal',
          electricityStatus: 'emergency',
        } as InfrastructureNodeData,
      },

      // Вариант 7: заняты ВСЕ 4 порта (полная загрузка)
      {
        id: 'b-all-ports',
        type: 'building',
        groupId: 'group-1',
        position: { x: 400, y: 400 },
        data: {
          name: 'Все порты заняты',
          iconId: 'icon-building',
          waterStatus: 'repair',
          electricityStatus: 'emergency',
        } as InfrastructureNodeData,
      },

      // Вариант 8: НИ ОДИН порт не занят (свободный узел)
      {
        id: 'b-free',
        type: 'building',
        groupId: 'group-1',
        position: { x: 660, y: 400 },
        data: {
          name: 'Свободный узел',
          iconId: 'icon-building',
          waterStatus: 'normal',
          electricityStatus: 'normal',
        } as InfrastructureNodeData,
      },

      // ============================================================
      // Внешние узлы (источники/потребители за пределами группы)
      // ============================================================
      {
        id: 'ext-water-source',
        type: 'building',
        position: { x: -180, y: 200 },
        data: {
          name: 'Водозабор',
          iconId: 'icon-building',
          waterStatus: 'normal',
          electricityStatus: 'normal',
        } as InfrastructureNodeData,
      },
      {
        id: 'ext-power-source',
        type: 'building',
        position: { x: -180, y: 400 },
        data: {
          name: 'Подстанция',
          iconId: 'icon-building',
          waterStatus: 'normal',
          electricityStatus: 'normal',
        } as InfrastructureNodeData,
      },
      {
        id: 'ext-consumer',
        type: 'building',
        position: { x: 1080, y: 300 },
        data: {
          name: 'Потребитель',
          iconId: 'icon-building',
          waterStatus: 'normal',
          electricityStatus: 'normal',
        } as InfrastructureNodeData,
      },
    ],

    edges: [
      // ============================================================
      // ОДИНОЧНЫЕ связи (занят один порт)
      // ============================================================

      // Вода извне → только water-in узла
      {
        id: 'e1',
        source: 'ext-water-source',
        target: 'b-only-water-in',
        sourcePort: 'port-water-out',
        targetPort: 'port-water-in',
        data: {},
      },

      // Только water-out узла → наружу
      {
        id: 'e2',
        source: 'b-only-water-out',
        target: 'ext-consumer',
        sourcePort: 'port-water-out',
        targetPort: 'port-water-in',
        data: {},
      },

      // Электричество извне → только electricity-in
      {
        id: 'e3',
        source: 'ext-power-source',
        target: 'b-only-power-in',
        sourcePort: 'port-electricity-out',
        targetPort: 'port-electricity-in',
        data: {},
      },

      // Только electricity-out узла → наружу
      {
        id: 'e4',
        source: 'b-only-power-out',
        target: 'ext-consumer',
        sourcePort: 'port-electricity-out',
        targetPort: 'port-electricity-in',
        data: {},
      },

      // ============================================================
      // ОБА порта одного ресурса заняты (транзит)
      // ============================================================

      // Транзит воды: вход → узел → выход
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

      // Транзит электричества: вход → узел → выход
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

      // ============================================================
      // ВСЕ 4 порта заняты (полная загрузка узла)
      // ============================================================
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

      // ============================================================
      // ВНУТРЕННИЕ связи между узлами внутри группы
      // (демонстрируют, что связи внутри группы тоже работают)
      // ============================================================
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
  });
}
