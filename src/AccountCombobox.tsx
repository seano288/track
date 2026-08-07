import { Combobox } from '@kobalte/core/combobox'
import { createMemo, createSignal } from 'solid-js'
import type { Account } from './domain/account.ts'
import { filterAccountOptions, type AccountOption } from './accounts/filter-account-options.ts'

export type { AccountOption as AccountSelection } from './accounts/filter-account-options.ts'

export function AccountCombobox(props: {
  accounts: Account[]
  value: AccountOption | undefined
  onChange: (selection: AccountOption | undefined) => void
}) {
  const [query, setQuery] = createSignal('')
  const options = createMemo(() => filterAccountOptions(props.accounts, query()))

  return (
    <Combobox<AccountOption>
      class="account-combobox"
      options={options()}
      value={props.value ?? null}
      onChange={(option) => props.onChange(option ?? undefined)}
      onInputChange={setQuery}
      optionValue={(option) => (option.kind === 'existing' ? option.id : `new:${option.name}`)}
      optionLabel={(option) => option.name}
      optionTextValue={(option) => option.name}
      placeholder="Select or create an account"
      itemComponent={(itemProps) => (
        <Combobox.Item item={itemProps.item} class="account-combobox-item">
          <Combobox.ItemLabel>
            {itemProps.item.rawValue.kind === 'new'
              ? `Create "${itemProps.item.rawValue.name}"`
              : itemProps.item.rawValue.name}
          </Combobox.ItemLabel>
        </Combobox.Item>
      )}
    >
      <Combobox.Control class="account-combobox-control">
        <Combobox.Input class="account-combobox-input" />
        <Combobox.Trigger class="account-combobox-trigger">
          <Combobox.Icon class="account-combobox-icon">▾</Combobox.Icon>
        </Combobox.Trigger>
      </Combobox.Control>
      <Combobox.Portal>
        <Combobox.Content class="account-combobox-content">
          <Combobox.Listbox class="account-combobox-listbox" />
        </Combobox.Content>
      </Combobox.Portal>
    </Combobox>
  )
}
