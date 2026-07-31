import { IndexedDBCategoryRepository } from './indexeddb-category-repository.ts'

export const categoryRepository = IndexedDBCategoryRepository.open('track')
