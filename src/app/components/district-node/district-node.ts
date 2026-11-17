import { Component, computed, inject, input } from '@angular/core';
import {
  NgDiagramGroupHighlightedDirective,
  NgDiagramNodeResizeAdornmentComponent,
  NgDiagramNodeSelectedDirective,
  NgDiagramModelService,
  NgDiagramPortComponent,
  type GroupNode,
  type NgDiagramGroupNodeTemplate,
} from 'ng-diagram';
import { DistrictNodeData } from './district-node.model';
import { collapseDistrictEdges, expandDistrictEdges } from './district-connections';

@Component({
  selector: 'app-district-node',
  standalone: true,
  imports: [
    NgDiagramNodeResizeAdornmentComponent,
    NgDiagramGroupHighlightedDirective,
    NgDiagramNodeSelectedDirective,
    NgDiagramPortComponent,
  ],
  templateUrl: './district-node.html',
  styleUrl: './district-node.scss',
  host: { '[class.is-highlighted]': 'nodeData().isHighlighted === true' },
})
export class DistrictNode implements NgDiagramGroupNodeTemplate<DistrictNodeData> {
  private readonly model = inject(NgDiagramModelService);
  readonly node = input.required<GroupNode<DistrictNodeData>>();
  readonly nodeData = computed(() => this.node().data);
  readonly isCollapsed = computed(() => this.nodeData().isCollapsed === true);
  readonly districtIconPath = computed(() =>
    this.nodeData().iconId === 'icon-factory'
      ? 'M3 21V10l6-3v4l6-3v4h6v9H3zm3-7v4h3v-4H6zm6 0v4h3v-4h-3z'
      : 'M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zm0-6v2h18V3H3z'
  );
  busy = false;

  async toggleCollapse(event: MouseEvent): Promise<void> {
    event.stopPropagation();
    if (this.busy) return;
    this.busy = true;

    try {
      const group = this.node();
      const data = this.nodeData();
      const children = this.model.getChildrenNested(group.id);
      const childIds = new Set(children.map((child) => child.id));

      if (!this.isCollapsed()) {
        const updates = collapseDistrictEdges(this.model.edges(), group.id, childIds);
        const visibleChildIds = children.filter((child) => !child.hidden).map((child) => child.id);

        // Порты района появляются до переназначения связей.
        await this.model.updateNode(group.id, {
          size: { width: 250, height: 84 },
          data: { ...data, isCollapsed: true, expandedSize: group.size ?? data.expandedSize ?? { width: 680, height: 390 }, visibleChildIds },
        }, { waitForMeasurements: true });
        if (updates.length) await this.model.updateEdges(updates);
        if (visibleChildIds.length) {
          await this.model.updateNodes(visibleChildIds.map((id) => ({ id, hidden: true })));
        }
      } else {
        const updates = expandDistrictEdges(this.model.edges(), group.id);
        const visibleChildIds = data.visibleChildIds ?? children.map((child) => child.id);

        if (visibleChildIds.length) {
          await this.model.updateNodes(visibleChildIds.map((id) => ({ id, hidden: false })));
        }
        if (updates.length) await this.model.updateEdges(updates);
        await this.model.updateNode(group.id, {
          size: data.expandedSize ?? { width: 680, height: 390 },
          data: { ...data, isCollapsed: false, visibleChildIds: undefined },
        });
      }
    } catch (error) {
      console.error('Не удалось изменить состояние района', error);
    } finally {
      this.busy = false;
    }
  }
}
