import { runCategoryRepositoryContract } from './category-repository.contract.ts'
import { InMemoryCategoryRepository } from './in-memory-category-repository.ts'

runCategoryRepositoryContract(() => new InMemoryCategoryRepository())
