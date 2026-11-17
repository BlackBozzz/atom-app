import { Injectable, signal } from '@angular/core';
import { NgDiagramModelService } from 'ng-diagram';
import { computeLayout } from './layout-engine';
import {
  DEFAULT_SETTINGS,
  LayoutEdgeInput,
  LayoutNodeInput,
  LayoutResult,
  LayoutSettings,
  LayoutStats,
} from './layout.types';

interface AnyNode {
  id: string;
  groupId?: string;
  isGroup?: boolean;
  hidden?: boolean;
  size?: { width: number; height: number };
  data?: Record<string, unknown>;
}

interface AnyEdge {
  id: string;
  source: string;
  target: string;
}

/**
 * ВАЖНО: сервис НЕ providedIn:'root'.
 * provideNgDiagram() создаёт NgDiagramModelService в инжекторе компонента,
 * поэтому сервис раскладки обязан жить в том же инжекторе — иначе он получает
 * другой экземпляр модели и позиции никогда не применяются.
 */
@Injectable()
export class DiagramLayoutService {
  readonly stats = signal<LayoutStats>({
    nodes: 0,
    groups: 0,
    edges: 0,
    layers: 0,
    crossings: 0,
    width: 0,
    height: 0,
    ms: 0,
  });
  readonly busy = signal(false);

  private timer: ReturnType<typeof setTimeout> | null = null;
  private last: LayoutResult | null = null;

  constructor(private model: NgDiagramModelService) {}

  readInputs(nodeWidth: number): { nodes: LayoutNodeInput[]; edges: LayoutEdgeInput[] } {
    const raw = (this.model.nodes() as unknown as AnyNode[]) ?? [];
    const rawEdges = (this.model.edges() as unknown as AnyEdge[]) ?? [];

    const nodes: LayoutNodeInput[] = raw.map((n) => {
      const data = (n.data ?? {}) as Record<string, unknown>;
      const isGroup = Boolean(n.isGroup);
      const collapsed = Boolean(data['isCollapsed']);
      const measuredW = n.size?.width;
      const measuredH = n.size?.height;
      return {
        id: n.id,
        width: isGroup ? (measuredW ?? 640) : (measuredW ?? nodeWidth),
        height: isGroup ? (measuredH ?? 380) : (measuredH ?? 158),
        parentId: n.groupId,
        isGroup,
        collapsed,
        hidden: Boolean(n.hidden),
      };
    });

    const edges: LayoutEdgeInput[] = rawEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    }));

    return { nodes, edges };
  }

  preview(settings: LayoutSettings, nodeWidth: number): LayoutResult {
    const { nodes, edges } = this.readInputs(nodeWidth);
    const result = computeLayout(nodes, edges, settings);
    this.stats.set(result.stats);
    this.last = result;
    return result;
  }

  async apply(settings: LayoutSettings, nodeWidth: number): Promise<LayoutResult> {
    this.busy.set(true);
    try {
      const result = this.preview(settings, nodeWidth);
      await this.commit(result);
      return result;
    } finally {
      this.busy.set(false);
    }
  }

  async commit(result: LayoutResult): Promise<void> {
    if (!result.nodes.length) return;
    await this.model.updateNodes(
      result.nodes.map((n) => ({
        id: n.id,
        position: { x: n.x, y: n.y },
        ...(n.isGroup && n.width && n.height ? { size: { width: n.width, height: n.height } } : {}),
      })),
    );
  }

  schedule(settings: LayoutSettings, nodeWidth: number, delay = 40): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.apply(settings, nodeWidth);
    }, delay);
  }

  cancel(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  /** Центрирование схемы чисто математикой модели — без зависимости от zoom API. */
  async centerOn(target = { x: 520, y: 360 }): Promise<void> {
    const raw = (this.model.nodes() as unknown as AnyNode[]) ?? [];
    const visible = raw.filter((n) => !n.hidden);
    if (!visible.length) return;
    const pts = visible.map((n) => {
      const anyN = n as unknown as { position?: { x: number; y: number } };
      return {
        id: n.id,
        x: anyN.position?.x ?? 0,
        y: anyN.position?.y ?? 0,
        w: n.size?.width ?? 260,
        h: n.size?.height ?? 158,
      };
    });
    const minX = Math.min(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    const maxX = Math.max(...pts.map((p) => p.x + p.w));
    const maxY = Math.max(...pts.map((p) => p.y + p.h));
    const dx = target.x - (minX + maxX) / 2;
    const dy = target.y - (minY + maxY) / 2;
    await this.model.updateNodes(
      pts.map((p) => ({
        id: p.id,
        position: { x: Math.round(p.x + dx), y: Math.round(p.y + dy) },
      })),
    );
  }

  get lastResult(): LayoutResult | null {
    return this.last;
  }

  readonly defaults = DEFAULT_SETTINGS;
}
