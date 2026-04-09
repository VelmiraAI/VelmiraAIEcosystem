import type { TokenMetrics } from "./tokenAnalysisCalculator"

export interface IframeConfig {
  containerId: string
  srcUrl: string
  metrics: TokenMetrics
  refreshIntervalMs?: number
  theme?: "light" | "dark"
  title?: string
}

export class TokenAnalysisIframe {
  private iframeEl: HTMLIFrameElement | null = null
  private initialized = false
  private refreshTimer?: number

  constructor(private config: IframeConfig) {}

  init(): void {
    if (this.initialized) return

    const container = document.getElementById(this.config.containerId)
    if (!container) throw new Error("Container not found: " + this.config.containerId)

    const iframe = document.createElement("iframe")
    iframe.src = this.config.srcUrl
    iframe.width = "100%"
    iframe.height = "100%"
    iframe.style.border = "none"
    iframe.title = this.config.title ?? "Token Analysis Iframe"
    iframe.onload = () => this.postMetrics()
    container.appendChild(iframe)
    this.iframeEl = iframe

    if (this.config.refreshIntervalMs) {
      this.refreshTimer = window.setInterval(
        () => this.postMetrics(),
        this.config.refreshIntervalMs
      )
    }

    this.initialized = true
  }

  private postMetrics(): void {
    if (!this.iframeEl?.contentWindow) return
    this.iframeEl.contentWindow.postMessage(
      {
        type: "TOKEN_ANALYSIS_METRICS",
        payload: {
          ...this.config.metrics,
          theme: this.config.theme ?? "light",
        },
      },
      "*"
    )
  }

  updateMetrics(metrics: TokenMetrics): void {
    this.config.metrics = metrics
    this.postMetrics()
  }

  destroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = undefined
    }
    if (this.iframeEl && this.iframeEl.parentNode) {
      this.iframeEl.parentNode.removeChild(this.iframeEl)
    }
    this.iframeEl = null
    this.initialized = false
  }
}
