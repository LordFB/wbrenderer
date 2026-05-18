import * as Mat34 from '../math/Mat34.js';

export const ACTOR_TYPE = {
  NONE: 'none',
  MODEL: 'model',
  CAMERA: 'camera',
  LIGHT: 'light',
};

export class Actor {
  constructor({ type = ACTOR_TYPE.NONE, name = '', model = null, material = 0xffffff } = {}) {
    this.type = type;
    this.name = name;
    this.transform = Mat34.create();
    this.model = model;
    this.material = material;
    this.parent = null;
    this.children = [];
    // Filled per-frame by the renderer when walking the tree.
    this._worldMatrix = Mat34.create();
  }

  add(child) {
    if (child.parent) child.parent.remove(child);
    child.parent = this;
    this.children.push(child);
    return child;
  }

  remove(child) {
    const i = this.children.indexOf(child);
    if (i >= 0) {
      this.children.splice(i, 1);
      child.parent = null;
    }
  }
}

// Walk the actor tree, calling visit(actor, worldMatrix) for each. The
// world matrix is built by composing parent * child each step.
export function walkTree(root, visit) {
  const stack = [[root, null]];
  while (stack.length) {
    const [actor, parentWorld] = stack.pop();
    if (parentWorld) {
      Mat34.multiply(actor._worldMatrix, parentWorld, actor.transform);
    } else {
      actor._worldMatrix.set(actor.transform);
    }
    visit(actor, actor._worldMatrix);
    for (let i = actor.children.length - 1; i >= 0; i--) {
      stack.push([actor.children[i], actor._worldMatrix]);
    }
  }
}
