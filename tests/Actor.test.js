import { describe, it, expect } from 'vitest';
import { Actor, ACTOR_TYPE, walkTree } from '../src/scene/Actor.js';
import * as Mat34 from '../src/math/Mat34.js';

describe('Actor tree', () => {
  it('walks tree and accumulates world matrices parent*child', () => {
    const root = new Actor({ type: ACTOR_TYPE.NONE });
    Mat34.translation(root.transform, 10, 0, 0);
    const child = new Actor({ type: ACTOR_TYPE.NONE });
    Mat34.translation(child.transform, 0, 5, 0);
    root.add(child);

    const visited = [];
    walkTree(root, (a) => visited.push(a));

    expect(visited.length).toBe(2);
    // Root world translation
    expect(root._worldMatrix[9]).toBe(10);
    expect(root._worldMatrix[10]).toBe(0);
    // Child world translation = parent + local
    expect(child._worldMatrix[9]).toBe(10);
    expect(child._worldMatrix[10]).toBe(5);
  });

  it('reparenting removes from old parent', () => {
    const r1 = new Actor(), r2 = new Actor(), c = new Actor();
    r1.add(c);
    expect(r1.children.length).toBe(1);
    r2.add(c);
    expect(r1.children.length).toBe(0);
    expect(r2.children.length).toBe(1);
    expect(c.parent).toBe(r2);
  });
});
