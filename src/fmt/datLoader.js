// BRender .DAT model loader.
//
// Real Carmageddon DAT files have this chunk sequence (verified against
// Source/DATA/MODELS/EAGLE.DAT):
//   FILE_INFO (file_type = 0x0000FACE = MODEL)
//   OLD_MODEL_2 (flags + name)
//   VERTICES   (u32 count, then count * vec3 BE float)
//   VERTEX_UV  (u32 count, then count * vec2 BE float)
//   FACES      (u32 count, then count * (u16 v0,v1,v2, u16 smoothing, u8 flags))
//   MATERIAL_INDEX (u32 count, then count nul-terminated material name strings)
//
// MATERIAL_INDEX's declared chunk length doesn't always match the actual
// strings length in Carma files — we trust the count, not the length.

import { BinaryReader } from './BinaryReader.js';
import { FID, FILE_TYPE } from './chunks.js';
import { Model, makeVertices, VERTEX_STRIDE } from '../scene/Model.js';

export function loadDat(arrayBuffer) {
  const r = new BinaryReader(arrayBuffer);
  const models = [];
  let current = null;

  // current accumulator: { name, positions, uvs, faces, faceMatIndex, materialNames }

  function finish() {
    if (!current) return;
    const n = current.positions.length / 3;
    const uvs = current.uvs.length === n * 2 ? current.uvs : new Float32Array(n * 2);
    const packed = makeVertices(current.positions, null, uvs);
    const m = new Model(packed, current.faces, { name: current.name });
    m.materialNames = current.materialNames;
    m.faceMaterialIndex = current.faceMatIndex;
    m.faceSmoothing = current.faceSmoothing || null;
    models.push(m);
    current = null;
  }

  function ensureCurrent() {
    if (!current) {
      current = {
        name: '',
        positions: new Float32Array(0),
        uvs: new Float32Array(0),
        faces: new Uint16Array(0),
        faceMatIndex: new Uint16Array(0),
        materialNames: [],
      };
    }
    return current;
  }

  while (r.remaining() >= 8) {
    const id = r.u32BE();
    const len = r.u32BE();
    const payloadStart = r.offset;
    const payloadEnd = payloadStart + len;

    switch (id) {
      case FID.END:
        // Chunk terminator. Carma DATs typically have a single END at EOF;
        // tolerate intermediate ENDs by continuing.
        break;

      case FID.FILE_INFO: {
        const fileType = r.u32BE();
        r.u32BE(); // version
        if (fileType !== FILE_TYPE.MODEL) {
          // We only handle MODEL DATs here.
        }
        break;
      }

      case FID.OLD_MODEL:
      case FID.OLD_MODEL_2:
      case FID.MODEL: {
        finish();
        const cur = ensureCurrent();
        r.u16BE(); // flags (u16 in the OLD_MODEL_2 chunk)
        cur.name = r.strZ(len - 2);
        break;
      }

      case FID.VERTICES:
      case FID.OLD_VERTICES: {
        const cur = ensureCurrent();
        const count = r.u32BE();
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count * 3; i++) pos[i] = r.f32BE();
        cur.positions = pos;
        break;
      }

      case FID.VERTEX_UV: {
        const cur = ensureCurrent();
        const count = r.u32BE();
        const uvs = new Float32Array(count * 2);
        for (let i = 0; i < count * 2; i++) uvs[i] = r.f32BE();
        cur.uvs = uvs;
        break;
      }

      case FID.OLD_VERTICES_UV: {
        // Interleaved positions+uvs in older files: per-vertex (x,y,z,u,v).
        const cur = ensureCurrent();
        const count = r.u32BE();
        const pos = new Float32Array(count * 3);
        const uvs = new Float32Array(count * 2);
        for (let i = 0; i < count; i++) {
          pos[i * 3] = r.f32BE();
          pos[i * 3 + 1] = r.f32BE();
          pos[i * 3 + 2] = r.f32BE();
          uvs[i * 2] = r.f32BE();
          uvs[i * 2 + 1] = r.f32BE();
        }
        cur.positions = pos;
        cur.uvs = uvs;
        break;
      }

      case FID.FACES:
      case FID.OLD_FACES: {
        const cur = ensureCurrent();
        const count = r.u32BE();
        const faces = new Uint16Array(count * 3);
        const smoothing = new Uint16Array(count);
        for (let i = 0; i < count; i++) {
          faces[i * 3] = r.u16BE();
          faces[i * 3 + 1] = r.u16BE();
          faces[i * 3 + 2] = r.u16BE();
          smoothing[i] = r.u16BE();
          r.u8();    // face flags
        }
        cur.faces = faces;
        cur.faceMatIndex = new Uint16Array(count);
        cur.faceSmoothing = smoothing;
        break;
      }

      case FID.MATERIAL_INDEX:
      case FID.OLD_MAT_IDX: {
        // Unique material-name list. The chunk's declared length is often
        // too short in Carmageddon DATs — we read `count` nul-terminated
        // strings and let the outer realignment correct any drift.
        const cur = ensureCurrent();
        const count = r.u32BE();
        const names = new Array(count);
        for (let i = 0; i < count; i++) names[i] = r.strZ();
        cur.materialNames = names;
        break;
      }

      case FID.FACE_MATERIAL: {
        // Per-face material reference. Block layout: u32 count, u32 stride,
        // count*stride raw bytes. Carma uses 2-byte 1-based indices into
        // the MAT_IDX name list.
        const cur = ensureCurrent();
        const count = r.u32BE();
        const stride = r.u32BE();
        const perFace = new Uint16Array(count);
        for (let i = 0; i < count; i++) {
          const v = stride === 2 ? r.u16BE() : (stride === 1 ? r.u8() : r.u32BE());
          perFace[i] = v > 0 ? v - 1 : 0;
        }
        cur.faceMatIndex = perFace;
        break;
      }

      default:
        // Unknown / unhandled chunk — skip by declared length.
        break;
    }

    // Always realign to payloadEnd in case a handler under-read.
    if (r.offset < payloadEnd && payloadEnd <= r.length) {
      r.seek(payloadEnd);
    } else if (r.offset > payloadEnd) {
      // Over-read: trust handler (e.g. MAT_IDX). Best-effort resync to next
      // plausible chunk boundary is the caller's problem; we keep going.
    }
  }

  finish();
  return models;
}
