# Shesa Finance — Module Specification

**The record-keeping and treasury engine for the Shesa alumni association**

Version 0.1 · Status: Behavioral lock + architecture · Payment gateways deferred (simulated)

> Sibling to [entities.md](entities.md) — Phase 3 companion. Where entities.md is the Exco (Phase 2) surface, this is the Finance (Phase 3) surface. Every decision here is either locked in conversation or a delegated judgment call flagged ⚑ in the log at the bottom. Cross-references: domain terms → [../glossary.md](../glossary.md); decisions/why → [../adr/](../adr/); conventions/how → [../standards/](../standards/).

---

## Scope of this build

This module implements the **full financial record-keeping engine** — charges, contributions, donations, tickets, obligations, payments, treasury, ledger, expenses, exceptions, receipts, and reports — with **one deliberate deferral**: the real payment gateways (MTN MoMo, Orange Money, card, bank webhooks, settlement, reconciliation, retry queues, provider health monitoring) are **not built now**. Payments are **simulated** (a ~3-second confirmation) behind a **provider interface** so that plugging in real rails later is a provider implementation, not a rewrite of this module.

Everything else in the plan remains. The engine is complete; only the rails are stubbed.

Two constraints override everything below:

1. **The engine is full double-entry; the interface exposes only tasks and answers.** A Shesa financial secretary is usually not an accountant. They see "set up a fee," "collect for an event," "record a payment," "see who owes," "see the balance." They never see the words _obligation_, _ledger entry_, _journal_, or _allocation_. Those exist underneath — they are what make the system auditable — and surface only _as reports_.
2. **Append-only from day one.** Recorded payments (even simulated, even manual cash) are immutable. Corrections are reversing entries, never edits. Retrofitting this later is the expensive path, so it holds now.

---

## Part I — Philosophy & principles

- **One primitive, reused everywhere.** `Charge/Contribution → Obligation → Payment → Ledger → Treasury balance`. Every money movement is the same shape; behavior comes from flags, not from new object types.
- **Immutable ledger.** The ledger is the single source of truth. Nothing in it is edited or deleted. A correction is a new, balancing entry.
- **Governance and finance are separate powers.** The **Finance** role creates and runs money; the **Admin** role (President/VP) _sees_ all money but cannot create financial entries. A third, sensitive tier gates waivers and expense approvals.
- **Multi-body, but only some bodies hold money.** **Global (Mainstream), Branches, and Autonomous Chapters** are finance-bearing — they have treasuries and can create charges. **Batches, Houses, and Networks are target filters only** — they select _who_ is charged; they never own a treasury, owe as a body, or employ a finance officer.
- **Branch surplus is independent of national levies.** A branch's own dues and any levy Global bills it are unrelated. The levy is one expense the branch settles; whatever else its members paid stays in the branch treasury.

---

## Part II — The financial model (canonical)

### The primitive chain

```
Charge / Contribution / Ticket         (a financial intent, created by Finance)
        │  targets an audience (individuals, or a branch as a body)
        ▼
Obligation                             (hidden layer: "this party owes / may give this amount")
        │  settled by
        ▼
Payment                                (immutable; simulated or manual)
        │  recorded as a balancing journal
        ▼
Ledger entries (income / expense)      (append-only, double-entry)
        ▼
Treasury balance                       (derived / materialized from the ledger)
```

### Parties (who can owe)

Only two kinds of party ever hold an obligation:

- **An individual member** (dues, a share of a contribution, a ticket purchase), or
- **A branch as a body** (only when Global levies a branch).

Batches, houses, and networks **cannot owe** — they are filters that select individuals.

### The taxonomy — five shapes, one primitive

