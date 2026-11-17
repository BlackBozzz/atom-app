import type { GroupNode, Node, Point, Size } from 'ng-diagram';

const PADDING = 20;
const HEADER_HEIGHT = 40;
const MIN_WIDTH = 270;
const MIN_HEIGHT = 130;
const DEFAULT_CHILD_WIDTH = 268;
const DEFAULT_CHILD_HEIGHT = 150;

export interface DistrictBounds {
  position: Point;
  size: Size;
}

// Coordinates of group children in ng-diagram are absolute, not relative to their group.
// Grow the group to contain all children, but never discard a previously chosen size.
export function fitDistrictBounds(group: Pick<GroupNode, 'position' | 'size'>, children: readonly Node[]): DistrictBounds {
  const startX = group.position.x;
  const startY = group.position.y;
  let left = startX;
  let top = startY;
  let right = startX + Math.max(MIN_WIDTH, group.size?.width ?? 0);
  let bottom = startY + Math.max(MIN_HEIGHT, group.size?.height ?? 0);

  for (const child of children) {
    const width = child.size?.width || child.measuredBounds?.width || DEFAULT_CHILD_WIDTH;
    const height = child.size?.height || child.measuredBounds?.height || DEFAULT_CHILD_HEIGHT;
    left = Math.min(left, child.position.x - PADDING);
    top = Math.min(top, child.position.y - HEADER_HEIGHT - PADDING);
    right = Math.max(right, child.position.x + width + PADDING);
    bottom = Math.max(bottom, child.position.y + height + PADDING);
  }

  return {
    position: { x: left, y: top },
    size: { width: right - left, height: bottom - top },
  };
}
