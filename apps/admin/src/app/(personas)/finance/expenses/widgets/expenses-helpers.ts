import type { RecordForm, ScopeOption } from './expenses-types';

/** Fresh state for the "record expense" dialog. */
export function initialRecord(scopeOptions: readonly ScopeOption[]): RecordForm {
  return {
    scopeId: scopeOptions[0]?.id ?? '',
    categoryId: '',
    payee: '',
    amount: '',
    description: '',
    incurredAt: new Date().toISOString().slice(0, 10),
  };
}