| Shape                    | Amount                                 | Per-member obligation? | Bounded window? | Tracked as                     | Typical use                                         |
| ------------------------ | -------------------------------------- | ---------------------- | --------------- | ------------------------------ | --------------------------------------------------- |
| **Charge (dues / levy)** | fixed per member (or a branch-as-body) | yes                    | no — recurring  | who's paid · arrears           | monthly/annual branch dues, Global levy on a branch |
| **Goal contribution**    | open, toward a group total             | no                     | yes             | raised vs. goal + contributors | "2012 batch, raise 210,000"                         |
| **Open contribution**    | any (optional minimum)                 | no                     | yes             | contributors + total           | general event fund                                  |
| **Ticketed**             | fixed per unit, with quantity          | on purchase            | yes             | sold vs. capacity + buyers     | event tickets, dinner seats                         |
| **Donation**             | any, freewill                          | no                     | optional        | income + source                | website donations, walk-ins                         |

The distinction that matters most for the UI: **charges create per-member debts (arrears exist); contributions and tickets do not** — you cannot be "in arrears" on a voluntary goal. That single fact shapes every view.

---

## Part III — Charge engine (recurring dues & levies)

A **Charge** is a recurring obligation a body's members (or a branch as a body) must meet.

**Who creates charges**

- **Global/Mainstream Finance** — may charge a **branch as a body** (the branch owes; its finance officer settles from the branch treasury), **or** charge **individuals filtered by any dimension** (batch, house, network, location, exit-year). Only Global can levy a branch.
- **Branch / Autonomous-Chapter Finance** — charges **its own members**, and sets **tiers via the exception engine** (e.g. "25,000/month, but 2,500 for batch 2012-and-later, or by exit-year / years-since-exit"). The branch sets its own per-member amounts; Global never dictates them.
- **Batches create nothing.** A batch is only ever a target selected by Global.

**Attributes**
Name · category (seeded, editable — dues, levy, registration, AGM, project fund, emergency fund, other) · base amount · currency · recurrence · target (scope + filter) · tier exceptions · issue date · activation date · lifecycle status.

**Recurrence** — one-time · monthly · quarterly · biannual · yearly. (No raw cron in the UI; recurrence is a structured enum + interval.)

**Obligation generation** — a charge carries an **issue date** (when obligations are generated — recurring charges generate on schedule via pg_cron) and an **activation date** (when they become payable and arrears begin). Generation and "in arrears" are separate: a January-issued annual due can be visible for pre-payment while arrears only start in March.

**Lifecycle** — Draft → Active → (Paused) → Archived (soft). Currency locks once any financial record references the body.

**Approval** — a charge created by **Finance** goes live directly (Finance is the money authority). A **contribution** proposed by an **Admin** must be **Finance-approved** before it generates anything (see Part IV).

---

## Part IV — Contribution engine

A **Contribution** collects money toward a purpose, usually event-tied, usually optional. Unlike a charge, it has a **bounded, extendable window** and (except when explicitly fixed) creates **no per-member arrears**.

### The four contribution shapes

- **Goal contribution** — a group target (e.g. "2012 batch → 210,000 total"). Members contribute _any amount_ toward it; the system tracks **raised vs. goal** and lists contributors. **No per-member obligation, no arrears** — a batch cannot owe, but its members can rally toward a shared number. This is the primary way batches appear in finance.
- **Open contribution** — any amount, optional minimum, no goal ceiling.
- **Ticketed** — fixed price per unit, **quantity per buyer**, and an **optional capacity cap** (e.g. 200 seats). Tracks **sold vs. available** and who bought how many. Almost always event-tied.
- **Fixed contribution** — a set per-member amount (behaves like a one-off charge; creates obligations).

### Lifecycle — the bounded, extendable window

```
Draft ──▶ Open ──▶ Closed ──▶ Archived
                │        ▲
                └─ Extended ─┘   (reopen after close date, new close date, logged)
```

- **Draft** — created, not yet visible.
- **Open** — live, accepting payments, within its duration (open date → close date).
- **Closed** — reached its close date (auto) **or** closed early by Finance (manual). No longer accepting payments.
- **Extended** — the distinctive state: **after the close date has passed**, Finance adds extra days (a new close date), reopening it. Every extension is audited (who, when, old close → new close).
- **Archived** — soft-removed from active lists; history and receipts remain.

