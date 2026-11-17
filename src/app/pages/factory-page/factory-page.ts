import { Component, inject, Injector, OnInit, signal } from '@angular/core';
import {
  initializeModel,
  NgDiagramBackgroundComponent,
  NgDiagramComponent,
  NgDiagramNodeTemplateMap,
  provideNgDiagram,
  type NgDiagramConfig,
} from 'ng-diagram';
import { DistrictNode } from '../../components/district-node/district-node';
import { BuildingNode } from '../../components/building-node/building-node';
import { factoryDemo } from './factory-page.data';
import { layoutFactoryGraph } from './factory-layout';

@Component({
  selector: 'app-factory-page',
  standalone: true,
  imports: [NgDiagramComponent, NgDiagramBackgroundComponent],
  templateUrl: './factory-page.html',
  styleUrl: './factory-page.scss',
  providers: [provideNgDiagram()],
})
export class FactoryPage implements OnInit {
  private readonly injector = inject(Injector);

  readonly nodeTemplateMap = new NgDiagramNodeTemplateMap([
    ['district', DistrictNode],
    ['building', BuildingNode],
  ]);

  readonly config: NgDiagramConfig = {
    zoom: { zoomToFit: { onInit: true, padding: 60 } },
  };

  readonly model = signal(initializeModel());
  readonly ready = signal(false);
  readonly layoutError = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const graph = await layoutFactoryGraph(factoryDemo.nodes, factoryDemo.edges);
      this.model.set(initializeModel(graph, this.injector));
      this.ready.set(true);
    } catch (error) {
      console.error('Ошибка автоматической расстановки узлов', error);
      this.layoutError.set('Не удалось расставить узлы диаграммы');
    }
  }
}
