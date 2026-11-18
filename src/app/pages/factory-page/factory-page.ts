import { Component, DestroyRef, inject, Injector, OnInit, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  initializeModel,
  NgDiagramBackgroundComponent,
  NgDiagramComponent,
  NgDiagramEdgeTemplateMap,
  NgDiagramNodeTemplateMap,
  provideNgDiagram,
  type NgDiagramConfig,
} from 'ng-diagram';
import { DistrictNode } from '../../components/district-node/district-node';
import { BuildingNode } from '../../components/building-node/building-node';
import { ResourceEdge } from '../../components/resource-edge/resource-edge';
import { EdificeStatusService } from '../../services/edifice-status.service';
import { mapEdificesToFactoryGraph } from './factory-graph.mapper';
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly edificesService = inject(EdificeStatusService);

  readonly nodeTemplateMap = new NgDiagramNodeTemplateMap([
    ['district', DistrictNode],
    ['building', BuildingNode],
  ]);
  readonly edgeTemplateMap = new NgDiagramEdgeTemplateMap([
    ['resource', ResourceEdge],
  ]);
  readonly config: NgDiagramConfig = {
    zoom: { zoomToFit: { onInit: true, padding: 60 } },
  };

  readonly model = signal(initializeModel());
  readonly ready = signal(false);
  readonly layoutError = signal('');
  readonly loadingMessage = signal('Загружаем объекты инфраструктуры…');
  readonly empty = signal(false);

  async ngOnInit(): Promise<void> {
    try {
      const edifices = await firstValueFrom(this.edificesService.getCurrent());
      if (this.destroyRef.destroyed) return;
      if (edifices.length === 0) {
        this.empty.set(true);
        return;
      }
      this.loadingMessage.set('Расставляем объекты на диаграмме…');
      const graphData = mapEdificesToFactoryGraph(edifices);
      const graph = await layoutFactoryGraph(graphData.nodes, graphData.edges);
      if (this.destroyRef.destroyed) return;
      this.model.set(initializeModel(graph, this.injector));
      this.ready.set(true);
    } catch (error) {
      if (this.destroyRef.destroyed) return;
      console.error('Не удалось загрузить диаграмму инфраструктуры', error);
      this.layoutError.set('Не удалось загрузить объекты или построить диаграмму. Проверьте соединение с сервером.');
    }
  }
}
