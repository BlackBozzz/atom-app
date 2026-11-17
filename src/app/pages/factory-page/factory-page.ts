import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  NgDiagramBackgroundComponent,
  NgDiagramComponent,
  NgDiagramModelService,
  NgDiagramNodeTemplateMap,
  initializeModel,
  provideNgDiagram,
} from 'ng-diagram';
import { BuildingNode } from '../../components/building-node/building-node';
import {
  InfrastructureNodeData,
  ResourceStatus,
} from '../../components/building-node/building-node.model';
import { DistrictNodeData } from '../../components/district-node/district-node.model';
import { DiagramLayoutService } from '../../service/diagram-layout.service';
import {
  DEFAULT_SETTINGS,
  LayoutDirection,
  LayoutMode,
  LayoutSettings,
} from '../../service/layout.types';
import { buildSeededModel } from './factory-seed';
import { readData } from '../../service/node-data.util';
import { DistrictNode } from '../../components/district-node/district-node';
import { BoundsNode, normalizeGroupBounds } from '../../service/group-bounds';

interface AnyNode {
  id: string;
  type?: string;
  isGroup?: boolean;
  groupId?: string;
  hidden?: boolean;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  data?: Record<string, unknown>;
}

interface Snapshot {
  label: string;
  nodes: Array<{
    id: string;
    position: { x: number; y: number };
    hidden: boolean;
    data: Record<string, unknown>;
  }>;
}

@Component({
  selector: 'app-factory-page',
  standalone: true,
  imports: [NgDiagramComponent, NgDiagramBackgroundComponent],
  templateUrl: './factory-page.html',
  styleUrl: './factory-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  /* Ключевое исправление: сервис раскладки в ТОМ ЖЕ инжекторе, что и модель. */
  providers: [provideNgDiagram(), DiagramLayoutService],
})
export class FactoryPage {
  private layout = inject(DiagramLayoutService);
  private model = inject(NgDiagramModelService);
  private destroyRef = inject(DestroyRef);

  readonly nodeTemplateMap = new NgDiagramNodeTemplateMap([
    ['district', DistrictNode],
    ['building', BuildingNode],
  ]);

  readonly model0 = initializeModel(buildSeededModel(DEFAULT_SETTINGS ? 260 : 260) as any);

  /* ----------------live-настройки раскладки---------------- */
  readonly mode = signal<LayoutMode>('layered');
  readonly direction = signal<LayoutDirection>('LR');
  readonly layerGap = signal(130);
  readonly nodeGap = signal(46);
  readonly groupPadding = signal(34);
  readonly relaxation = signal(35);
  readonly iterations = signal(14);
  readonly nodeWidth = signal(260);
  readonly seed = signal(7);

  readonly grid = signal(true);
  readonly glow = signal(true);
  readonly labels = signal(true);
  readonly theme = signal<'dark' | 'light'>('dark');

  readonly query = signal('');
  readonly selectedId = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly historyDepth = signal(0);

  readonly stats = this.layout.stats;
  readonly busy = this.layout.busy;

  readonly settings = computed<LayoutSettings>(() => ({
    mode: this.mode(),
    direction: this.direction(),
    layerGap: this.layerGap(),
    nodeGap: this.nodeGap(),
    groupPadding: this.groupPadding(),
    groupHeader: 52,
    relaxation: this.relaxation() / 100,
    iterations: this.iterations(),
    seed: this.seed(),
  }));

  readonly allNodes = signal<AnyNode[]>([]);

  readonly matched = computed(() => {
    const q = this.query().trim().toLowerCase();
    const list = this.allNodes().filter((n) => !n.isGroup);
    if (!q) return list;
    return list.filter((n) => {
      const d = readData<Record<string, unknown>>(n.data);
      return (
        String(d['name'] ?? '')
          .toLowerCase()
          .includes(q) ||
        String(d['code'] ?? '')
          .toLowerCase()
          .includes(q) ||
        n.id.toLowerCase().includes(q)
      );
    });
  });

  readonly selected = computed(() => {
    const id = this.selectedId();
    if (!id) return null;
    return this.allNodes().find((n) => n.id === id) ?? null;
  });

  readonly selectedData = computed<Record<string, unknown>>(() =>
    readData<Record<string, unknown>>(this.selected()?.data),
  );

  readonly faults = computed(
    () =>
      this.allNodes().filter((n) => {
        const d = readData<Record<string, unknown>>(n.data);
        return d['waterStatus'] === 'emergency' || d['electricityStatus'] === 'emergency';
      }).length,
  );

