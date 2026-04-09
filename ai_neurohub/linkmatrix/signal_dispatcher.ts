import nodemailer from "nodemailer"

export interface AlertConfig {
  email?: {
    host: string
    port: number
    user: string
    pass: string
    from: string
    to: string[]
    secure?: boolean
  }
  console?: boolean
}

export interface AlertSignal {
  title: string
  message: string
  level: "info" | "warning" | "critical"
  timestamp?: number
  source?: string
}

export class AlertService {
  constructor(private cfg: AlertConfig) {}

  private async sendEmail(signal: AlertSignal) {
    if (!this.cfg.email) return
    const { host, port, user, pass, from, to, secure } = this.cfg.email
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: secure ?? false,
      auth: { user, pass },
    })
    await transporter.sendMail({
      from,
      to,
      subject: `[${signal.level.toUpperCase()}] ${signal.title}`,
      text: `${signal.message}\n\nSource: ${signal.source ?? "unknown"}\nTime: ${
        signal.timestamp ? new Date(signal.timestamp).toISOString() : new Date().toISOString()
      }`,
    })
  }

  private logConsole(signal: AlertSignal) {
    if (!this.cfg.console) return
    const ts = signal.timestamp
      ? new Date(signal.timestamp).toISOString()
      : new Date().toISOString()
    console.log(
      `[Alert][${signal.level.toUpperCase()}][${ts}] ${signal.title}\n${signal.message}${
        signal.source ? `\nSource: ${signal.source}` : ""
      }`
    )
  }

  async dispatch(signals: AlertSignal[]) {
    for (const sig of signals) {
      sig.timestamp = sig.timestamp ?? Date.now()
      await this.sendEmail(sig)
      this.logConsole(sig)
    }
  }
}
