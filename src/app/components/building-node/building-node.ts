import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  NgDiagramNodeSelectedDirective,
  NgDiagramPortComponent,
  type NgDiagramNodeTemplate,
  type Node,
} from 'ng-diagram';
import { InfrastructureNodeData, ResourceStatus, STATUS_META } from './building-node.model';

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
    '[class.has-fault]': 'hasFault()',
  },
})
export class BuildingNode implements NgDiagramNodeTemplate<InfrastructureNodeData> {
  node = input.required<Node<InfrastructureNodeData>>();

  readonly nodeData = computed(() => this.node().data);
  readonly isHighlighted = computed(() => Boolean(this.nodeData().isHighlighted));
  readonly hasFault = computed(
    () =>
      this.nodeData().waterStatus === 'emergency' ||
      this.nodeData().electricityStatus === 'emergency',
  );
  readonly worstTone = computed(() => {
    const w = this.nodeData().waterStatus;
    const e = this.nodeData().electricityStatus;
    if (w === 'emergency' || e === 'emergency') return 'danger';
    if (w === 'repair' || e === 'repair') return 'warn';
    return 'ok';
  });
  readonly load = computed(() => Math.max(0, Math.min(100, this.nodeData().load ?? 62)));

  readonly statusList: { id: ResourceStatus; iconId: string; label: string }[] = (
    ['normal', 'emergency', 'repair'] as ResourceStatus[]
  ).map((id) => ({ id, iconId: STATUS_META[id].icon, label: STATUS_META[id].label }));
}