  readonly repairs = computed(
    () =>
      this.allNodes().filter((n) => {
        const d = readData<Record<string, unknown>>(n.data);
        return d['waterStatus'] === 'repair' || d['electricityStatus'] === 'repair';
      }).length,
  );

  readonly modes: Array<{ value: LayoutMode; label: string; hint: string }> = [
    { value: 'layered', label: 'Слоистая', hint: 'Поток слева направо, минимум пересечений' },
    { value: 'organic', label: 'Свободная', hint: 'Силовая релаксация поверх слоёв' },
    { value: 'radial', label: 'Радиальная', hint: 'Концентрические кольца по глубине' },
    { value: 'grid', label: 'Сетка', hint: 'Плотная упаковка по связности' },
  ];

  readonly directions: Array<{ value: LayoutDirection; label: string }> = [
    { value: 'LR', label: '→ Вправо' },
    { value: 'RL', label: '← Влево' },
    { value: 'TB', label: '↓ Вниз' },
    { value: 'BT', label: '↑ Вверх' },
  ];

  readonly statuses: ResourceStatus[] = ['normal', 'emergency', 'repair'];

  private history: Snapshot[] = [];
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    afterNextRender(() => {
      // 1. Контейнеры сразу подгоняем под детей — до первого кадра
      void this.fitGroups();
      this.refresh();

      // 2. Полная раскладка после того, как DOM отрисован
      void this.relayout(0);

      // 3. Контрольный проход: ng-diagram измерил реальные размеры карточек
      const t = setTimeout(() => {
        this.refresh();
        void this.relayout(0).then(() => this.fitGroups());
      }, 280);

      this.destroyRef.onDestroy(() => clearTimeout(t));
    });

