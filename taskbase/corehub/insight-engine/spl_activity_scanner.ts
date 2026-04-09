/**
 * Analyze on-chain token activity: fetch recent activity and summarize transfers
 */
type RpcValue<T> = { jsonrpc: "2.0"; result?: T; error?: { code: number; message: string } }

export interface ActivityRecord {
  timestamp: number
  signature: string
  source: string
  destination: string
  amount: number
}

interface TokenBalanceEntry {
  owner?: string | null
  mint?: string
  uiTokenAmount?: { uiAmount?: number | null }
  accountIndex?: number
}

interface GetTransactionOptions {
  encoding?: "jsonParsed" | "json"
  maxSupportedTransactionVersion?: number
}

export class TokenActivityAnalyzer {
  constructor(private rpcEndpoint: string) {}

  /**
   * Generic JSON-RPC call helper
   */
  private async rpcCall<T>(method: string, params: any[], timeoutMs = 15_000): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(this.rpcEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
      const json = (await res.json()) as RpcValue<T>
      if (json.error) throw new Error(`${json.error.code} ${json.error.message}`)
      if (json.result === undefined) throw new Error("Empty result from RPC")
      return json.result
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * Fetch recent confirmed signatures for address with pagination up to limit
   */
  async fetchRecentSignatures(mint: string, limit = 100): Promise<string[]> {
    const out: string[] = []
    let before: string | undefined = undefined

    while (out.length < limit) {
      const page = (await this.rpcCall<any[]>("getSignaturesForAddress", [
        mint,
        { limit: Math.min(1_000, limit - out.length), before },
      ])).filter((e) => e && e.signature)

      if (page.length === 0) break
      for (const entry of page) {
        out.push(entry.signature)
        if (out.length >= limit) break
      }
      before = page[page.length - 1]?.signature
      if (!before) break
    }

    return out
  }

  /**
   * Fetch a parsed transaction by signature
   */
  private async fetchTransaction(signature: string) {
    const opts: GetTransactionOptions = { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }
    return this.rpcCall<any>("getTransaction", [signature, opts])
  }

  /**
   * Analyze activity for a specific SPL token mint
   */
  async analyzeActivity(mint: string, limit = 50): Promise<ActivityRecord[]> {
    const sigs = await this.fetchRecentSignatures(mint, limit)
    const out: ActivityRecord[] = []

    for (const sig of sigs) {
      const tx = await this.fetchTransaction(sig).catch(() => null)
      if (!tx || !tx.meta) continue

      const pre = (tx.meta.preTokenBalances ?? []) as TokenBalanceEntry[]
      const post = (tx.meta.postTokenBalances ?? []) as TokenBalanceEntry[]

      // Build maps by accountIndex when available, otherwise by owner+mint composite key
      const mapKey = (e: TokenBalanceEntry) =>
        e.accountIndex !== undefined
          ? `idx:${e.accountIndex}`
          : `own:${e.owner ?? "unknown"}|mint:${e.mint ?? "unknown"}`

      const preMap = new Map<string, TokenBalanceEntry>()
      for (const p of pre) {
        if (p.mint !== mint) continue
        preMap.set(mapKey(p), p)
      }

      const seenKeys = new Set<string>()
      for (const p of post) {
        if (p.mint !== mint) continue
        const key = mapKey(p)
        const prev = preMap.get(key)
        const prevAmount = prev?.uiTokenAmount?.uiAmount ?? 0
        const currAmount = p.uiTokenAmount?.uiAmount ?? 0
        const delta = currAmount - prevAmount

        if (delta !== 0) {
          out.push({
            timestamp: (tx.blockTime ?? Math.floor(Date.now() / 1000)) * 1000,
            signature: sig,
            source: delta > 0 ? "unknown" : (p.owner ?? "unknown"),
            destination: delta > 0 ? (p.owner ?? "unknown") : "unknown",
            amount: Math.abs(delta),
          })
        }
        seenKeys.add(key)
      }

      // handle accounts that disappeared from post but existed in pre (full outflow)
      for (const [key, q] of preMap.entries()) {
        if (seenKeys.has(key)) continue
        const prevAmount = q.uiTokenAmount?.uiAmount ?? 0
        if (prevAmount > 0) {
          out.push({
            timestamp: (tx.blockTime ?? Math.floor(Date.now() / 1000)) * 1000,
            signature: sig,
            source: q.owner ?? "unknown",
            destination: "unknown",
            amount: Math.abs(prevAmount),
          })
        }
      }
    }

    // sort chronologically
    out.sort((a, b) => a.timestamp - b.timestamp)
    return out
  }
}
