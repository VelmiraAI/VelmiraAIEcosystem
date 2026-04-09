export interface InputLink {
  id: string
  source: string
  url: string
  metadata?: Record<string, any>
  createdAt?: number
  tags?: string[]
}

export interface InputLinkResult {
  success: boolean
  link?: InputLink
  error?: string
}

export class InputLinkHandler {
  private links = new Map<string, InputLink>()

  register(link: InputLink): InputLinkResult {
    if (this.links.has(link.id)) {
      return { success: false, error: `Link with id "${link.id}" already exists.` }
    }
    const enriched: InputLink = { ...link, createdAt: Date.now() }
    this.links.set(link.id, enriched)
    return { success: true, link: enriched }
  }

  get(id: string): InputLinkResult {
    const link = this.links.get(id)
    if (!link) {
      return { success: false, error: `No link found for id "${id}".` }
    }
    return { success: true, link }
  }

  list(): InputLink[] {
    return Array.from(this.links.values()).sort((a, b) => {
      const at = a.createdAt ?? 0
      const bt = b.createdAt ?? 0
      return bt - at
    })
  }

  findByTag(tag: string): InputLink[] {
    return this.list().filter((l) => l.tags?.includes(tag))
  }

  update(id: string, patch: Partial<InputLink>): InputLinkResult {
    const current = this.links.get(id)
    if (!current) {
      return { success: false, error: `No link found for id "${id}".` }
    }
    const updated: InputLink = { ...current, ...patch }
    this.links.set(id, updated)
    return { success: true, link: updated }
  }

  unregister(id: string): boolean {
    return this.links.delete(id)
  }

  clearAll(): void {
    this.links.clear()
  }
}