    this.destroyRef.onDestroy(() => {
      this.layout.cancel();
      if (this.toastTimer) clearTimeout(this.toastTimer);
      if (this.refreshTimer) clearTimeout(this.refreshTimer);
    });
  }

  private async fitGroups(): Promise<void> {
    const nodes = this.model.nodes() as unknown as BoundsNode[];
    const patches = normalizeGroupBounds(nodes, { padding: 28, headerHeight: 46 });
    if (patches.length) await this.model.updateNodes(patches as any);
  }

  /* ----------------служебное---------------- */
  private refresh(): void {
    this.allNodes.set([...(this.model.nodes() as unknown as AnyNode[])]);
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => this.refresh(), 30);
  }

  private notify(message: string): void {
    this.toast.set(message);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 2400);
  }

  private pushHistory(label: string): void {
    const nodes = (this.model.nodes() as unknown as AnyNode[]).map((n) => ({
      id: n.id,
      position: { x: n.position?.x ?? 0, y: n.position?.y ?? 0 },
      hidden: Boolean(n.hidden),
      data: { ...(n.data ?? {}) },
    }));
    this.history.push({ label, nodes });
    if (this.history.length > 40) this.history.shift();
    this.historyDepth.set(this.history.length);
  }

  /* ----------------раскладка---------------- */
  async relayout(delay = 40): Promise<void> {
    if (delay > 0) {
      this.layout.schedule(this.settings(), this.nodeWidth(), delay);
      return;
    }
    await this.layout.apply(this.settings(), this.nodeWidth());
    this.scheduleRefresh();
  }

  onSetting(): void {
    void this.relayout(60);
  }

  setMode(v: string): void {
    this.mode.set(v as LayoutMode);
    if (v === 'organic' && this.relaxation() < 55) this.relaxation.set(70);
    void this.relayout(0);
  }

  setDirection(v: string): void {
    this.direction.set(v as LayoutDirection);
    void this.relayout(0);
  }

  bumpIterations(delta: number): void {
    this.iterations.set(Math.max(2, Math.min(40, this.iterations() + delta)));
    void this.relayout(0);
  }

  bumpSeed(delta: number): void {
    this.seed.set(Math.max(1, Math.min(999, this.seed() + delta)));
    void this.relayout(0);
  }

  randomize(): void {
    this.pushHistory('Случайная раскладка');
    this.seed.set(1 + Math.floor(Math.random() * 998));
    this.layerGap.set(80 + Math.floor(Math.random() * 130));
    this.nodeGap.set(28 + Math.floor(Math.random() * 60));
    this.relaxation.set(20 + Math.floor(Math.random() * 70));
    void this.relayout(0);
    this.notify('Параметры раскладки перемешаны');
  }

  async resetAll(): Promise<void> {
    this.mode.set(DEFAULT_SETTINGS.mode);
    this.direction.set(DEFAULT_SETTINGS.direction);
    this.layerGap.set(DEFAULT_SETTINGS.layerGap);
    this.nodeGap.set(DEFAULT_SETTINGS.nodeGap);
    this.groupPadding.set(DEFAULT_SETTINGS.groupPadding);
    this.relaxation.set(Math.round(DEFAULT_SETTINGS.relaxation * 100));
    this.iterations.set(DEFAULT_SETTINGS.iterations);
    this.nodeWidth.set(260);
    this.seed.set(DEFAULT_SETTINGS.seed);
    this.query.set('');
    this.selectedId.set(null);

    const seed = buildSeededModel(260);
    await this.model.updateNodes(
      seed.nodes.map((n) => ({
        id: n.id,
        position: n.position,
        hidden: false,
        ...(n.isGroup && n.size ? { size: n.size } : {}),
        data: { ...n.data },
      })) as any,
    );
    await this.model.updateEdges(
      seed.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourcePort: e.sourcePort,
        targetPort: e.targetPort,
        hidden: false,
        data: {},
      })) as any,
    );
    this.history = [];
    this.historyDepth.set(0);
    this.refresh();
    await this.relayout(0);
    this.notify('Схема возвращена к исходному состоянию');
  }

  async undo(): Promise<void> {
    const snap = this.history.pop();
    this.historyDepth.set(this.history.length);
    if (!snap) {
      this.notify('История пуста');
      return;
    }
    await this.model.updateNodes(
      snap.nodes.map((n) => ({
        id: n.id,
        position: n.position,
        hidden: n.hidden,
        data: n.data,
      })) as any,
    );
    this.refresh();
    this.notify(`Отменено: ${snap.label}`);
  }

  async centerScheme(): Promise<void> {
    this.pushHistory('Центрирование');
    await this.layout.centerOn({ x: 560, y: 380 });
    this.refresh();
    this.notify('Схема центрирована');
  }

  /* ----------------группы---------------- */
  private async setGroupCollapsed(groupId: string, next: boolean): Promise<void> {
    const nodes = this.model.nodes() as unknown as AnyNode[];
    const group = nodes.find((n) => n.id === groupId);
    if (!group) return;
    const data = readData<DistrictNodeData>(group.data);
    if (Boolean(data.isCollapsed) === next) return;

    const childIds = new Set(nodes.filter((n) => n.groupId === groupId).map((n) => n.id));
    const edges = this.model.edges() as unknown as Array<{
      id: string;
      source: string;
      target: string;
      data?: Record<string, unknown>;
    }>;
    const expandedSize = data.expandedSize ?? group.size ?? { width: 700, height: 420 };

    if (next) {
      if (childIds.size) {
        await this.model.updateNodes([...childIds].map((id) => ({ id, hidden: true })));
      }
      const patch = edges
        .filter((e) => {
          const s = childIds.has(e.source);
          const t = childIds.has(e.target);
          return (s || t) && !(s && t);
        })
        .map((e) => {
          const s = childIds.has(e.source);
          const meta = e.data ?? {};
          return {
            id: e.id,
            source: s ? groupId : e.source,
            target: !s ? groupId : e.target,
            data: {
              ...meta,
              redirected: true,
              originalSource: s ? e.source : meta['originalSource'],
              originalTarget: !s ? e.target : meta['originalTarget'],
            },
          };
        });
      const internal = edges
        .filter((e) => childIds.has(e.source) && childIds.has(e.target))
        .map((e) => ({ id: e.id, hidden: true }));
      if (patch.length || internal.length)
        await this.model.updateEdges([...patch, ...internal] as any);
    } else {
      const restore = edges
        .filter((e) => e.data?.['redirected'])
        .map((e) => {
          const meta = e.data ?? {};
          return {
            id: e.id,
            source: (meta['originalSource'] as string) ?? e.source,
            target: (meta['originalTarget'] as string) ?? e.target,
            data: {
              ...meta,
              redirected: false,
              originalSource: undefined,
              originalTarget: undefined,
            },
          };
        });
      const internal = edges
        .filter((e) => childIds.has(e.source) && childIds.has(e.target))
        .map((e) => ({ id: e.id, hidden: false }));
      if (restore.length || internal.length)
        await this.model.updateEdges([...restore, ...internal] as any);
      if (childIds.size) {
        await this.model.updateNodes([...childIds].map((id) => ({ id, hidden: false })));
      }
    }

    await this.model.updateNode(groupId, {
      size: next ? { width: 300, height: 56 } : expandedSize,
      data: { ...data, isCollapsed: next, expandedSize },
    });
  }

  async collapseAll(): Promise<void> {
    this.pushHistory('Свернуть все районы');
    const groups = (this.model.nodes() as unknown as AnyNode[]).filter((n) => n.isGroup);
    for (const g of groups) await this.setGroupCollapsed(g.id, true);
    this.refresh();
    await this.relayout(0);
    this.notify(`Свёрнуто районов: ${groups.length}`);
  }

  async expandAll(): Promise<void> {
    this.pushHistory('Развернуть все районы');
    const groups = (this.model.nodes() as unknown as AnyNode[]).filter((n) => n.isGroup);
    for (const g of groups) await this.setGroupCollapsed(g.id, false);
    this.refresh();
    await this.relayout(0);
    this.notify(`Развёрнуто районов: ${groups.length}`);
  }

  /* ----------------выбор и инспектор---------------- */
  select(id: string): void {
    this.selectedId.set(this.selectedId() === id ? null : id);
    void this.applyHighlight();
  }

  closeInspector(): void {
    this.selectedId.set(null);
    void this.applyHighlight();
  }

  onQuery(value: string): void {
    this.query.set(value);
    void this.applyHighlight();
  }

  private async applyHighlight(): Promise<void> {
    const q = this.query().trim().toLowerCase();
    const sel = this.selectedId();
    const nodes = this.model.nodes() as unknown as AnyNode[];
    const patch = nodes
      .filter((n) => !n.isGroup)
      .map((n) => {
        const d = readData<Record<string, unknown>>(n.data);
        const hit =
          !!sel && n.id === sel
            ? true
            : !!q &&
              (String(d['name'] ?? '')
                .toLowerCase()
                .includes(q) ||
                String(d['code'] ?? '')
                  .toLowerCase()
                  .includes(q) ||
                n.id.toLowerCase().includes(q));
        if (Boolean(d['isHighlighted']) === hit) return null;
        return { id: n.id, data: { ...d, isHighlighted: hit } };
      })
      .filter(Boolean);
    if (patch.length) await this.model.updateNodes(patch as any);
    this.scheduleRefresh();
  }

  async renameSelected(value: string): Promise<void> {
    const node = this.selected();
    if (!node) return;
    const name = value.trim();
    if (!name) return;
    this.pushHistory('Переименование');
    await this.model.updateNode(node.id, { data: { ...(node.data ?? {}), name } });
    this.refresh();
    this.notify('Название обновлено');
  }

  async setStatus(
    resource: 'waterStatus' | 'electricityStatus',
    status: ResourceStatus,
  ): Promise<void> {
    const node = this.selected();
    if (!node) return;
    this.pushHistory('Смена статуса');
    await this.model.updateNode(node.id, { data: { ...(node.data ?? {}), [resource]: status } });
    this.refresh();
    this.notify(resource === 'waterStatus' ? 'Статус воды обновлён' : 'Статус энергии обновлён');
  }

  async setLoad(value: number): Promise<void> {
    const node = this.selected();
    if (!node) return;
    const load = Math.max(0, Math.min(100, Math.round(value)));
    await this.model.updateNode(node.id, { data: { ...(node.data ?? {}), load } });
    this.scheduleRefresh();
  }

  async toggleHidden(id: string): Promise<void> {
    const node = (this.model.nodes() as unknown as AnyNode[]).find((n) => n.id === id);
    if (!node) return;
    this.pushHistory(node.hidden ? 'Показать узел' : 'Скрыть узел');
    await this.model.updateNode(id, { hidden: !node.hidden });
    this.refresh();
    await this.relayout(0);
    this.notify(node.hidden ? 'Узел возвращён на схему' : 'Узел скрыт (Ctrl+Z — вернуть)');
  }

  async focusNode(id: string): Promise<void> {
    const nodes = this.model.nodes() as unknown as AnyNode[];
    const target = nodes.find((n) => n.id === id);
    if (!target?.position) return;
    this.pushHistory('Фокус на узле');
    const dx = 560 - target.position.x;
    const dy = 380 - target.position.y;
    await this.model.updateNodes(
      nodes
        .filter((n) => n.position)
        .map((n) => ({
          id: n.id,
          position: { x: Math.round(n.position!.x + dx), y: Math.round(n.position!.y + dy) },
        })),
    );
    this.refresh();
    this.select(id);
  }

  /* ----------------экспорт---------------- */
  exportJson(): void {
    const payload = {
      meta: {
        title: 'Инфраструктурная схема',
        exportedAt: new Date().toISOString(),
        settings: this.settings(),
        stats: this.stats(),
      },
      nodes: this.model.nodes(),
      edges: this.model.edges(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `infrastructure-layout-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
    this.notify('JSON выгружен');
  }

  statusLabel(s: string): string {
    return s === 'normal' ? 'Норма' : s === 'emergency' ? 'Авария' : 'Ремонт';
  }

  onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      void this.undo();
    }
    if (event.key === 'Escape') this.closeInspector();
  }
}
