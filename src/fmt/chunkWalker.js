// Robust chunk walker for BRender files where declared chunk lengths
// don't match actual payload sizes (Carmageddon's MAT_OLDEST, MAT_IDX,
// and COLOUR_MAP_REF all under-declare). The walker calls `onChunk(id,
// payloadStart, declaredEnd, reader)` for each chunk and then either
// honors the handler's read position OR re-syncs forward to the next
// plausible chunk header if it lies past the declared end.
//
// `knownIds` is a Set of FID values; the walker uses it to validate the
// next header when re-syncing.

export function walkChunks(reader, knownIds, onChunk, maxScan = 4096) {
  while (reader.remaining() >= 8) {
    const headerOff = reader.offset;
    const id = reader.u32BE();
    const len = reader.u32BE();
    if (len > reader.length || len < 0) {
      // Hopeless — bail.
      return;
    }
    const payloadStart = reader.offset;
    const declaredEnd = payloadStart + len;

    onChunk(id, payloadStart, declaredEnd, reader);

    // Find the next chunk boundary. Carma files sometimes have the NEXT
    // chunk header start a few bytes BEFORE the declared payload end
    // (negative slack), so we widen the scan window slightly backward too.
    const SLACK = 8;
    const nextOff = Math.max(reader.offset, declaredEnd - SLACK);
    if (nextOff >= reader.length) return;

    // Scan forward until we find a valid known chunk id with sane length.
    const scanLimit = Math.min(reader.length, declaredEnd + maxScan);
    let resync = nextOff;
    while (resync + 8 <= scanLimit) {
      const tryId = reader.view.getUint32(resync, false);
      const tryLen = reader.view.getUint32(resync + 4, false);
      if (knownIds.has(tryId) && tryLen >= 0 && resync + 8 + tryLen <= reader.length) {
        break;
      }
      resync++;
    }
    if (resync + 8 > scanLimit) {
      // No valid chunk found — fall back to declared end.
      reader.seek(nextOff);
    } else {
      reader.seek(resync);
    }
  }
}
