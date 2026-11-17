import {
  LayoutEdgeInput,
  LayoutNodeInput,
  LayoutPoint,
  LayoutResult,
  LayoutSettings,
} from './layout.types';

/* ------------------------------------------------------------------ *
 * Детерминированный ГПСЧ — раскладка воспроизводима при одном seed.
 * ------------------------------------------------------------------ */
function rng(seed: number): () => number {
  let a = seed | 0 || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const EPS = 1e-6;

interface Box {
  id: string;
  w: number;
  h: number;
  x: number;
  y: number;
  isGroup: boolean;
  collapsed: boolean;
  parentId?: string;
}

interface Graph {
  ids: string[];
  out: Map<string, string[]>;
  inc: Map<string, string[]>;
}

function buildGraph(ids: string[], edges: LayoutEdgeInput[]): Graph {
  const set = new Set(ids);
  const out = new Map<string, string[]>();
  const inc = new Map<string, string[]>();
  ids.forEach((id) => {
    out.set(id, []);
    inc.set(id, []);
  });
  for (const e of edges) {
    if (!set.has(e.source) || !set.has(e.target) || e.source === e.target) continue;
    out.get(e.source)!.push(e.target);
    inc.get(e.target)!.push(e.source);
  }
  return { ids, out, inc };
}

/* ------------------------------------------------------------------ *
 * Слои: longest-path с защитой от циклов.
 * ------------------------------------------------------------------ */
function assignLayers(g: Graph): Map<string, number> {
  const memo = new Map<string, number>();
  const onStack = new Set<string>();

  const depth = (id: string): number => {
    const cached = memo.get(id);
    if (cached !== undefined) return cached;
    if (onStack.has(id)) return 0;
    onStack.add(id);
    let d = 0;
    for (const p of g.inc.get(id) ?? []) d = Math.max(d, depth(p) + 1);
    onStack.delete(id);
    memo.set(id, d);
    return d;
  };

  g.ids.forEach((id) => depth(id));
  return memo;
}

function groupByLayer(ids: string[], layers: Map<string, number>): string[][] {
  const max = ids.reduce((m, id) => Math.max(m, layers.get(id) ?? 0), 0);
  const buckets: string[][] = Array.from({ length: max + 1 }, () => []);
  ids.forEach((id) => buckets[layers.get(id) ?? 0].push(id));
  return buckets.filter((b) => b.length > 0);
}

/* ------------------------------------------------------------------ *
 * Уменьшение пересечений: барисентрические проходы.
 * ------------------------------------------------------------------ */
function reduceCrossings(buckets: string[][], g: Graph, iterations: number): string[][] {
  const order = buckets.map((b) => [...b]);
  const index = new Map<string, number>();
  const reindex = () => order.forEach((b) => b.forEach((id, i) => index.set(id, i)));
  reindex();

  const bary = (id: string, neighbours: string[]): number => {
    if (!neighbours.length) return index.get(id) ?? 0;
    let sum = 0;
    let n = 0;
    for (const nb of neighbours) {
      const i = index.get(nb);
      if (i !== undefined) {
        sum += i;
        n++;
      }
    }
    return n ? sum / n : (index.get(id) ?? 0);
  };

  for (let it = 0; it < Math.max(1, iterations); it++) {
    const forward = it % 2 === 0;
    const range = forward
      ? Array.from({ length: order.length }, (_, i) => i)
      : Array.from({ length: order.length }, (_, i) => order.length - 1 - i);

    for (const li of range) {
      const bucket = order[li];
      if (bucket.length < 2) continue;
      const scored = bucket.map((id) => ({
        id,
        key: bary(id, (forward ? g.inc.get(id) : g.out.get(id)) ?? []),
      }));
      scored.sort((a, b) => a.key - b.key || (index.get(a.id) ?? 0) - (index.get(b.id) ?? 0));
      order[li] = scored.map((s) => s.id);
      reindex();
    }
  }
  return order;
}

function countCrossings(order: string[][], g: Graph): number {
  let total = 0;
  const pos = new Map<string, number>();
  order.forEach((b) => b.forEach((id, i) => pos.set(id, i)));
  for (let li = 0; li < order.length - 1; li++) {
    const pairs: Array<[number, number]> = [];
    for (const u of order[li]) {
      for (const v of g.out.get(u) ?? []) {
        const a = pos.get(u);
        const b = pos.get(v);
        if (a !== undefined && b !== undefined && (g.inc.get(v) ?? []).length) {
          if (order[li + 1].includes(v)) pairs.push([a, b]);
        }
      }
    }
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        if ((pairs[i][0] - pairs[j][0]) * (pairs[i][1] - pairs[j][1]) < 0) total++;
      }
    }
  }
  return total;
}