### Event tie

A contribution of **event type** requires the **event to exist first** — the admin selects the event to bind them. Deleting/archiving an event that has a **live contribution with recorded payments is blocked**; the contribution must be settled/archived first.

### Approval

An **Admin-created** contribution enters **Pending-Finance** and goes live only on **Finance approval** — because publishing it puts money-collecting objects into the world, and the Finance officer owns the books. A **Finance-created** contribution goes live directly. Finance may edit an Admin-proposed contribution (amount, target, dates) before approving.

---

## Part V — Donations

**Freewill gifts** to the association, typically originating from the public website.

- **No target, no obligation, no arrears** — a donation is pure income with a source.
- **Public / anonymous allowed** — a donor need not be a member; if the donor is a known member, the donation is linked to them, but membership is never required.
- Optionally tied to a **campaign or general fund**.
- Produces a **receipt** like any payment (useful for donor acknowledgment).

Donations are the simplest path in the module — they skip the obligation layer entirely.

---

## Part VI — Obligation engine (the hidden layer)

Obligations are generated from charges (and fixed contributions). **They never appear in the UI as "obligations"** — they surface only as "who owes / arrears / a member's balance."

- **Generation** — on the charge's issue schedule; immediate for one-offs.
- **Proration** — a member joining mid-cycle on a recurring charge owes a **prorated** amount for the partial period.
- **Partial payments** — allowed; the unpaid remainder shows as **arrears**.
- **Freeze** — once generated, an obligation's **amount, the member it names, and the terms that produced it are immutable**. A later transfer, exception change, or charge edit does **not** retroactively alter an existing obligation. This is what makes a member statement trustworthy over time.
- **Cancel** — the obligation should never have existed (created in error) → `cancelled`, reason logged, no money expected.
- **Forgive / waive** — the obligation was valid but is written off (hardship, president's relief) → `forgiven`, a financial event shown in reports as forgone income, distinct from _paid_ and from _cancelled_. Gated by the sensitive-approval permission, audited.
- **Never deleted.**

**Transfer behavior** — when a member transfers with unpaid dues, **arrears stay with the body where they were incurred**; the destination starts fresh obligations. The source membership retains its registration/arrears state on its closed row (as locked in the Memberships build).

---

## Part VII — Payment engine (simulated now, real later)

A **Payment** settles an obligation or records a contribution/donation/ticket purchase. Every payment is **immutable** once recorded.

**Attributes** — amount · currency · **method** (MTN MoMo · Orange Money · cash · bank transfer · card [future]) · **source** (`auto` = through the payment window/API · `manual` = entered by a human) · payer · linked obligation/contribution · timestamp · recorded-by (for manual) · rate snapshot (for cross-currency).

**The payment window (simulated)** — a member receives a **prefilled link/window** (method, phone, amount) and pays. In this build the confirmation is a **~3-second simulation → success**, behind a **`PaymentProvider` interface**. The real MoMo/Orange/card/bank implementations slot in behind this interface later with no change to the contributions or treasury code.

**Manual / cash entry** — the batch or branch collects physically; **Finance records** each payment manually. These are as real as windowed payments in the ledger, but flagged `source = manual` with a recorded-by actor.

**Pay on behalf** — **Finance or the body's Admin** can record a payment for a member (someone paid cash to the president). The obligation and payment still attach to that member. A member cannot pay _on behalf of_ another through the admin surface (though anyone may pay their own via the public link).

**Immutability & corrections** — neither amount nor payer can be edited after recording. Mistakes are fixed with **reversing entries** (a new payment that negates a prior one, reason logged), never edits.

**Deferred (Part XI):** real gateway integration, webhooks, idempotency-against-provider, settlement, reconciliation, retries, provider health. The interface exists now; the implementations wait.

---

## Part VIII — Receipts

Every recorded payment — **including manual/physical collections** — can produce a **printable receipt carrying a scannable QR code**.

- A receipt is a **rendered view of an immutable payment**, not a stored mutable document. Regenerating it reproduces the same facts, so regeneration is always safe.
- The **QR encodes a verification URL/code that resolves to the authoritative payment record** — it is _not_ the receipt data itself. A tampered paper receipt therefore fails verification, because the QR points back to the real record.
- **Verification is public but minimal** — scanning shows just enough to confirm authenticity (receipt number, amount, date, contribution/charge name, "valid") **without** exposing the member's full financial history. Receipts get handed around physically, so verification must be openable by anyone holding the paper, yet leak nothing beyond that one payment.
- Receipts on manual payments are where this earns its keep in the Cameroonian association context: cash is collected, Finance records it, and each contributor gets a verifiable receipt though no gateway was involved.

---

## Part IX — Treasury & ledger

Each finance-bearing body (**Global, Branch, Autonomous Chapter**) holds a **treasury** — a running balance behaving like accounting books.

- **Double-entry underneath.** Every payment writes a **balancing journal** of ledger lines (e.g. income to the receiver's treasury, and settlement of the payer's obligation). Journals always balance; a correction is a new balancing journal. This is the engine — **never surfaced as "journals" or "ledger" in the UI.**
- **Balance is derived, maintained.** The ledger is the source of truth; each body's balance is **materialized** (updated by the same transaction that writes the ledger line), never re-summed on every page load, and **written only by the ledger-writing path** — never edited directly.
- **Income** = member/contribution/donation/ticket payments received. **Expense** = levies paid upward + disbursements Finance creates.
- **Branch-surplus independence** — member dues fill the branch treasury; a Global levy on the branch is one expense settled from it; the surplus stays with the branch. No member due is ever "collected on behalf of" Global, and a levy is never auto-split across members.
- **Surfaced to users only as** a **Treasury Statement** (opening balance · income · expenses · closing balance).

---

## Part X — Expense engine

**Finance records expenses** — money out of a treasury (venue, transport, printing, fuel, refreshments, honorarium, other).

- **Categories** — seeded, Mainstream-editable.
- **Attributes** — amount · category · payee · date · description · **attachment** (the invoice/quote for what was bought) · treasury impact.
- **Optional per-body approval threshold** _(judgment call — see decision log)_ — a body may set a threshold above which an expense enters `pending_approval` and the **Admin (President) approves** before it hits the ledger; below the threshold, Finance's entry is final. **Default: no threshold** (Finance's word is final), because most bodies are small — but the knob exists for bodies that want internal control.
- **Append-only** — an expense, once recorded, is corrected by a reversing entry, never edited.
- Reduces the treasury balance via the same journal mechanism as any other ledger write.

