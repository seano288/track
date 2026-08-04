import type { Category } from './domain/category.ts'
import { categoryName } from './domain/category.ts'

export function RulePromptHint(props: {
  description: string
  categoryId: string
  categories: Category[]
  onAccept: () => void | Promise<void>
  onDismiss: () => void
}) {
  return (
    <div role="status">
      <p>
        Create a rule so future transactions matching "{props.description}" are auto-categorized as{' '}
        {categoryName(props.categories, props.categoryId)}?
      </p>
      <button type="button" onClick={props.onAccept}>
        Create rule
      </button>
      <button type="button" onClick={props.onDismiss}>
        Dismiss
      </button>
    </div>
  )
}
