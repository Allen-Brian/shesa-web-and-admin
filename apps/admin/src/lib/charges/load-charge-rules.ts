import type {
  ChargeRulesData,
  RuleForm,
  RuleOption,
  RuleRow,
} from '@/app/(personas)/finance/charges/[id]/widgets/charge-detail-types';
import { getServerClient } from '@/lib/supabase-server';

interface RawException {
  readonly id: string;
  readonly form: RuleForm;
  readonly condition: Record<string, unknown> | null;
  readonly replacement_amount: number;
  readonly member_id: string | null;
}

/**
 * Loads the member-rule (exception) management data for an individual
 * charge: the active rules (with names resolved into a readable
 * description), plus the batch + member option lists the add-rule form
 * needs. Returns a disabled shell when the caller can't manage rules,
 * so the panel simply hides.
 *
 * Called only from the Finance charge-detail page for member charges;
 * the Exco mirror never asks, so rules stay a Finance-only surface.
 */
export async function loadChargeRules(
  chargeId: string,
  scopeId: string,
  currency: string,
  userId: string,
): Promise<ChargeRulesData> {
  const supabase = await getServerClient();
  const empty: ChargeRulesData = {
    canManage: false,
    canManageIndividual: false,
    currency,
    rules: [],
    batchOptions: [],
    memberOptions: [],
  };

  const [{ data: canManage }, { data: canManageIndividual }] = await Promise.all([
    supabase.schema('core').rpc('has_permission', {
      p_user_id: userId,
      p_scope_id: scopeId,
      p_permission_key: 'exception.create',
    }),
    supabase.schema('core').rpc('has_permission', {
      p_user_id: userId,
      p_scope_id: scopeId,
      p_permission_key: 'exception.apply_individual',
    }),
  ]);
  if (!canManage) return empty;

  const [{ data: exceptionsRaw }, { data: batchesRaw }, { data: membershipsRaw }] =
    await Promise.all([
      supabase
        .schema('finance')
        .from('exceptions')
        .select('id, form, condition, replacement_amount, member_id')
        .eq('charge_id', chargeId)
        .eq('is_active', true),
      supabase.schema('core').from('scopes').select('id, name').eq('scope_type', 'batch'),
      supabase
        .schema('core')
        .from('memberships')
        .select('member_id, members!inner(id, full_name)')
        .eq('scope_id', scopeId)
        .in('membership_status', ['active', 'passive']),
    ]);

  const batchOptions: RuleOption[] = ((batchesRaw ?? []) as { id: string; name: string }[])
    .map((b) => ({ id: b.id, name: b.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const batchName = new Map(batchOptions.map((b) => [b.id, b.name]));

  const memberOptions: RuleOption[] = (
    (membershipsRaw ?? []) as unknown as { members: { id: string; full_name: string } }[]
  )
    .map((m) => ({ id: m.members.id, name: m.members.full_name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const memberName = new Map(memberOptions.map((m) => [m.id, m.name]));

  const rules: RuleRow[] = ((exceptionsRaw ?? []) as RawException[]).map((e) => ({
    id: e.id,
    form: e.form,
    replacementAmount: e.replacement_amount,
    description: describeRule(e, currency, batchName, memberName),
  }));

  return {
    canManage: true,
    canManageIndividual: !!canManageIndividual,
    currency,
    rules,
    batchOptions,
    memberOptions,
  };
}

/** Build the human summary shown in the rules list. */
function describeRule(
  e: RawException,
  currency: string,
  batchName: ReadonlyMap<string, string>,
  memberName: ReadonlyMap<string, string>,
): string {
  const amount = `${new Intl.NumberFormat().format(e.replacement_amount)} ${currency}`;
  const cond = e.condition ?? {};
  if (e.form === 'fixed') {
    const ids = (cond.batch_scope_ids as string[] | undefined) ?? [];
    const names = ids.map((id) => batchName.get(id) ?? 'a batch').join(', ');
    return `${names || 'Selected batches'} → pay ${amount}`;
  }
  if (e.form === 'relative') {
    return `Exited ≤ ${cond.max_years_since_exit ?? '?'} years ago → pay ${amount}`;
  }
  if (e.form === 'senior') {
    return `Exited ≥ ${cond.min_years_since_exit ?? '?'} years ago → pay ${amount}`;
  }
  return `${memberName.get(e.member_id ?? '') ?? 'One member'} → pay ${amount}`;
}
