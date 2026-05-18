// BRender .MAT loader.
//
// Handles:
//   FID_MATERIAL (62)   — modern format (fully spec'd payload)
//   FID_MAT_OLDEST (4)  — Carmageddon-era format, partially reverse-engineered:
//     first 4 bytes = colour (0x00RRGGBB), and the LAST nul-terminated
//     ASCII string in the payload is the material identifier.
//     Most other fields aren't needed for rendering and are best-effort.
//   FID_COLOUR_MAP_REF (28) — sibling chunk that follows a material and
//     references its texture pixelmap by name (string with declared len
//     often 1 short of the actual bytes — use nul-termination).

import { BinaryReader } from './BinaryReader.js';
import { FID } from './chunks.js';
import { walkChunks } from './chunkWalker.js';
import { Material } from '../scene/Material.js';

const KNOWN = new Set([FID.END, FID.FILE_INFO, FID.MATERIAL, FID.MAT_OLDEST, FID.COLOUR_MAP_REF]);

export function loadMat(arrayBuffer) {
  const r = new BinaryReader(arrayBuffer);
  const materials = [];
  let current = null;

  walkChunks(r, KNOWN, (id, payloadStart, payloadEnd, reader) => {
    switch (id) {
      case FID.END:
        if (current) { materials.push(current); current = null; }
        break;

      case FID.FILE_INFO:
        reader.u32BE(); reader.u32BE();
        break;

      case FID.MATERIAL: {
        if (current) materials.push(current);
        const flags = reader.u32BE();
        const colour = reader.u32BE();
        const opacity = reader.u8();
        const ka = reader.f32BE();
        const kd = reader.f32BE();
        const ks = reader.f32BE();
        const power = reader.f32BE();
        const indexBase = reader.u8();
        const indexRange = reader.u8();
        const mapTransform = new Float32Array(6);
        for (let i = 0; i < 6; i++) mapTransform[i] = reader.f32BE();
        const name = reader.strZ(payloadEnd - reader.offset);
        current = new Material({ name, flags, colour, opacity, ka, kd, ks, power, indexBase, indexRange, mapTransform });
        break;
      }

      case FID.MAT_OLDEST: {
        // Older Carmageddon format. Layout (best-effort, reverse-engineered):
        //   u32 colour (0x00RRGGBB or 0xFFFFFFFF for "use vertex colour")
        //   ~40 bytes of light coefficients we don't decode
        //   ... possibly 1-2 flag bytes ...
        //   nul-terminated material identifier (ending the payload)
        if (current) materials.push(current);
        const colour = reader.u32BE();
        // Scan to end of payload (or first plausible nul-terminator-followed-
        // by-ASCII name) to extract the identifier.
        const tailStart = payloadStart + 8;
        // Find last nul before any garbage trailing bytes.
        const ab = reader.buffer;
        const bytes = new Uint8Array(ab, reader.view.byteOffset + tailStart, payloadEnd - tailStart);
        let nameEnd = bytes.length - 1;
        while (nameEnd > 0 && bytes[nameEnd] === 0) nameEnd--;
        let nameStart = nameEnd;
        while (nameStart > 0 && bytes[nameStart - 1] >= 0x20 && bytes[nameStart - 1] < 0x7f) nameStart--;
        let name = '';
        for (let i = nameStart; i <= nameEnd; i++) name += String.fromCharCode(bytes[i]);
        // Strip any leading control / non-name bytes the scan might have
        // absorbed (the older format embeds a u8 flag byte right before the
        // identifier — often 0x01, 0x02, 0x3f, etc).
        name = name.replace(/^[^A-Za-z0-9_!]+/, '');
        current = new Material({ name, colour });
        // Match BRender 1.3 default flags: lighting + smooth shading + z + colour-key on by default.
        // (The actual flag bits in this older format aren't fully decoded;
        // demos can override post-load.)
        break;
      }

      case FID.COLOUR_MAP_REF: {
        // The declared length is often the string length without the trailing
        // nul — read nul-terminated regardless.
        const refName = reader.strZ();
        if (current) current.colourMapName = refName;
        break;
      }
    }
  });

  if (current) materials.push(current);
  return materials;
}
