// Real audio fixture for the test tree. Builds a minimal, valid WAV file
// (RIFF/PCM, 8kHz, 8-bit, mono) so upload, feed, likes, reposts, and profile
// tests exercise genuine audio bytes rather than synthesized in-memory blobs.
export const AUDIO_FIXTURE_MIME = "audio/wav";

function writeUint32LE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >> 8) & 0xff;
  bytes[offset + 2] = (value >> 16) & 0xff;
  bytes[offset + 3] = (value >> 24) & 0xff;
}

function writeUint16LE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >> 8) & 0xff;
}

/** Builds a valid WAV file's bytes: 44-byte RIFF header + 8-bit PCM samples. */
export function buildWavBytes(
  sampleRate = 8000,
  sampleCount = 800,
): Uint8Array<ArrayBuffer> {
  const dataSize = sampleCount; // 8-bit mono => 1 byte per sample
  const bytes = new Uint8Array(44 + dataSize);
  const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
  bytes.set(ascii("RIFF"), 0);
  writeUint32LE(bytes, 4, 36 + dataSize);
  bytes.set(ascii("WAVE"), 8);
  bytes.set(ascii("fmt "), 12);
  writeUint32LE(bytes, 16, 16); // fmt chunk size
  writeUint16LE(bytes, 20, 1); // PCM
  writeUint16LE(bytes, 22, 1); // mono
  writeUint32LE(bytes, 24, sampleRate);
  writeUint32LE(bytes, 28, sampleRate); // byte rate
  writeUint16LE(bytes, 32, 1); // block align
  writeUint16LE(bytes, 34, 8); // bits per sample
  bytes.set(ascii("data"), 36);
  writeUint32LE(bytes, 40, dataSize);
  bytes.fill(0x80, 44); // silence
  return bytes;
}

/** A real audio File fixture with a valid WAV payload. */
export function makeAudioFile(name = "fixture.wav"): File {
  return new File([buildWavBytes()], name, { type: AUDIO_FIXTURE_MIME });
}