/* ------------------------------------------------------------------ *
 * Упаковка слоя вдоль поперечной оси без наложений.
 * ------------------------------------------------------------------ */
function packLayer(sizes: number[], desired: number[], gap: number): number[] {
  const n = sizes.length;
  const pos = new Array<number>(n);
  let cursor = -Infinity;
  for (let i = 0; i < n; i++) {
    const min = cursor + sizes[i] / 2;
    pos[i] = Math.max(desired[i], min);
    cursor = pos[i] + sizes[i] / 2 + gap;
  }
  if (!n) return pos;
  let dSum = 0;
  let pSum = 0;
  for (let i = 0; i < n; i++) {
    dSum += desired[i];
    pSum += pos[i];
  }
  const shift = dSum / n - pSum / n;
  for (let i = 0; i < n; i++) pos[i] += shift;
  return pos;
}

/* ------------------------------------------------------------------ *
 * Основной движок
 * ------------------------------------------------------------------ */
export function computeLayout(
  input: LayoutNodeInput[],
  edges: LayoutEdgeInput[],
  s: LayoutSettings,
): LayoutResult {
  const t0 = Date.now();
  const visible = input.filter((n) => !n.hidden);
  const byId = new Map(visible.map((n) => [n.id, n]));

  const childrenOf = new Map<string, LayoutNodeInput[]>();
  const roots: LayoutNodeInput[] = [];
  for (const n of visible) {
    const parent = n.parentId && byId.has(n.parentId) ? n.parentId : undefined;
    if (parent) {
      if (!childrenOf.has(parent)) childrenOf.set(parent, []);
      childrenOf.get(parent)!.push(n);
    } else {
      roots.push(n);
    }
  }

  const boxes = new Map<string, Box>();
  const rand = rng(s.seed);
  let layerTotal = 0;
  let crossingTotal = 0;

  const horizontal = s.direction === 'LR' || s.direction === 'RL';
  const flip = s.direction === 'RL' || s.direction === 'BT';

  const place = (members: LayoutNodeInput[], localEdges: LayoutEdgeInput[]) => {
    const ids = members.map((m) => m.id);
    const g = buildGraph(ids, localEdges);
    const layers = assignLayers(g);
    const ordered = reduceCrossings(groupByLayer(ids, layers), g, s.iterations);
    layerTotal = Math.max(layerTotal, ordered.length);
    crossingTotal += countCrossings(ordered, g);

    const p = new Map<string, number>();
    const c = new Map<string, number>();

    if (s.mode === 'grid') {
      const cols = Math.max(1, Math.ceil(Math.sqrt(members.length)));
      const cellW = Math.max(...members.map((m) => m.width), 120) + s.nodeGap;
      const cellH = Math.max(...members.map((m) => m.height), 90) + s.nodeGap;
      const ranked = [...members].sort(
        (a, b) =>
          g.out.get(b.id)!.length +
          g.inc.get(b.id)!.length -
          (g.out.get(a.id)!.length + g.inc.get(a.id)!.length),
      );
      ranked.forEach((m, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        p.set(m.id, horizontal ? col * cellW : row * cellH);
        c.set(m.id, horizontal ? row * cellH : col * cellW);
      });
    } else if (s.mode === 'radial') {
      const step = Math.max(...members.map((m) => Math.max(m.width, m.height))) + s.layerGap;
      ordered.forEach((bucket, li) => {
        const radius = li * step;
        bucket.forEach((id, i) => {
          const angle = (i / Math.max(1, bucket.length)) * Math.PI * 2 + li * 0.35;
          const m = byId.get(id)!;
          if (radius < EPS) {
            p.set(id, 0);
            c.set(id, 0);
          } else {
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            p.set(id, horizontal ? x : y);
            c.set(id, horizontal ? y : x);
          }
          void m;
        });
      });
    } else {
      /* layered + organic */
      let cursor = 0;
      const layerCenter = new Map<number, number>();
      ordered.forEach((bucket, li) => {
        const extent = Math.max(
          ...bucket.map((id) => {
            const m = byId.get(id)!;
            return horizontal ? m.width : m.height;
          }),
          1,
        );
        const center = cursor + extent / 2;
        layerCenter.set(li, center);
        bucket.forEach((id) => p.set(id, center));
        cursor += extent + s.layerGap;
      });

      ordered.forEach((bucket) => {
        const sizes = bucket.map((id) => {
          const m = byId.get(id)!;
          return horizontal ? m.height : m.width;
        });
        const desired = bucket.map(() => 0);
        const packed = packLayer(sizes, desired, s.nodeGap);
        bucket.forEach((id, i) => c.set(id, packed[i]));
      });

      /* Выпрямление рёбер по барисентру */
      const align = Math.max(2, Math.round(s.iterations / 2));
      for (let it = 0; it < align; it++) {
        const forward = it % 2 === 0;
        const range = forward
          ? Array.from({ length: ordered.length }, (_, i) => i)
          : Array.from({ length: ordered.length }, (_, i) => ordered.length - 1 - i);
        for (const li of range) {
          const bucket = ordered[li];
          if (!bucket.length) continue;
          const sizes = bucket.map((id) => {
            const m = byId.get(id)!;
            return horizontal ? m.height : m.width;
          });
          const desired = bucket.map((id) => {
            const nb = (forward ? g.inc.get(id) : g.out.get(id)) ?? [];
            const vals = nb.map((x) => c.get(x)).filter((v): v is number => v !== undefined);
            if (!vals.length) return c.get(id) ?? 0;
            return vals.reduce((a, b) => a + b, 0) / vals.length;
          });
          const packed = packLayer(sizes, desired, s.nodeGap);
          bucket.forEach((id, i) => c.set(id, packed[i]));
        }
      }

      /* Organic: свободное «дыхание» поверх слоёв */
      if (s.mode === 'organic' || s.relaxation > 0) {
        const strength = s.mode === 'organic' ? Math.max(0.55, s.relaxation) : s.relaxation;
        const steps = Math.round(40 + s.iterations * 6);
        const area = Math.max(1, members.length) * 26000;
        const k = Math.sqrt(area / Math.max(1, members.length));
        const vx = new Map<string, number>();
        const vy = new Map<string, number>();
        ids.forEach((id) => {
          vx.set(id, (rand() - 0.5) * 12);
          vy.set(id, (rand() - 0.5) * 12);
        });

        for (let step = 0; step < steps; step++) {
          const cool = 1 - step / steps;
          const fx = new Map<string, number>(ids.map((id) => [id, 0]));
          const fy = new Map<string, number>(ids.map((id) => [id, 0]));

          for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) {
              const a = ids[i];
              const b = ids[j];
              let dx = (p.get(a) ?? 0) - (p.get(b) ?? 0);
              let dy = (c.get(a) ?? 0) - (c.get(b) ?? 0);
              let d = Math.hypot(dx, dy);
              if (d < EPS) {
                dx = (rand() - 0.5) * 2;
                dy = (rand() - 0.5) * 2;
                d = Math.hypot(dx, dy) + EPS;
              }
              const rep = (k * k) / d;
              const ux = dx / d;
              const uy = dy / d;
              fx.set(a, fx.get(a)! + ux * rep);
              fy.set(a, fy.get(a)! + uy * rep);
              fx.set(b, fx.get(b)! - ux * rep);
              fy.set(b, fy.get(b)! - uy * rep);
            }
          }

          for (const e of localEdges) {
            if (!fx.has(e.source) || !fx.has(e.target)) continue;
            const dx = (p.get(e.source) ?? 0) - (p.get(e.target) ?? 0);
            const dy = (c.get(e.source) ?? 0) - (c.get(e.target) ?? 0);
            const d = Math.hypot(dx, dy) + EPS;
            const att = (d * d) / k;
            const ux = dx / d;
            const uy = dy / d;
            fx.set(e.source, fx.get(e.source)! - ux * att);
            fy.set(e.source, fy.get(e.source)! - uy * att);
            fx.set(e.target, fx.get(e.target)! + ux * att);
            fy.set(e.target, fy.get(e.target)! - uy * att);
          }

          for (const id of ids) {
            const m = byId.get(id)!;
            const li = layers.get(id) ?? 0;
            const anchor = layerCenter.get(li) ?? 0;
            /* мягкая привязка к слою сохраняет читаемость потока */
            fx.set(id, fx.get(id)! + (anchor - (p.get(id) ?? 0)) * (1.6 - strength));
            const lim = 26 * cool + 2;
            const dx = Math.max(-lim, Math.min(lim, fx.get(id)! * 0.012 * strength));
            const dy = Math.max(-lim, Math.min(lim, fy.get(id)! * 0.012 * strength));
            p.set(id, (p.get(id) ?? 0) + dx);
            c.set(id, (c.get(id) ?? 0) + dy);
            void m;
          }
        }

        /* Разрешение наложений после релаксации */
        for (let pass = 0; pass < 8; pass++) {
          let moved = false;
          for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) {
              const a = byId.get(ids[i])!;
              const b = byId.get(ids[j])!;
              const ax = p.get(a.id)!;
              const ay = c.get(a.id)!;
              const bx = p.get(b.id)!;
              const by = c.get(b.id)!;
              const needP = (horizontal ? a.width + b.width : a.height + b.height) / 2 + s.nodeGap;
              const needC = (horizontal ? a.height + b.height : a.width + b.width) / 2 + s.nodeGap;
              const dp = ax - bx;
              const dc = ay - by;
              if (Math.abs(dp) < needP && Math.abs(dc) < needC) {
                const push = (needC - Math.abs(dc)) / 2 + 1;
                const dir = dc >= 0 ? 1 : -1;
                c.set(a.id, ay + dir * push);
                c.set(b.id, by - dir * push);
                moved = true;
              }
            }
          }
          if (!moved) break;
        }
      }
    }

    /* (p, c) → (x, y) с учётом направления */
    members.forEach((m) => {
      let primary = p.get(m.id) ?? 0;
      const cross = c.get(m.id) ?? 0;
      if (flip) primary = -primary;
      const cx = horizontal ? primary : cross;
      const cy = horizontal ? cross : primary;
      boxes.set(m.id, {
        id: m.id,
        w: m.width,
        h: m.height,
        x: cx - m.width / 2,
        y: cy - m.height / 2,
        isGroup: m.isGroup,
        collapsed: m.collapsed,
        parentId: m.parentId,
      });
    });
  };

  /* Рекурсивно: сначала внутренности групп, затем сама группа как узел */
  const resolve = (member: LayoutNodeInput): LayoutNodeInput => {
    const kids = (childrenOf.get(member.id) ?? []).filter((k) => !k.hidden);
    if (!member.isGroup || member.collapsed || !kids.length) {
      return { ...member, width: Math.max(40, member.width), height: Math.max(28, member.height) };
    }
    const resolvedKids = kids.map(resolve);
    const kidIds = new Set(resolvedKids.map((k) => k.id));
    const innerEdges = edges.filter((e) => kidIds.has(e.source) && kidIds.has(e.target));
    place(resolvedKids, innerEdges);

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    resolvedKids.forEach((k) => {
      const b = boxes.get(k.id)!;
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.w);
      maxY = Math.max(maxY, b.y + b.h);
    });

    const pad = s.groupPadding;
    const head = s.groupHeader;
    const contentW = maxX - minX;
    const contentH = maxY - minY;

    resolvedKids.forEach((k) => {
      const b = boxes.get(k.id)!;
      b.x = b.x - minX + pad;
      b.y = b.y - minY + pad + head;
    });

    return {
      ...member,
      width: Math.max(member.width, contentW + pad * 2),
      height: Math.max(member.height, contentH + pad * 2 + head),
    };
  };

  const resolvedRoots = roots.map(resolve);
  const rootIds = new Set(resolvedRoots.map((r) => r.id));
  const rootEdges = edges.filter((e) => rootIds.has(e.source) && rootIds.has(e.target));
  place(resolvedRoots, rootEdges);

  /* Абсолютные координаты: ребёнок = родитель + локальные */
  const absolute = new Map<string, { x: number; y: number }>();
  const walk = (member: LayoutNodeInput, ox: number, oy: number) => {
    const b = boxes.get(member.id);
    if (!b) return;
    const ax = ox + b.x;
    const ay = oy + b.y;
    absolute.set(member.id, { x: ax, y: ay });
    if (member.isGroup && !member.collapsed) {
      (childrenOf.get(member.id) ?? []).forEach((k) => walk(k, ax, ay));
    }
  };
  resolvedRoots.forEach((r) => walk(r, 0, 0));

  /* Нормализация к положительным координатам */
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  visible.forEach((n) => {
    const a = absolute.get(n.id);
    const b = boxes.get(n.id);
    if (!a || !b) return;
    minX = Math.min(minX, a.x);
    minY = Math.min(minY, a.y);
    maxX = Math.max(maxX, a.x + b.w);
    maxY = Math.max(maxY, a.y + b.h);
  });
  if (!isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 0;
    maxY = 0;
  }
  const offsetX = 80 - minX;
  const offsetY = 80 - minY;

  const points: LayoutPoint[] = [];
  visible.forEach((n) => {
    const a = absolute.get(n.id);
    const b = boxes.get(n.id);
    if (!a || !b) return;
    points.push({
      id: n.id,
      x: Math.round(a.x + offsetX),
      y: Math.round(a.y + offsetY),
      isGroup: n.isGroup,
      ...(n.isGroup && !n.collapsed ? { width: Math.round(b.w), height: Math.round(b.h) } : {}),
    });
  });

  return {
    nodes: points,
    stats: {
      nodes: visible.length,
      groups: visible.filter((n) => n.isGroup).length,
      edges: edges.length,
      layers: layerTotal,
      crossings: crossingTotal,
      width: Math.round(maxX - minX),
      height: Math.round(maxY - minY),
      ms: Date.now() - t0,
    },
  };
}
