export interface PricePoint {
  timestamp: number
  priceUsd: number
  volumeUsd?: number
}

export interface TrendResult {
  startTime: number
  endTime: number
  trend: "upward" | "downward" | "neutral"
  changePct: number
  avgPrice?: number
  avgVolume?: number
  length: number
}

/**
 * Analyze a series of price points to determine overall trend segments.
 * Adds support for average price, average volume, and minimum segment length.
 */
export function analyzePriceTrends(
  points: PricePoint[],
  minSegmentLength: number = 5
): TrendResult[] {
  const results: TrendResult[] = []
  if (points.length < minSegmentLength) return results

  let segStart = 0
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].priceUsd
    const curr = points[i].priceUsd
    const direction = curr > prev ? 1 : curr < prev ? -1 : 0

    const isLast = i === points.length - 1
    const next = !isLast ? points[i + 1].priceUsd : undefined
    const reversal =
      (direction === 1 && next !== undefined && next < curr) ||
      (direction === -1 && next !== undefined && next > curr)

    if (i - segStart >= minSegmentLength && (isLast || reversal)) {
      const segment = points.slice(segStart, i + 1)
      const start = segment[0]
      const end = segment[segment.length - 1]
      const changePct = ((end.priceUsd - start.priceUsd) / start.priceUsd) * 100
      const avgPrice =
        segment.reduce((acc, p) => acc + p.priceUsd, 0) / segment.length
      const avgVolume =
        segment.some((p) => p.volumeUsd !== undefined) ?
          segment.reduce((acc, p) => acc + (p.volumeUsd ?? 0), 0) / segment.length :
          undefined

      results.push({
        startTime: start.timestamp,
        endTime: end.timestamp,
        trend: changePct > 0 ? "upward" : changePct < 0 ? "downward" : "neutral",
        changePct: Math.round(changePct * 100) / 100,
        avgPrice: Math.round(avgPrice * 100) / 100,
        avgVolume: avgVolume ? Math.round(avgVolume * 100) / 100 : undefined,
        length: segment.length,
      })
      segStart = i
    }
  }
  return results
}

/**
 * Utility: find the strongest trend (largest % change)
 */
export function findStrongestTrend(results: TrendResult[]): TrendResult | undefined {
  return results.reduce<TrendResult | undefined>((max, r) => {
    if (!max || Math.abs(r.changePct) > Math.abs(max.changePct)) return r
    return max
  }, undefined)
}
