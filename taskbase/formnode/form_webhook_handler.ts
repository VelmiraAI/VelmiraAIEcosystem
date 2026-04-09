import type { TaskFormInput } from "./taskFormSchemas"
import { TaskFormSchema } from "./taskFormSchemas"
import { ExecutionEngine } from "./executionEngine"

/**
 * Processes a Typeform webhook payload to schedule a new task.
 */
export async function handleTypeformSubmission(
  raw: unknown
): Promise<{ success: boolean; message: string }> {
  const parsed = TaskFormSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      message: `Validation error: ${parsed.error.issues
        .map((i) => i.message)
        .join("; ")}`,
    }
  }

  const { taskName, taskType, parameters, scheduleCron } = parsed.data as TaskFormInput

  try {
    // Instantiate execution engine
    const engine = new ExecutionEngine()

    // Example: register handler dynamically (extend with real handlers)
    engine.register(taskType, async (params) => {
      return { echo: params }
    })

    // Enqueue task
    const taskId = `${taskType}-${Date.now()}`
    engine.enqueue(taskId, taskType, parameters)

    // TODO: integrate with a real scheduler if scheduleCron is provided
    if (scheduleCron) {
      console.log(`Scheduled cron job for task "${taskName}" at: ${scheduleCron}`)
    }

    return { success: true, message: `Task "${taskName}" scheduled with ID ${taskId}` }
  } catch (err: any) {
    return { success: false, message: `Task scheduling failed: ${err.message}` }
  }
}
