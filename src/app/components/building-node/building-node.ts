import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  NgDiagramNodeSelectedDirective,
  NgDiagramPortComponent,
  type NgDiagramNodeTemplate,
  type Node,
} from 'ng-diagram';
import { InfrastructureNodeData, RESOURCE_STATUSES, STATUS_META } from './building-node.model';
import { readBuilding } from '../../service/node-data.util';

@Component({
  selector: 'app-building-node',
  standalone: true,
  imports: [NgDiagramPortComponent],
  templateUrl: './building-node.html',
  styleUrl: './building-node.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [{ directive: NgDiagramNodeSelectedDirective, inputs: ['node'] }],
  host: {
    '[class.is-highlighted]': 'isHighlighted()',
    '[class.ng-diagram-port-hoverable-over-node]': 'true',
  },
})
export class BuildingNode implements NgDiagramNodeTemplate<InfrastructureNodeData> {
  node = input.required<Node<InfrastructureNodeData>>();

  readonly nodeData = computed<InfrastructureNodeData>(() => readBuilding(this.node().data));
  readonly isHighlighted = computed(() => Boolean(this.nodeData().isHighlighted));

  readonly statusList = RESOURCE_STATUSES.map((id) => ({
    id,
    iconId: STATUS_META[id].icon,
    label: STATUS_META[id].label,
  }));
}
