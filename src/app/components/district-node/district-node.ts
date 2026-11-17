import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  NgDiagramGroupHighlightedDirective,
  NgDiagramGroupNodeTemplate,
  NgDiagramModelService,
  NgDiagramNodeSelectedDirective,
  NgDiagramPortComponent,
} from 'ng-diagram';
import { DistrictNodeData, EdgeRedirectMeta } from './district-node.model';
import { readDistrict } from '../../service/node-data.util';

interface AnyNode {
  id: string;
  groupId?: string;
  size?: { width: number; height: number };
}
interface AnyEdge {
  id: string;
  source: string;
  target: string;
  data?: unknown;
}

@Component({
  selector: 'app-district-node',
  standalone: true,
  imports: [NgDiagramPortComponent],
  templateUrl: './district-node.html',
  styleUrl: './district-node.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    { directive: NgDiagramNodeSelectedDirective, inputs: ['node'] },
    { directive: NgDiagramGroupHighlightedDirective, inputs: ['node'] },
  ],
  host: {
    '[class.is-highlighted]': 'isHighlighted()',
    '[class.is-collapsed]': 'isCollapsed()',
    '[class.ng-diagram-port-hoverable-over-node]': 'true',
  },
})
export class DistrictNode implements NgDiagramGroupNodeTemplate<DistrictNodeData> {
  node = input.required<any>();

  /* БЫЛО: this.node().data as DistrictNodeData  → TS2352
     СТАЛО: нормализация через unknown + дефолты */
  readonly nodeData = computed<DistrictNodeData>(() => readDistrict(this.node().data));
  readonly isHighlighted = computed(() => Boolean(this.nodeData().isHighlighted));
  readonly isCollapsed = computed(() => Boolean(this.nodeData().isCollapsed));

  readonly childCount = computed(() => {
    const id = this.node().id;
    return (this.model.nodes() as unknown as AnyNode[]).filter((n) => n.groupId === id).length;
  });

  constructor(private model: NgDiagramModelService) {}

  async toggleCollapse(event: MouseEvent): Promise<void> {
    event.stopPropagation();
    event.preventDefault();

    const current = this.node();
    const data = this.nodeData();
    const next = !this.isCollapsed();

    const currentSize = current.size ?? { width: 680, height: 390 };
    const expandedSize = data.expandedSize ?? currentSize;

    const allNodes = this.model.nodes() as unknown as AnyNode[];
    const childIds = new Set(allNodes.filter((n) => n.groupId === current.id).map((n) => n.id));
    const allEdges = this.model.edges() as unknown as AnyEdge[];

    if (next) {
      if (childIds.size) {
        await this.model.updateNodes([...childIds].map((id) => ({ id, hidden: true })));
      }

      const redirect = allEdges
        .filter((e) => {
          const s = childIds.has(e.source);
          const t = childIds.has(e.target);
          return (s || t) && !(s && t);
        })
        .map((e) => {
          const s = childIds.has(e.source);
          const meta = (e.data ?? {}) as unknown as EdgeRedirectMeta;
          return {
            id: e.id,
            source: s ? current.id : e.source,
            target: !s ? current.id : e.target,
            data: {
              ...meta,
              redirected: true,
              originalSource: s ? e.source : meta.originalSource,
              originalTarget: !s ? e.target : meta.originalTarget,
            },
          };
        });

      const internal = allEdges
        .filter((e) => childIds.has(e.source) && childIds.has(e.target))
        .map((e) => ({ id: e.id, hidden: true }));

      const patch = [...redirect, ...internal];
      if (patch.length) await this.model.updateEdges(patch as any);
    } else {
      const restore = allEdges
        .filter((e) => (e.data as EdgeRedirectMeta | undefined)?.redirected)
        .map((e) => {
          const meta = (e.data ?? {}) as unknown as EdgeRedirectMeta;
          return {
            id: e.id,
            source: meta.originalSource ?? e.source,
            target: meta.originalTarget ?? e.target,
            data: {
              ...meta,
              redirected: false,
              originalSource: undefined,
              originalTarget: undefined,
            },
          };
        });

      const internal = allEdges
        .filter((e) => childIds.has(e.source) && childIds.has(e.target))
        .map((e) => ({ id: e.id, hidden: false }));

      const patch = [...restore, ...internal];
      if (patch.length) await this.model.updateEdges(patch as any);

      if (childIds.size) {
        await this.model.updateNodes([...childIds].map((id) => ({ id, hidden: false })));
      }
    }

    await this.model.updateNode(current.id, {
      size: next ? { width: 300, height: 56 } : expandedSize,
      data: { ...data, isCollapsed: next, expandedSize },
    });
  }
}
