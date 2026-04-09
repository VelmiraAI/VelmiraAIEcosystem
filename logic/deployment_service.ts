export interface LaunchConfig {
  contractName: string
  parameters: Record<string, any>
  deployEndpoint: string
  apiKey?: string
  network?: string
  retries?: number
}

export interface LaunchResult {
  success: boolean
  address?: string
  transactionHash?: string
  error?: string
  durationMs?: number
}

export class LaunchNode {
  constructor(private config: LaunchConfig) {}

  async deploy(): Promise<LaunchResult> {
    const { deployEndpoint, apiKey, contractName, parameters, retries = 1 } = this.config
    const start = Date.now()

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(deployEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({ contractName, parameters }),
        })

        if (!res.ok) {
          const text = await res.text()
          if (attempt === retries) {
            return { success: false, error: `HTTP ${res.status}: ${text}`, durationMs: Date.now() - start }
          }
          continue
        }

        const json = await res.json()
        return {
          success: true,
          address: json.contractAddress,
          transactionHash: json.txHash,
          durationMs: Date.now() - start,
        }
      } catch (err: any) {
        if (attempt === retries) {
          return { success: false, error: err.message, durationMs: Date.now() - start }
        }
      }
    }

    return { success: false, error: "Deployment failed after retries", durationMs: Date.now() - start }
  }
}
