import { describe, expect, it } from 'vitest';
import type { GroupNode, Node } from 'ng-diagram';
import { fitDistrictBounds } from './district-sizing';

function group(width: number, height: number): GroupNode {
  return { id: 'district', isGroup: true, highlighted: false, position: { x: 100, y: 80 }, size: { width, height }, data: {} };
}

function child(x: number, y: number, width = 268, height = 150): Node {
  return { id: `child-${x}-${y}`, position: { x, y }, size: { width, height }, data: {} };
}

describe('district bounds', () => {
  it('expands to contain all child nodes and header', () => {
    expect(fitDistrictBounds(group(100, 100), [child(140, 140), child(660, 400)])).toEqual({
      position: { x: 100, y: 80 },
      size: { width: 848, height: 490 },
    });
  });

  it('never reduces manually resized group', () => {
    expect(fitDistrictBounds(group(1000, 600), [child(140, 140)])).toEqual({
      position: { x: 100, y: 80 },
      size: { width: 1000, height: 600 },
    });
  });

  it('makes room for children to the left or above the header', () => {
    expect(fitDistrictBounds(group(300, 200), [child(90, 90, 100, 60)])).toEqual({
      position: { x: 70, y: 30 },
      size: { width: 330, height: 250 },
    });
  });

  it('uses the default building size before DOM measurements are available', () => {
    expect(fitDistrictBounds(group(100, 100), [{ id: 'a', position: { x: 140, y: 140 }, data: {} }])).toEqual({
      position: { x: 100, y: 80 },
      size: { width: 328, height: 230 },
    });
  });
});
