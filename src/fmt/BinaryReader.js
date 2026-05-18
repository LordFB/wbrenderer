// Big-endian first BinaryReader. BRender chunked files are network byte
// order; per-format LE helpers are also exposed for nested fields when
// older BRender variants used different conventions.

export class BinaryReader {
  constructor(arrayBuffer, offset = 0) {
    this.buffer = arrayBuffer;
    this.view = new DataView(arrayBuffer);
    this.offset = offset;
    this.length = arrayBuffer.byteLength;
  }

  remaining() { return this.length - this.offset; }
  eof() { return this.offset >= this.length; }
  seek(o) { this.offset = o; return this; }
  skip(n) { this.offset += n; return this; }

  u8() { return this.view.getUint8(this.offset++); }
  i8() { return this.view.getInt8(this.offset++); }

  u16BE() { const v = this.view.getUint16(this.offset, false); this.offset += 2; return v; }
  u16LE() { const v = this.view.getUint16(this.offset, true);  this.offset += 2; return v; }
  i16BE() { const v = this.view.getInt16(this.offset, false);  this.offset += 2; return v; }
  i16LE() { const v = this.view.getInt16(this.offset, true);   this.offset += 2; return v; }

  u32BE() { const v = this.view.getUint32(this.offset, false); this.offset += 4; return v; }
  u32LE() { const v = this.view.getUint32(this.offset, true);  this.offset += 4; return v; }
  f32BE() { const v = this.view.getFloat32(this.offset, false); this.offset += 4; return v; }
  f32LE() { const v = this.view.getFloat32(this.offset, true);  this.offset += 4; return v; }

  // Read a nul-terminated ASCII string. Advances past the trailing NUL.
  strZ(maxLen = 4096) {
    let s = '';
    const end = Math.min(this.length, this.offset + maxLen);
    while (this.offset < end) {
      const c = this.view.getUint8(this.offset++);
      if (c === 0) return s;
      s += String.fromCharCode(c);
    }
    return s;
  }

  // Read `n` raw bytes as a Uint8Array view (no copy).
  bytes(n) {
    const o = this.view.byteOffset + this.offset;
    const u = new Uint8Array(this.buffer, o, n);
    this.offset += n;
    return u;
  }

  // Sub-reader bounded to `n` bytes from current offset; original advances.
  sub(n) {
    const sliceStart = this.view.byteOffset + this.offset;
    const ab = this.buffer.slice(sliceStart, sliceStart + n);
    this.offset += n;
    return new BinaryReader(ab);
  }
}
