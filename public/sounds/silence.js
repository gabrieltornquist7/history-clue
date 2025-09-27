// Generate minimal valid audio data URLs for development
// This creates silent audio that won't cause playback errors

// Minimal WAV header for 100ms of silence at 44.1kHz mono
const createSilentWav = () => {
  const sampleRate = 44100;
  const duration = 0.1; // 100ms
  const numSamples = Math.floor(sampleRate * duration);
  const arrayBuffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(arrayBuffer);

  // WAV header
  view.setUint32(0, 0x46464952, true); // "RIFF"
  view.setUint32(4, 36 + numSamples * 2, true); // file size
  view.setUint32(8, 0x45564157, true); // "WAVE"
  view.setUint32(12, 0x20746d66, true); // "fmt "
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true); // sample rate
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  view.setUint32(36, 0x61746164, true); // "data"
  view.setUint32(40, numSamples * 2, true); // data size

  // Silent samples (all zeros)
  for (let i = 0; i < numSamples; i++) {
    view.setInt16(44 + i * 2, 0, true);
  }

  return arrayBuffer;
};

// Convert to base64 data URL
const wavBuffer = createSilentWav();
const wavArray = new Uint8Array(wavBuffer);
const wavBase64 = btoa(String.fromCharCode.apply(null, wavArray));
export const SILENT_AUDIO_URL = `data:audio/wav;base64,${wavBase64}`;

console.log('Silent audio URL generated for development use');