---

## Part XI — Exception engine

An exception is a **condition + a replacement amount**, attached to a charge. The member never sees the rule — only their resulting number.

**Forms**

- **Relative / rolling** — "left Sasse within the last 10 years → 2,500," computed from exit-year, sliding forward automatically each year.
- **Fixed** — "batch 2012-and-later → 2,500" (static cutoff — the tiering example).
- **Senior-flipped** — "ex-students of more than X years → reduced."
- **Individual** — the same machinery aimed at one named member (president's relief); that member simply sees the reduced figure.

**Resolution — highest-priority-wins, no stacking** _(judgment call — see decision log)_:

1. **Individual override** (highest — wins outright)
2. **Attribute/relative rule** (years-since-exit, exit-year)
3. **Group/batch rule**
4. **Base charge amount** (lowest)

The engine walks most-specific → least and takes the **first match**, never the union. A member eligible for both a batch tier _and_ an individual waiver gets the **individual waiver**, not both subtracted — stacking discounts is how you get negative dues and unexplainable balances. The matched exception is **recorded on the obligation** so a member statement can always explain the number. Attributes the engine reads: batch, exit-year / years-since-exit, house, active/passive, and the per-person override. Applying an individual exception is a sensitive, audited action.

---

## Part XII — Currency

- A branch/chapter **declares its currency at creation** (default XAF), **immutable once any financial record exists** (trigger-enforced).
- **Global always levies in XAF.** A diaspora (e.g. USD) branch's Finance officer sees a Global levy **pre-converted** to its currency; that branch's own member dues are natively in its currency.
- Each cross-currency amount stores its **real currency + the conversion rate snapshot**, so historical records never shift when rates move.
- **Live-rate provider is deferred** _(judgment call)_ — for now the rate is a **stored/settable value** (Finance can set/override it, audited); the live-rate API slots in behind the same seam later, exactly like the payment provider.
- Conversion happens at the **display/report layer** only; Global reports can show per-currency or a consolidated view.

---

## Part XIII — Reports (the answers)

Reports are where the hidden engine (obligations, ledger) surfaces — **as answers to questions**, never as raw tables. A practical, task-shaped set for the financial secretary (not an ERP's twenty):

| Report                        | Answers                                                               |
| ----------------------------- | --------------------------------------------------------------------- |
| **Collections**               | money in over a period, by charge/contribution                        |
| **Arrears / Outstanding**     | who owes (dues only), grouped by member · batch · branch              |
| **Contribution progress**     | raised vs. goal, or sold vs. capacity, per contribution               |
| **Treasury statement**        | opening · income · expenses · closing, per body                       |
| **Member statement**          | one member's charges, payments, waivers, balance, with year-end total |
| **Payment-method breakdown**  | how money arrived (MoMo/Orange/cash/…)                                |
| **Expense report**            | by category and period                                                |
| **Donation report**           | freewill income by source/campaign                                    |
| **Exception / waiver report** | who received reduced/forgiven amounts, and why                        |

Every report table is **exportable** (CSV/Excel). Every export runs under the caller's permission scope — a branch admin exports only their branch.

---

## Part XIV — Finance UI (task-shaped for the secretary)

The Finance persona inside the merged Admin app. The organizing principle: **the sidebar exposes tasks and answers, never primitives.**

**Sidebar** — Dashboard · Charges · Contributions · Donations · Payments · Receipts · Treasury · Expenses · Exceptions · Reports · Imports/Exports · (Settings). **No "Obligations," no "Ledger," no "Journals"** — those surface inside Charges (charge progress / who's paid) and Reports (arrears).

**Dashboard** — treasury balance, money in this period, open contributions with progress bars, outstanding dues count, recent payments.

**Task verbs** (how the secretary thinks, mapped to the engine):

- "Set up a fee" → create a Charge
- "Collect for an event" → create a Contribution (goal/open/ticketed), bind an event
- "Record a donation" → a Donation entry
- "Record a payment" → manual/cash Payment (with receipt)
- "Record an expense" → Expense entry
- "See who's paid / who owes" → the charge's payment status / arrears report
- "See the balance" → Treasury statement
- "Give someone a break" → apply an Exception

**Search, filters, bulk actions** — the shared comprehensive filter dialog (by batch/branch/house/network/exit-year/status), bulk mark-paid, bulk receipt generation, bulk waive.

The rule: **if a screen would make a non-accountant hesitate, it is exposing the engine instead of the task.**

---

## Part XV — Permissions & security

**Roles (per finance-bearing body)**

- **Finance** — creates and runs everything money: charges, contributions, payments, expenses, exceptions, reports.
- **Admin** (President/VP) — **sees** everything including all finance and records; **cannot create** financial entries. Approves Admin-proposed contributions' publication and (where a threshold is set) expenses.
- **Sensitive-approval** — waivers/forgiveness and (if enabled) over-threshold expenses.
- **Batch has no finance role.** Global, Branch, and Autonomous-Chapter Finance only.

**Enforcement**

- **RLS is the floor** (you can only read your body's finance rows; ledger/payment rows can never be UPDATE/DELETE'd), the **service authority is the brain** (can this actor create this charge in this scope).
- **All financial actions audited** (who, what, when) — creation, payment, waiver, reversal, expense approval, exception application.
- **Immutability & reversals** — payments/ledger rows are append-only at the database level; corrections are reversing entries.
- **Fraud prevention** — windowed-payment amount/name immutable; manual entries carry a recorded-by actor; waivers and reversals are permissioned and logged; receipts verify against the authoritative record.

---

## Part XVI — Data model (conceptual)

Spec-level entities (key columns, constraints, triggers — not full DDL):

- **`finance.charges`** — id · scope_id (creating body) · type/category · shape (charge/goal/open/ticketed/fixed/donation) · base_amount · currency · recurrence · target (scope + filter json) · issue_date · activation_date · open_date · close_date · goal_amount (nullable) · min_amount (nullable) · capacity (nullable) · event_id (nullable FK) · status · created_by · timestamps.
- **`finance.exceptions`** — id · charge_id · form (relative/fixed/senior/individual) · condition (json) · replacement_amount · priority · member_id (nullable, for individual) · created_by · audited.
- **`finance.obligations`** — id · charge_id · party_type (member/branch) · party_id · amount (frozen) · exception_applied (nullable) · status (open/partial/paid/cancelled/forgiven) · prorated (bool) · timestamps. **Frozen after generation.**
- **`finance.payments`** — id · obligation_id (nullable — donations/goal contributions have none) · charge_id · payer_member_id (nullable) · amount · currency · rate_snapshot (nullable) · method · source (auto/manual) · recorded_by (nullable) · reverses_payment_id (nullable) · timestamp. **Append-only (no UPDATE/DELETE).**
- **`finance.tickets`** — id · charge_id · buyer_member_id (nullable) · quantity · unit_price · payment_id. Capacity enforced by trigger against the charge's `capacity`.
- **`finance.ledger_entries`** — id · journal_id · scope_id (treasury) · direction (income/expense) · amount · payment_id/expense_id · timestamp. **Append-only.** Journals balance.
- **`finance.treasury_balances`** — scope_id (PK) · balance · currency · updated_at. **Maintained by the ledger-writing path only.**
- **`finance.expenses`** — id · scope_id · category · payee · amount · currency · description · attachment_url · status (recorded/pending_approval/approved) · approved_by (nullable) · recorded_by · reverses_expense_id (nullable) · timestamp.
- **`finance.receipts`** — derived; a receipt is a render of a payment + a verification token. `finance.receipt_verifications` (token → payment_id) backs the public QR lookup.
- **`finance.exchange_rates`** — currency_pair · rate · set_by · effective_at (stored/settable; live provider later).

Key triggers: currency immutability once financial records exist · ledger append-only (block UPDATE/DELETE) · treasury-balance maintenance on ledger write · ticket-capacity enforcement · obligation freeze.

---

## Part XVII — Service operations (Edge Functions)

`create-charge` · `update-charge` · `archive-charge` · `create-contribution` (+ event bind) · `approve-contribution` (Finance gate) · `open/close/extend-contribution` · `create-donation` · `generate-obligations` (cron) · `record-payment` (simulated provider) · `record-manual-payment` · `pay-on-behalf` · `reverse-payment` · `cancel-obligation` · `forgive-obligation` · `apply-exception` · `record-expense` · `approve-expense` · `reverse-expense` · `buy-tickets` · `generate-receipt` · `verify-receipt` (public) · `get-treasury-statement` · `run-report` · `export-finance-view` · `set-exchange-rate`.

Each: Zod-validated · permission-checked via the authority · writes audit · returns the standard error envelope · idempotency-keyed on writes.

---

## Part XVIII — Imports / exports

- **Every finance table is exportable** (CSV/Excel), under the caller's permission scope.
- **Excel import** via templates for: bulk **manual payments** (a batch's physical collection → one upload), bulk **exceptions** (tier lists), and opening-balance/expense backfill. Same upload → validate → review → confirm flow as member import; server-side parse; never trust client-parsed rows.

---

## Part XIX — Testing

- **Unit (Vitest)** — exception resolution (priority, no-stacking), proration, goal-progress math, currency snapshot, receipt-token generation.
- **pgTAP** — ledger append-only (UPDATE/DELETE raise) · treasury-balance maintenance correctness · obligation freeze · ticket-capacity enforcement · currency immutability · RLS on finance rows · reversing-entry balance.
- **Integration** — charge → obligation → simulated payment → ledger → balance end-to-end; manual payment + receipt + public verification.
- **E2E (Playwright)** — secretary creates a fee, records a manual payment, sees who owes, generates a receipt, scans-verifies; creates a goal contribution, watches progress; records an expense.
- **Deferred** — load and gateway/webhook security tests land with the real provider integration.

---

## Part XX — Implementation roadmap (milestones)

1. **Finance foundation** — schemas, roles/permissions (Finance vs Admin vs sensitive), audit, treasury shell, provider interface (simulated).
2. **Charge engine** — charges, recurrence, obligation generation, proration, arrears.
3. **Contribution engine** — goal/open/ticketed/fixed, the open/closed/extended lifecycle, event binding, approval gate.
4. **Payment engine (simulated)** — payment window, manual/cash, pay-on-behalf, reversals, immutability.
5. **Receipts** — render + QR + public verification.
6. **Treasury & ledger** — journals, materialized balance, income/expense, branch-surplus independence.
7. **Expense engine** — categories, optional approval threshold, attachments.
8. **Exceptions & currency** — resolution engine, tiers, rate snapshots (settable now).
9. **Reports** — the answer set + exports.
10. **Finance UI** — the task-shaped secretary experience.
11. **Donations** — freewill/public path.
12. **Hardening** — audit coverage, reversal flows. _(Real gateways + reconciliation are a later, separate phase.)_

---

## Decision log

Locked in conversation, plus the judgment calls delegated (flagged ⚑ — veto any):

1. **Batch is a target filter, never a debtor body.** Charges/contributions targeting "the 2012 batch" fan out to its individual members (or, for goal contributions, rally them toward a group total). No batch treasury, no batch finance officer, no batch-forwards-to-Global chain. This reverses the earlier batch-finance model.
2. **Only Global can levy a branch (as a body) or a batch's members.** Branch/Autonomous-Chapter Finance charges its own members with tiers.
3. **"Charge the batch 210,000" = a collective goal**, not a per-head debt — a goal contribution met by open individual contributions; progress tracked vs. goal; no per-member arrears.
4. **Contribution lifecycle: Draft → Open → Closed → (Extended) → Archived.** "Extended" reopens after the close date has passed by setting a new close date; audited.
5. **Tickets carry quantity + optional capacity cap** (sold-vs-available tracking).
6. **Receipt QR verification is public but minimal** — confirms authenticity, exposes only that one payment, not the member's history.
7. **Contributions/donations create no per-member arrears; only charges do.**
8. **Payments (incl. simulated & manual) are immutable; corrections are reversing entries** — from day one.
9. ⚑ **Exceptions resolve highest-priority-wins, no stacking** (individual > attribute > group > base); the matched exception is recorded on the obligation.
10. ⚑ **Expenses support an optional per-body approval threshold** (default off — Finance's word final); attachments allowed; append-only.
11. ⚑ **Obligation freeze** — generated obligations are immutable; transfers/exception-changes don't rewrite them.
12. ⚑ **Arrears stay with the body where incurred** on transfer; destination starts fresh.
13. ⚑ **Event-tied contribution requires the event first; archiving an event with a live, paid contribution is blocked.**
14. ⚑ **Donations allow public/anonymous payers; membership never required.**
15. ⚑ **Exchange rate is a settable/overridable stored value now** (audited); live-rate provider deferred behind the same seam as payments.
16. **Payment gateways deferred** — simulated (~3s) behind a `PaymentProvider` interface; real MoMo/Orange/card/bank/webhooks/reconciliation are a later phase.

---

_End of Finance specification v0.1. A living document; the payment-gateway and live-rate sections deepen when their real integrations begin._
