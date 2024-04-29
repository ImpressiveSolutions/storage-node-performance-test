export function measureSpeed(bytes: number, duration: number): number {
  return (bytes * 8) / (duration / 1000) / 1e6; // Mbps
}

export function average(values: number[]): number {
  let total = 0;
  for (let i = 0; i < values.length; i++) {
    total += values[i];
  }
  return total / values.length;
}

export function median(values: number[]): number {
  const half = Math.floor(values.length / 2);
  values.sort((a, b) => a - b);
  if (values.length % 2) return values[half];
  return (values[half - 1] + values[half]) / 2;
}

export function quartile(values: number[], percentile: number): number {
  values.sort((a, b) => a - b);
  const pos = (values.length - 1) * percentile;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (values[base + 1] !== undefined)
    return values[base] + rest * (values[base + 1] - values[base]);
  return values[base];
}

export function jitter(values: number[]): number {
  let jitters = [];
  for (let i = 0; i < values.length - 1; i++) {
    jitters.push(Math.abs(values[i] - values[i + 1]));
  }
  return average(jitters);
}
