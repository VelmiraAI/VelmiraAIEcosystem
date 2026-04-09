export interface Signal {
  id: string
  type: string
  timestamp: number
  payload: Record<string, any>
  source?: string
  severity?: "low" | "medium" | "high"
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  durationMs?: number
}

/**
 * HTTP client for fetching signals.
 */
export class SignalApiClient {
  constructor(private baseUrl: string, private apiKey?: string) {}

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`
    return headers
  }

  async fetchAllSignals(): Promise<ApiResponse<Signal[]>> {
    const start = Date.now()
    try {
      const res = await fetch(`${this.baseUrl}/signals`, {
        method: "GET",
        headers: this.getHeaders(),
      })
      if (!res.ok) return { success: false, error: `HTTP ${res.status}`, durationMs: Date.now() - start }
      const data = (await res.json()) as Signal[]
      return { success: true, data, durationMs: Date.now() - start }
    } catch (err: any) {
      return { success: false, error: err.message, durationMs: Date.now() - start }
    }
  }

  async fetchSignalById(id: string): Promise<ApiResponse<Signal>> {
    const start = Date.now()
    try {
      const res = await fetch(`${this.baseUrl}/signals/${encodeURIComponent(id)}`, {
        method: "GET",
        headers: this.getHeaders(),
      })
      if (!res.ok) return { success: false, error: `HTTP ${res.status}`, durationMs: Date.now() - start }
      const data = (await res.json()) as Signal
      return { success: true, data, durationMs: Date.now() - start }
    } catch (err: any) {
      return { success: false, error: err.message, durationMs: Date.now() - start }
    }
  }

  async searchSignals(query: string): Promise<ApiResponse<Signal[]>> {
    const start = Date.now()
    try {
      const res = await fetch(`${this.baseUrl}/signals/search?q=${encodeURIComponent(query)}`, {
        method: "GET",
        headers: this.getHeaders(),
      })
      if (!res.ok) return { success: false, error: `HTTP ${res.status}`, durationMs: Date.now() - start }
      const data = (await res.json()) as Signal[]
      return { success: true, data, durationMs: Date.now() - start }
    } catch (err: any) {
      return { success: false, error: err.message, durationMs: Date.now() - start }
    }
  }
}
