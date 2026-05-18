// BRender .PIX loader. Handles both:
//   FID_PIXELMAP (61)    — modern format (BE 16-bit fields, full spec)
//   FID_OLD_PIXELMAP (3) — Carmageddon-era format. Header layout, reverse-
//     engineered against Source/DATA/PIXELMAP/EAGLE.PIX:
//        u8  type             (3 = INDEX_8 in Carma's data)
//        u8  pad / row_log2
//        u16 LE width
//        u16 LE height
//        u16 LE row_bytes / stride
//        u16 LE origin_x
//        u8  origin_y
//        char identifier[]    (nul-terminated)
// Followed by a sibling FID_PIXELS chunk containing raw pixel bytes.
//
// PIX files in Carma are CONCATENATIONS of multiple pixmaps each terminated
// by FID_END — the walker keeps going past END boundaries.

import { BinaryReader } from './BinaryReader.js';
import { FID } from './chunks.js';
import { walkChunks } from './chunkWalker.js';

export const PMT = {
  INDEX_8: 3,
  RGB_555: 4,
  RGB_565: 5,
  RGB_888: 6,
  RGBX_888: 7,
};

const KNOWN = new Set([FID.END, FID.FILE_INFO, FID.PIXELMAP, FID.OLD_PIXELMAP, FID.PIXELS, FID.COLOUR_MAP_REF]);

export function loadPix(arrayBuffer) {
  const r = new BinaryReader(arrayBuffer);
  const pixmaps = [];
  let current = null;

  walkChunks(r, KNOWN, (id, payloadStart, payloadEnd, reader) => {
    switch (id) {
      case FID.END:
        if (current && current.pixels) {
          pixmaps.push(current);
          current = null;
        }
        break;

      case FID.FILE_INFO:
        reader.u32BE(); reader.u32BE();
        break;

      case FID.PIXELMAP: {
        if (current) pixmaps.push(current);
        const type = reader.u8();
        reader.u8();
        const width = reader.u16BE();
        const height = reader.u16BE();
        const originX = reader.i16BE();
        const originY = reader.i16BE();
        const name = reader.strZ(payloadEnd - reader.offset);
        current = { type, width, height, originX, originY, name, pixels: null, palette: null };
        break;
      }

      case FID.OLD_PIXELMAP: {
        if (current) pixmaps.push(current);
        const type = reader.u8();
        reader.u8(); // pad / row_log2
        const width = reader.u16LE();
        const height = reader.u16LE();
        reader.u16LE();   // stride / row_bytes (we don't use it; INDEX_8 stride == width)
        const originX = reader.u16LE();
        const originY = reader.u8();
        const name = reader.strZ(payloadEnd - reader.offset + 64); // tolerate over-read
        current = { type, width, height, originX, originY, name, pixels: null, palette: null };
        break;
      }

      case FID.PIXELS: {
        const count = reader.u32BE();
        const size = reader.u32BE();
        const total = count * size;
        if (current && total > 0 && reader.offset + total <= reader.length) {
          const ab = reader.buffer;
          const start = reader.view.byteOffset + reader.offset;
          current.pixels = new Uint8Array(ab.slice(start, start + total));
        }
        break;
      }

      case FID.COLOUR_MAP_REF: {
        const refName = reader.strZ();
        if (current) current.paletteName = refName;
        break;
      }
    }
  });

  if (current && current.pixels) pixmaps.push(current);
  return pixmaps;
}
