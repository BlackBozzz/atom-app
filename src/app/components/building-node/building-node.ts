import { Component, input, computed } from '@angular/core';
import {
  NgDiagramNodeSelectedDirective,
  NgDiagramPortComponent,
  type NgDiagramNodeTemplate,
} from 'ng-diagram';
import { InfrastructureNodeData, ResourceStatus } from '../../components/building-node/building-node.model';


@Component({
  selector: 'app-building-node',
  imports: [NgDiagramPortComponent],
  standalone: true,
  templateUrl: './building-node.html',
  styleUrl: './building-node.scss',
  hostDirectives: [{ directive: NgDiagramNodeSelectedDirective, inputs: ['node'] }],
  host: {
    '[class.is-highlighted]': 'isHighlighted()',
    '[class.ng-diagram-port-hoverable-over-node]': 'true',
  },
})
export class BuildingNode {
  node = input.required<any>();

  nodeData = computed(() => this.node().data as InfrastructureNodeData);
  isHighlighted = computed(() => Boolean(this.nodeData().isHighlighted));

  readonly statusList: { id: ResourceStatus; iconId: string; label: string }[] = [
    { id: 'normal', iconId: 'status-normal', label: 'Норма' },
    { id: 'emergency', iconId: 'status-emergency', label: 'Авария' },
    { id: 'repair', iconId: 'status-repair', label: 'Ремонтные работы' },
  ];
}
