import { z } from "zod"

/**
 * Base types for any flow action.
 */
export type ActionSchema = z.ZodObject<z.ZodRawShape>

export interface ActionResponse<T> {
  notice: string
  data?: T
  timestamp?: number
  status?: "success" | "error" | "pending"
}

export interface BaseAction<
  S extends ActionSchema,
  R,
  Ctx = unknown
> {
  id: string
  summary: string
  description?: string
  category?: string
  input: S
  execute(args: { payload: z.infer<S>; context: Ctx }): Promise<ActionResponse<R>>
  validate?(payload: z.infer<S>): boolean
  toJSON?(): Record<string, any>
}
