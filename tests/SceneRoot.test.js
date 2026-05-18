import { describe, it, expect } from 'vitest';
import { SceneRoot } from '../src/scene/SceneRoot.js';
import { Actor, ACTOR_TYPE } from '../src/scene/Actor.js';
import { Light, LIGHT_TYPE } from '../src/scene/Light.js';
import * as Mat34 from '../src/math/Mat34.js';

describe('SceneRoot.collectLights', () => {
  it('collects light actors with world-space position and forward direction', () => {
    const root = new SceneRoot();

    const sun = new Actor({ type: ACTOR_TYPE.LIGHT });
    sun.light = new Light({ type: LIGHT_TYPE.DIRECT });
    // Sun looks straight down: rotate so local -Z becomes world -Y.
    // Rotation around X by -90° maps (-Z) → (-Y).
    Mat34.rotationX(sun.transform, -Math.PI / 2);
    root.add(sun);

    const lamp = new Actor({ type: ACTOR_TYPE.LIGHT });
    lamp.light = new Light({ type: LIGHT_TYPE.POINT });
    Mat34.translation(lamp.transform, 10, 5, 0);
    root.add(lamp);

    const lights = root.collectLights();
    expect(lights.length).toBe(2);

    const sunL = lights.find(L => L.type === LIGHT_TYPE.DIRECT);
    expect(sunL).toBeTruthy();
    // Sun's forward should point roughly -Y
    expect(sunL.dir[1]).toBeLessThan(-0.5);

    const lampL = lights.find(L => L.type === LIGHT_TYPE.POINT);
    expect(lampL.pos).toEqual([10, 5, 0]);
  });

  it('skips light actors with no .light attached', () => {
    const root = new SceneRoot();
    const stranger = new Actor({ type: ACTOR_TYPE.LIGHT });
    root.add(stranger);
    expect(root.collectLights().length).toBe(0);
  });
});
