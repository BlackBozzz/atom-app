import { Component, computed, input } from '@angular/core';
import { NgDiagramNodeSelectedDirective, NgDiagramPortComponent, type Node } from 'ng-diagram';
import { InfrastructureNodeData, ResourceKind, ResourceStatus } from './building-node.model';

@Component({
  selector: 'app-building-node',
  standalone: true,
  imports: [NgDiagramPortComponent],
  templateUrl: './building-node.html',
  styleUrl: './building-node.scss',
  hostDirectives: [{ directive: NgDiagramNodeSelectedDirective, inputs: ['node'] }],
  host: { '[class.is-highlighted]': 'nodeData().isHighlighted === true' },
})
export class BuildingNode {
  readonly node = input.required<Node<InfrastructureNodeData>>();
  readonly nodeData = computed(() => this.node().data);

  // Встраиваем геометрию SVG: значки видны без отдельного icons.svg и не зависят от base href.
  readonly buildingIconPath = computed(() =>
    this.nodeData().iconId === 'icon-factory' || this.nodeData().iconId === 'infra-station-icon'
      ? 'M3 21V10l6-3v4l6-3v4h6v9H3zm3-7v4h3v-4H6zm6 0v4h3v-4h-3z'
      : 'M3 22V4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v18h-5v-5H8v5H3zm4-16v3h3V6H7zm7 0v3h3V6h-3zM7 12v3h3v-3H7zm7 0v3h3v-3h-3z'
  );

  readonly resources = [
    { id: 'water', label: 'Водоснабжение', input: 'port-water-in', output: 'port-water-out' },
    { id: 'electricity', label: 'Электроэнергия', input: 'port-electricity-in', output: 'port-electricity-out' },
  ] as const;

  readonly statuses = [
    { id: 'normal', label: 'Норма' },
    { id: 'emergency', label: 'Авария' },
    { id: 'repair', label: 'Ремонт' },
  ] as const;

  status(resource: ResourceKind): ResourceStatus | undefined {
    return this.nodeData().status?.[resource];
  }
}
