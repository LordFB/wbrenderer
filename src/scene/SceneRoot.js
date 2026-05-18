import { Actor, ACTOR_TYPE, walkTree } from './Actor.js';
import { LIGHT_TYPE } from './Light.js';

// Convenience root that caches a flat list of "resolved" lights in world
// space each frame. Saves the renderer from walking the tree twice.

export class SceneRoot extends Actor {
  constructor() {
    super({ type: ACTOR_TYPE.NONE, name: 'root' });
    this.ambient = 0.15;
    this.fog = null;
    this._lights = [];
  }

  collectLights() {
    const out = this._lights;
    out.length = 0;
    walkTree(this, (actor, world) => {
      if (actor.type !== ACTOR_TYPE.LIGHT || !actor.light) return;
      const L = actor.light;
      // Position = translation column of world matrix.
      const pos = [world[9], world[10], world[11]];
      // Direction = local -Z transformed by basis. Mat34's transformPoint
      // sends local +Z to (m[6], m[7], m[8]), so the actor's forward (-Z)
      // is (-m[6], -m[7], -m[8]).
      const dx = -world[6], dy = -world[7], dz = -world[8];
      const dl = Math.hypot(dx, dy, dz) || 1;
      const dir = [dx / dl, dy / dl, dz / dl];
      out.push({
        type: L.type,
        r: L.r, g: L.g, b: L.b,
        intensity: L.intensity,
        pos, dir,
        attenC: L.attenC, attenL: L.attenL, attenQ: L.attenQ,
        innerAngle: L.innerAngle, outerAngle: L.outerAngle,
        cosInner: Math.cos(L.innerAngle),
        cosOuter: Math.cos(L.outerAngle),
      });
    });
    return out;
  }
}

export { LIGHT_TYPE };
