/**
 * Simple task executor: registers and runs tasks by name.
 */
type Handler = (params: any) => Promise<any>

export interface Task {
  id: string
  type: string
  params: any
  priority?: number
}

export class ExecutionEngine {
  private handlers: Record<string, Handler> = {}
  private queue: Task[] = []
  private running = false

  register(type: string, handler: Handler): void {
    this.handlers[type] = handler
  }

  enqueue(id: string, type: string, params: any, priority = 0): void {
    if (!this.handlers[type]) throw new Error(`No handler for ${type}`)
    this.queue.push({ id, type, params, priority })
    this.queue.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
  }

  async runAll(): Promise<Array<{ id: string; result?: any; error?: string }>> {
    if (this.running) throw new Error("Execution already in progress")
    this.running = true
    const results: Array<{ id: string; result?: any; error?: string }> = []
    while (this.queue.length) {
      const task = this.queue.shift()!
      try {
        const data = await this.handlers[task.type](task.params)
        results.push({ id: task.id, result: data })
      } catch (err: any) {
        results.push({ id: task.id, error: err.message })
      }
    }
    this.running = false
    return results
  }

  clear(): void {
    this.queue = []
  }

  getPendingTasks(): Task[] {
    return [...this.queue]
  }
}
