// Small helper to build BRender-format chunk fixtures for tests.
// All multi-byte values are big-endian per BRender spec.

export class ChunkBuilder {
  constructor() {
    this._parts = [];
    this._len = 0;
  }

  bytes(arr) {
    const u = arr instanceof Uint8Array ? arr : new Uint8Array(arr);
    this._parts.push(u);
    this._len += u.length;
    return this;
  }

  u8(v) {
    const u = new Uint8Array([v & 0xff]);
    return this.bytes(u);
  }

  u16(v) {
    const u = new Uint8Array(2);
    new DataView(u.buffer).setUint16(0, v, false);
    return this.bytes(u);
  }

  u32(v) {
    const u = new Uint8Array(4);
    new DataView(u.buffer).setUint32(0, v, false);
    return this.bytes(u);
  }

  f32(v) {
    const u = new Uint8Array(4);
    new DataView(u.buffer).setFloat32(0, v, false);
    return this.bytes(u);
  }

  strZ(s) {
    const u = new Uint8Array(s.length + 1);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 0xff;
    u[s.length] = 0;
    return this.bytes(u);
  }

  chunk(id, builderFn) {
    const inner = new ChunkBuilder();
    builderFn(inner);
    this.u32(id);
    this.u32(inner._len);
    this._parts.push(...inner._parts);
    this._len += inner._len;
    return this;
  }

  build() {
    const out = new Uint8Array(this._len);
    let o = 0;
    for (const p of this._parts) { out.set(p, o); o += p.length; }
    return out.buffer;
  }
}
