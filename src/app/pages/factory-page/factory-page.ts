import { Component } from '@angular/core';
import {
  initializeModel,
  NgDiagramBackgroundComponent,
  NgDiagramComponent,
  provideNgDiagram,
  NgDiagramNodeTemplateMap,
} from 'ng-diagram';
import { DistrictNode } from '../../components/district-node/district-node';
import { DistrictNodeData } from '../../components/district-node/district-node.model';

@Component({
  selector: 'app-factory-page',
  standalone: true,
  imports: [NgDiagramComponent, NgDiagramBackgroundComponent],
  templateUrl: './factory-page.html',
  styleUrl: './factory-page.scss',
  providers: [provideNgDiagram()],
})
export class FactoryPage {
  nodeTemplateMap = new NgDiagramNodeTemplateMap([['district', DistrictNode]]);

  model = initializeModel({
    nodes: [
      {
        id: 'group-1',
        isGroup: true,
        type: 'district',
        position: { x: 100, y: 100 },
        size: { width: 680, height: 390 },
        data: {
          name: 'Цех №1',
          iconId: 'icon-factory',
          isCollapsed: false,
        } as DistrictNodeData,
      },
      {
        id: 'node-1',
        groupId: 'group-1',
        position: { x: 150, y: 180 },
        data: { label: 'Станок А' },
      },
      {
        id: 'node-2',
        groupId: 'group-1',
        position: { x: 400, y: 250 },
        data: { label: 'Станок Б' },
      },
      {
        id: 'external-node',
        position: { x: -150, y: 200 },
        data: { label: 'Внешний склад' },
      },
    ],
    edges: [
      {
        id: 'edge-internal',
        source: 'node-1',
        target: 'node-2',
        sourcePort: 'port-right',
        targetPort: 'port-left',
        data: {},
      },
      {
        id: 'edge-external',
        source: 'external-node',
        target: 'node-1', // Связь идет внутрь группы
        sourcePort: 'port-right',
        targetPort: 'port-left',
        data: {},
      },
    ],
  });
}
