export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value))

export const lerp = (from: number, to: number, amount: number) =>
  from + (to - from) * amount

export const smoothstep = (edge0: number, edge1: number, value: number) => {
  const x = clamp((value - edge0) / (edge1 - edge0))
  return x * x * (3 - 2 * x)
}
