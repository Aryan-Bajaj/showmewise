// Background-noise removal for the speech track (fans, hum, hiss, room noise).
// Plain spectral gating: the noise is measured in the quietest moments of the
// recording, then taken out of every moment, gently. Only used when the
// recording is noisy: on clean audio any denoiser cuts bits of words, and
// Whisper does better without it.

// Speech level minus noise level in dB (median frame vs quietest 10 %).
export function speechToNoise(data, frame = 8000) {
  const db = []
  for (let i = 0; i + frame <= data.length; i += frame) {
    let s = 0
    for (let j = i; j < i + frame; j++) s += data[j] * data[j]
    const rms = Math.sqrt(s / frame)
    if (rms > 1e-6) db.push(20 * Math.log10(rms))
  }
  if (db.length < 10) return 99
  db.sort((a, b) => a - b)
  return db[Math.floor(db.length * 0.5)] - db[Math.floor(db.length * 0.1)]
}

// In-place radix-2 FFT (re, im of length n, n a power of two).
function fft(re, im, inverse) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]] }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (2 * Math.PI / len) * (inverse ? 1 : -1)
    const wr = Math.cos(ang), wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0
      for (let j = 0; j < len / 2; j++) {
        const a = i + j, b = a + len / 2
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr
        re[b] = re[a] - tr; im[b] = im[a] - ti
        re[a] += tr; im[a] += ti
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n }
}

// Returns a new Float32Array with the steady background noise taken out.
// strength 1.5 and floor 0.15: noise is pushed down about 16 dB at most, so
// speech keeps its edges (stronger settings make Whisper miss soft consonants).
export function denoise(data, { size = 512, strength = 1.5, floor = 0.15 } = {}) {
  const hop = size / 2, bins = size / 2 + 1
  const win = new Float32Array(size)
  for (let i = 0; i < size; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size) // periodic Hann: halves add up to 1
  const frames = Math.max(0, Math.floor((data.length - size) / hop) + 1)
  if (frames < 20) return data
  const re = new Float64Array(size), im = new Float64Array(size)

  // 1. noise profile: mean spectrum of the quietest 15 % of frames
  const energy = new Float64Array(frames)
  for (let f = 0; f < frames; f++) {
    let s = 0
    for (let i = 0; i < size; i++) { const v = data[f * hop + i]; s += v * v }
    energy[f] = s
  }
  const order = Array.from(energy.keys()).sort((a, b) => energy[a] - energy[b])
  const quiet = order.slice(0, Math.max(5, Math.floor(frames * 0.15)))
  const noise = new Float64Array(bins)
  for (const f of quiet) {
    for (let i = 0; i < size; i++) { re[i] = data[f * hop + i] * win[i]; im[i] = 0 }
    fft(re, im, false)
    for (let k = 0; k < bins; k++) noise[k] += Math.hypot(re[k], im[k]) / quiet.length
  }

  // 2. take it out of every frame, gain smoothed over time (no "musical" chirps)
  const out = new Float32Array(data.length)
  const prev = new Float64Array(bins).fill(1)
  for (let f = 0; f < frames; f++) {
    const o = f * hop
    for (let i = 0; i < size; i++) { re[i] = data[o + i] * win[i]; im[i] = 0 }
    fft(re, im, false)
    for (let k = 0; k < bins; k++) {
      const mag = Math.hypot(re[k], im[k]) || 1e-12
      let g = Math.max(floor, 1 - (strength * noise[k]) / mag)
      g = 0.6 * g + 0.4 * prev[k]
      prev[k] = g
      re[k] *= g; im[k] *= g
      if (k > 0 && k < size / 2) { re[size - k] = re[k]; im[size - k] = -im[k] }
    }
    fft(re, im, true)
    for (let i = 0; i < size; i++) out[o + i] += re[i]
  }
  // the first and last half frame only got one window half: keep the original there
  for (let i = 0; i < hop; i++) out[i] = data[i]
  for (let i = frames * hop; i < data.length; i++) out[i] = data[i]
  return out
}
