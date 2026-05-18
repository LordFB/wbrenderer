// BRender .ACT actor loader. Builds an Actor tree from the chunked file.
//
// EAGLE.ACT structure (verified against the real Carmageddon file):
//   FILE_INFO
//   ACTOR             (root — name "EAGLE.ACT")
//     TX_MAT34        (root world transform)
//     ACTOR_TRANSFORM (separator)
//     ACTOR ...       (each new ACTOR opens a child of the current actor)
//       TX_MAT34
//       ACTOR_TRANSFORM
//       ACTOR_MATERIAL  (string: material name to resolve via registry)
//       ACTOR_MODEL     (string: model    name to resolve via registry)
//       ACTOR_ADD_CHILD (pop back to parent so the next ACTOR is a sibling)
//     ACTOR ...
//   ACTOR_ADD_CHILD
//   END
//
// Model/material lookups happen against the global registries by default;
// pass `{ modelLookup, materialLookup }` to override. Lookups returning
// `null` leave the actor's slot empty (the caller can resolve later).

import { BinaryReader } from './BinaryReader.js';
import { FID } from './chunks.js';
import { walkChunks } from './chunkWalker.js';
import { Actor, ACTOR_TYPE } from '../scene/Actor.js';
import { modelRegistry, materialRegistry } from '../fw/Registry.js';

const KNOWN = new Set([
  FID.END, FID.FILE_INFO,
  FID.ACTOR, FID.ACTOR_MODEL, FID.ACTOR_TRANSFORM, FID.ACTOR_MATERIAL, FID.ACTOR_ADD_CHILD,
  FID.TRANSFORM_MATRIX34, FID.TRANSFORM_MATRIX34_LP, FID.TRANSFORM_TRANSLATION, FID.TRANSFORM_IDENTITY,
  FID.PIVOT,
]);

export function loadAct(arrayBuffer, opts = {}) {
  const modelLookup = opts.modelLookup || ((nm) => modelRegistry.find(nm));
  const materialLookup = opts.materialLookup || ((nm) => materialRegistry.find(nm));

  const r = new BinaryReader(arrayBuffer);
  let root = null;
  const stack = [];

  walkChunks(r, KNOWN, (id, payloadStart, payloadEnd, reader) => {
    switch (id) {
      case FID.FILE_INFO:
        reader.u32BE(); reader.u32BE();
        break;

      case FID.ACTOR: {
        // Payload: u8 type, u8 flags, name\0  (best-effort — real BRender
        // encodes more, but Carma ACT files just need the name).
        reader.u8(); reader.u8();
        const name = reader.strZ();
        const actor = new Actor({ type: ACTOR_TYPE.NONE, name });
        if (!root) {
          root = actor;
        } else {
          const parent = stack[stack.length - 1];
          parent.add(actor);
        }
        stack.push(actor);
        break;
      }

      case FID.TRANSFORM_MATRIX34: {
        // 12 floats matching Mat34 layout exactly (rows 0..2 of basis,
        // then row 3 = translation).
        const m = stack[stack.length - 1].transform;
        for (let i = 0; i < 12; i++) m[i] = reader.f32BE();
        break;
      }

      case FID.TRANSFORM_TRANSLATION: {
        const m = stack[stack.length - 1].transform;
        m[0] = 1; m[1] = 0; m[2] = 0;
        m[3] = 0; m[4] = 1; m[5] = 0;
        m[6] = 0; m[7] = 0; m[8] = 1;
        m[9] = reader.f32BE(); m[10] = reader.f32BE(); m[11] = reader.f32BE();
        break;
      }

      case FID.TRANSFORM_IDENTITY: {
        const m = stack[stack.length - 1].transform;
        m.fill(0); m[0] = m[4] = m[8] = 1;
        break;
      }

      case FID.ACTOR_TRANSFORM:
        // Empty marker — the transform already came from a previous
        // TRANSFORM_* chunk.
        break;

      case FID.ACTOR_MODEL: {
        const actor = stack[stack.length - 1];
        const name = reader.strZ();
        actor.modelName = name;
        const m = modelLookup(name);
        if (m) {
          actor.model = m;
          actor.type = ACTOR_TYPE.MODEL;
        }
        break;
      }

      case FID.ACTOR_MATERIAL: {
        const actor = stack[stack.length - 1];
        const name = reader.strZ();
        actor.materialName = name;
        const mat = materialLookup(name);
        if (mat) actor.actorMaterial = mat;  // not the per-face fallback; the actor's tint
        break;
      }

      case FID.ACTOR_ADD_CHILD:
        // Pop — the current actor is finished; next ACTOR is a sibling.
        if (stack.length > 1) stack.pop();
        break;

      case FID.END:
        // EOF; no-op.
        break;
    }
  });

  return root;
}
