export interface TokenDataPoint {
  timestamp: number
  priceUsd: number
  volumeUsd: number
  marketCapUsd: number
}

export class TokenDataFetcher {
  constructor(private apiBase: string, private apiKey?: string) {}

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`
    return headers
  }

  /**
   * Fetches an array of TokenDataPoint for the given token symbol.
   * Expects endpoint: `${apiBase}/tokens/${symbol}/history`
   */
  async fetchHistory(symbol: string, limit?: number): Promise<TokenDataPoint[]> {
    const url = new URL(`${this.apiBase}/tokens/${encodeURIComponent(symbol)}/history`)
    if (limit) url.searchParams.set("limit", String(limit))

    const res = await fetch(url.toString(), { headers: this.getHeaders() })
    if (!res.ok) throw new Error(`Failed to fetch history for ${symbol}: ${res.status} ${res.statusText}`)

    const raw = (await res.json()) as any[]
    return raw
      .filter(r => r && r.time && r.priceUsd)
      .map(r => ({
        timestamp: Number(r.time) * 1000,
        priceUsd: Number(r.priceUsd),
        volumeUsd: Number(r.volumeUsd ?? 0),
        marketCapUsd: Number(r.marketCapUsd ?? 0),
      }))
  }

  /**
   * Fetches the latest TokenDataPoint only
   */
  async fetchLatest(symbol: string): Promise<TokenDataPoint | null> {
    const history = await this.fetchHistory(symbol, 1)
    return history.length > 0 ? history[0] : null
  }

  /**
   * Fetches multiple tokens in parallel
   */
  async fetchMultiple(symbols: string[], limit?: number): Promise<Record<string, TokenDataPoint[]>> {
    const results: Record<string, TokenDataPoint[]> = {}
    await Promise.all(
      symbols.map(async sym => {
        try {
          results[sym] = await this.fetchHistory(sym, limit)
        } catch {
          results[sym] = []
        }
      })
    )
    return results
  }
}
