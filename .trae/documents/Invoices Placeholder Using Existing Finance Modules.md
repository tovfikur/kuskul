## What This Means Right Now
- Since backend invoices are not implemented, we cannot create/store true invoice records or a full invoice lifecycle entity.
- We *can* still give you an “Invoices” experience by treating **Fee Dues** as the invoice state machine, and **Fee Payments** as the invoice activity log.

## Mapping (How We’ll Represent Invoice Lifecycle)
- **Invoice total** → `FeeDue.total_fee` (computed from Fee Structures)
- **Discounts** → `FeeDue.discount_amount` (from Discounts + StudentDiscount)
- **Paid** → `FeeDue.paid_amount` (from Payments ledger; refunds reduce paid)
- **Balance** → `FeeDue.due_amount`
- **Lifecycle status** → `FeeDue.status` (`paid | partial | due | overdue`)

## Frontend Implementation
### 1) Upgrade the Finance “Invoices” tab (no backend changes)
- Replace the current static message in [InvoicesTab.tsx](file:///p:/KusKul/frontend/src/features/finance/components/InvoicesTab.tsx) with a real invoice-like dashboard:
  - Filters: Academic Year, Class, Status, Student search
  - Summary chips: counts by status (paid/partial/due/overdue)
  - Table: Student, totals/discount/paid/balance, status

### 2) Add “Invoice Detail” view (still using existing APIs)
- Clicking a row opens a dialog/drawer:
  - Shows due breakdown (total/discount/paid/balance)
  - Shows payment history for that student via `GET /fee-payments?student_id=...`
  - Provides actions:
    - Collect Payment (opens existing Collect Payment dialog)
    - Download Receipt for a payment (existing receipt endpoint)

### 3) Add smart shortcuts (matches your spec text)
- Keep the informational copy: “Invoices planned… use Fee Structures, Payments, Dues, Discounts, Reports.”
- Add buttons that jump to those tabs inside Finance (using the existing `tab` query param):
  - Fee Structures → `tab=fees`
  - Payments → `tab=payments`
  - Dues → `tab=dues`
  - Discounts → `tab=discounts`
  - Reports → `tab=reports`

## Optional (Small UX Improvement)
- Allow Invoices tab to open “Collect Payment” with a preselected student:
  - Add an optional `initialStudent` prop to `CollectPaymentDialog` and plumb it through `PaymentsTab`.

## Verification
- Invoices tab loads dues list and shows counts by status.
- Row detail shows payment history and downloads receipts.
- Collect Payment updates dues after recalculation and refresh.
- No backend changes required for this phase.

If you approve this plan, I’ll implement the upgraded Invoices tab UI using the existing finance endpoints and wire the shortcuts + payment-history dialog.