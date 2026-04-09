/**
 * Detect volume-based patterns in a series of activity amounts.
 */
export interface PatternMatch {
  index: number
  window: number
  average: number
  max?: number
  min?: number
  volatility?: number
}

export function detectVolumePatterns(
  volumes: number[],
  windowSize: number,
  threshold: number
): PatternMatch[] {
  const matches: PatternMatch[] = []
  if (windowSize <= 0 || volumes.length < windowSize) return matches

  for (let i = 0; i + windowSize <= volumes.length; i++) {
    const slice = volumes.slice(i, i + windowSize)
    const sum = slice.reduce((a, b) => a + b, 0)
    const avg = sum / windowSize
    if (avg >= threshold) {
      const max = Math.max(...slice)
      const min = Math.min(...slice)
      const variance =
        slice.reduce((acc, v) => acc + (v - avg) ** 2, 0) / windowSize
      matches.push({
        index: i,
        window: windowSize,
        average: Math.round(avg * 100) / 100,
        max,
        min,
        volatility: Math.round(Math.sqrt(variance) * 100) / 100,
      })
    }
  }
  return matches
}

/**
 * Utility: find strongest match (highest average)
 */
export function findStrongestPattern(matches: PatternMatch[]): PatternMatch | undefined {
  return matches.reduce<PatternMatch | undefined>((max, m) => {
    if (!max || m.average > max.average) return m
    return max
  }, undefined)
}
