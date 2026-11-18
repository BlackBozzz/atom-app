import { Component, computed, input } from '@angular/core';
import { NgDiagramBaseEdgeComponent, type Edge, type NgDiagramEdgeTemplate } from 'ng-diagram';
import type { ResourceEdgeData } from '../../pages/factory-page/factory-graph.mapper';

/** Направление задают source/target, а встроенный маркер ng-diagram-arrow рисует стрелку на конце. */
@Component({
  selector: 'app-resource-edge',
  standalone: true,
  imports: [NgDiagramBaseEdgeComponent],
  template: '<ng-diagram-base-edge [edge]="edge()" [stroke]="stroke()" [strokeWidth]="2.5" />',
})
export class ResourceEdge implements NgDiagramEdgeTemplate<ResourceEdgeData> {
  readonly edge = input.required<Edge<ResourceEdgeData>>();
  readonly stroke = computed(() => this.edge().data.resourceType === 'water' ? '#0284c7' : '#d97706');
}
