export interface Rule {
  id: string
  pattern: string
  categoryId: string
}

export interface NewRule {
  pattern: string
  categoryId: string
}
