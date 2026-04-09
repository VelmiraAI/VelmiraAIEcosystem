export interface PairInfo {
  exchange: string
  pairAddress: string
  baseSymbol: string
  quoteSymbol: string
  liquidityUsd: number
  volume24hUsd: number
  priceUsd: number
  updatedAt?: number
}

export interface DexSuiteConfig {
  apis: Array<{ name: string; baseUrl: string; apiKey?: string }>
  timeoutMs?: number
}

export class DexSuite {
  constructor(private config: DexSuiteConfig) {}

  private async fetchFromApi<T>(
    api: { name: string; baseUrl: string; apiKey?: string },
    path: string
  ): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 10000)
    try {
      const res = await fetch(`${api.baseUrl}${path}`, {
        headers: api.apiKey ? { Authorization: `Bearer ${api.apiKey}` } : {},
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`${api.name} ${path} ${res.status}`)
      return (await res.json()) as T
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * Retrieve aggregated pair info across all configured DEX APIs.
   * @param pairAddress Blockchain address of the trading pair
   */
  async getPairInfo(pairAddress: string): Promise<PairInfo[]> {
    const results: PairInfo[] = []
    const tasks = this.config.apis.map(async (api) => {
      try {
        const data = await this.fetchFromApi<any>(api, `/pair/${pairAddress}`)
        results.push({
          exchange: api.name,
          pairAddress,
          baseSymbol: data.token0.symbol,
          quoteSymbol: data.token1.symbol,
          liquidityUsd: Number(data.liquidityUsd),
          volume24hUsd: Number(data.volume24hUsd),
          priceUsd: Number(data.priceUsd),
          updatedAt: Date.now(),
        })
      } catch {
        // skip failed API
      }
    })
    await Promise.all(tasks)
    return results
  }

  /**
   * Compare a list of pairs across exchanges, returning the best volume and liquidity.
   */
  async comparePairs(
    pairs: string[]
  ): Promise<Record<string, { bestVolume?: PairInfo; bestLiquidity?: PairInfo }>> {
    const entries = await Promise.all(
      pairs.map(async (addr) => {
        const infos = await this.getPairInfo(addr)
        if (infos.length === 0) return [addr, {}]
        const bestVolume = infos.reduce((a, b) =>
          b.volume24hUsd > a.volume24hUsd ? b : a
        )
        const bestLiquidity = infos.reduce((a, b) =>
          b.liquidityUsd > a.liquidityUsd ? b : a
        )
        return [addr, { bestVolume, bestLiquidity }] as const
      })
    )
    return Object.fromEntries(entries)
  }

  /**
   * Find arbitrage opportunities between exchanges for a pair
   */
  async findArbitrage(pairAddress: string): Promise<{
    highest?: PairInfo
    lowest?: PairInfo
    spreadPct?: number
  }> {
    const infos = await this.getPairInfo(pairAddress)
    if (infos.length < 2) return {}
    const highest = infos.reduce((a, b) => (b.priceUsd > a.priceUsd ? b : a))
    const lowest = infos.reduce((a, b) => (b.priceUsd < a.priceUsd ? b : a))
    const spreadPct =
      lowest.priceUsd > 0
        ? Math.round(((highest.priceUsd - lowest.priceUsd) / lowest.priceUsd) * 10000) /
          100
        : undefined
    return { highest, lowest, spreadPct }
  }
}
