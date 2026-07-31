import type { Transaction } from '../domain/transaction.ts'
import type { AccountRepository } from '../repositories/account-repository.ts'
import type { TransactionRepository } from '../repositories/transaction-repository.ts'

export async function deleteAccountAndCascade(
  accountId: string,
  transactions: Transaction[],
  repositories: { accounts: AccountRepository; transactions: TransactionRepository },
): Promise<number> {
  const affected = transactions.filter((transaction) => transaction.accountId === accountId)
  await repositories.transactions.deleteByAccountId(accountId)
  await repositories.accounts.delete(accountId)
  return affected.length
}
