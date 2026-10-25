export default function Sparkline({
    data, positive, seed, width = 64, height = 24,
  }: { data?: number[]; positive: boolean; seed: string; width?: number; height?: number }) {
    const points = data && data.length > 1 ? data : fallback(seed, positive);
    const min = Math.min(...points);
    const range = Math.max(...points) - min || 1;
    const step = width / (points.length - 1);
    const d = points
      .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(height - 2 - ((v - min) / range) * (height - 4)).toFixed(1)}`)
      .join(" ");
  
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
        <path d={d} fill="none" stroke={positive ? "#1F8F5F" : "#C43D30"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  
  function fallback(seed: string, positive: boolean) {
    let h = 0;
    for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const pts: number[] = [];
    let v = 0;
    for (let i = 0; i < 7; i++) {
      h = (h * 1664525 + 1013904223) >>> 0;
      v += (positive ? 0.35 : -0.35) + (((h >>> 8) % 100) / 100 - 0.5);
      pts.push(v);
    }
    return pts;
  }