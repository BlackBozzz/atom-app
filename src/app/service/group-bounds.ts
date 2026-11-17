export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BoundsNode {
  id: string;
  groupId?: string;
  hidden?: boolean;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  data?: Record<string, unknown>;
}

export interface GroupBoundsOptions {
  /** Отступ от детей до границы контейнера */
  padding: number;
  /** Высота шапки района — дети начинаются ниже неё */
  headerHeight: number;
  /** Размер свёрнутой группы */
  collapsedSize: { width: number; height: number };
  /** Минимальный размер развёрнутой группы */
  minSize: { width: number; height: number };
}

export const DEFAULT_BOUNDS_OPTIONS: GroupBoundsOptions = {
  padding: 28,
  headerHeight: 46,
  collapsedSize: { width: 300, height: 56 },
  minSize: { width: 320, height: 200 },
};

export interface NodePatch {
  id: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  data?: Record<string, unknown>;
}

/**
 * Приводит геометрию групп в согласованное состояние:
 *  - развёрнутая группа = bbox видимых детей + padding + шапка;
 *  - дети сдвигаются внутрь контейнера, если вылезают за него;
 *  - свёрнутая группа получает компактный размер, её expandedSize запоминается.
 *
 * Координаты в ng-diagram АБСОЛЮТНЫЕ, поэтому bbox считается в мировых осях.
 */
export function normalizeGroupBounds(
  nodes: BoundsNode[],
  options: Partial<GroupBoundsOptions> = {},
): NodePatch[] {
  const opt = { ...DEFAULT_BOUNDS_OPTIONS, ...options };
  const patches: NodePatch[] = [];

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childrenOf = new Map<string, BoundsNode[]>();
  for (const n of nodes) {
    if (!n.groupId || !byId.has(n.groupId)) continue;
    if (!childrenOf.has(n.groupId)) childrenOf.set(n.groupId, []);
    childrenOf.get(n.groupId)!.push(n);
  }

  // Группы определяем по факту наличия детей — свойство isGroup есть не во всех типах
  const groupIds = [...childrenOf.keys()];

  // Сначала внутренние группы (вложенность), потом внешние
  const depthOf = (id: string): number => {
    let d = 0;
    let cur = byId.get(id);
    const guard = new Set<string>();
    while (cur?.groupId && byId.has(cur.groupId) && !guard.has(cur.id)) {
      guard.add(cur.id);
      d++;
      cur = byId.get(cur.groupId);
    }
    return d;
  };
  groupIds.sort((a, b) => depthOf(b) - depthOf(a));

  // Локальная копия позиций/размеров, чтобы вложенные группы учитывали уже применённые патчи
  const live = new Map<
    string,
    { pos: { x: number; y: number }; size: { width: number; height: number } }
  >();
  for (const n of nodes) {
    live.set(n.id, {
      pos: { x: n.position?.x ?? 0, y: n.position?.y ?? 0 },
      size: { width: n.size?.width ?? 260, height: n.size?.height ?? 158 },
    });
  }

  for (const groupId of groupIds) {
    const group = byId.get(groupId)!;
    const data = (group.data ?? {}) as Record<string, unknown>;
    const collapsed = Boolean(data['isCollapsed']);
    const kids = (childrenOf.get(groupId) ?? []).filter((k) => !k.hidden);

    if (collapsed || kids.length === 0) {
      const size = collapsed
        ? opt.collapsedSize
        : {
            width: Math.max(opt.minSize.width, live.get(groupId)!.size.width),
            height: Math.max(opt.minSize.height, live.get(groupId)!.size.height),
          };
      const cur = live.get(groupId)!.size;
      if (cur.width !== size.width || cur.height !== size.height) {
        patches.push({ id: groupId, size });
        live.get(groupId)!.size = { ...size };
      }
      continue;
    }

    // 1. BBox видимых детей в абсолютных координатах
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const k of kids) {
      const g = live.get(k.id)!;
      minX = Math.min(minX, g.pos.x);
      minY = Math.min(minY, g.pos.y);
      maxX = Math.max(maxX, g.pos.x + g.size.width);
      maxY = Math.max(maxY, g.pos.y + g.size.height);
    }
    if (!Number.isFinite(minX)) continue;

    const contentW = maxX - minX;
    const contentH = maxY - minY;

    const width = Math.max(opt.minSize.width, Math.round(contentW + opt.padding * 2));
    const height = Math.max(
      opt.minSize.height,
      Math.round(contentH + opt.padding * 2 + opt.headerHeight),
    );

    // 2. Группа ставится так, чтобы дети оказались внутри с нужными отступами
    const groupX = Math.round(minX - opt.padding);
    const groupY = Math.round(minY - opt.padding - opt.headerHeight);

    const curGroup = live.get(groupId)!;
    const groupMoved = curGroup.pos.x !== groupX || curGroup.pos.y !== groupY;
    const groupResized = curGroup.size.width !== width || curGroup.size.height !== height;

    if (groupMoved || groupResized) {
      patches.push({
        id: groupId,
        position: { x: groupX, y: groupY },
        size: { width, height },
        data: { ...data, expandedSize: { width, height } },
      });
      curGroup.pos = { x: groupX, y: groupY };
      curGroup.size = { width, height };
    } else {
      // размер тот же, но expandedSize мог быть не записан
      const stored = data['expandedSize'] as { width: number; height: number } | undefined;
      if (!stored || stored.width !== width || stored.height !== height) {
        patches.push({ id: groupId, data: { ...data, expandedSize: { width, height } } });
      }
    }
  }

  return patches;
}
