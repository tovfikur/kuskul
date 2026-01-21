## 1. Product Overview
A professional Finance module at **/finance** for configuring fees, issuing invoices, recording payments/refunds, tracking dues, managing discounts, and producing finance reports.
It is **school-scoped** (via active school context) and follows existing RBAC roles/permissions.

## 2. Core Features

### 2.1 User Roles
| Role | Registration Method | Core Permissions |
|------|---------------------|------------------|
| Super Admin | System-created | Manage global roles/permissions; access all schools. |
| School Admin | Created by admin | Full finance access within school; can approve corrections. |
| Accountant / Finance Officer | Created by admin | Manage fees, invoices, payments, dues, discounts; view/export reports. |
| Teacher (Read-only) | Created by admin | View student finance status (limited to assigned context if configured). |
| Parent/Student (Read-only) | Invited/created | View own/linked student invoices, payments, dues; download receipts/invoices. |

### 2.2 Feature Module
Our Finance module requirements consist of the following main pages:
1. **Finance Workspace (/finance)**: finance KPIs, fees setup, invoices, payments, dues/defaulters, discounts, financial reports.
2. **Student Finance Ledger (/finance/students/:studentId)**: student statement (invoices + payments + dues), discount assignment, quick collection/refund.
3. **Document Viewer (/finance/documents/:type/:id)**: printable invoice/receipt view and download.

### 2.3 Page Details
| Page Name | Module Name | Feature description |
|-----------|-------------|---------------------|
| Finance Workspace | School scope & access | Enforce active school context; hide/disable actions without required permission. |
| Finance Workspace | Overview KPIs | Show totals for collected/refunded/net, total due, overdue count, top defaulters snapshot. |
| Finance Workspace | Fees (Structures) | List fee structures; filter by academic year + class; create/edit/delete; bulk-create. |
| Finance Workspace | Invoices | Generate invoices from fee structures (per academic year + class/student); list/search invoices; mark status (draft/issued/void); send/download. |
| Finance Workspace | Payments | Record fee collection; list/filter by date/student/method; support refund; generate receipt. |
| Finance Workspace | Dues & Defaulters | Show due list (by class/status); trigger recalculation for an academic year; drill into student ledger. |
| Finance Workspace | Discounts | Create/update discounts (percent/fixed); apply/remove discounts on students; show discount impact on dues. |
| Finance Workspace | Reports | Run report presets (collection summary, due list, payment history, class-wise collection); export CSV/PDF. |
| Student Finance Ledger | Student summary | Show student header (name, admission no, class, academic year) and balances (total fee, discount, paid, due). |
| Student Finance Ledger | Ledger timeline | Display chronological combined timeline: invoices issued, payments, refunds, adjustments; filter by date/type. |
| Student Finance Ledger | Actions | Collect payment, issue invoice, apply discount, refund payment (role-gated); link to documents. |
| Document Viewer | Print layout | Render printable invoice/receipt with school header, student details, line items, totals, and audit info (created by/date). |
| Document Viewer | Download/share | Download PDF/print; copy share link (if enabled) with permission checks. |

## 3. Core Process
**Accountant / Finance Officer Flow**
1) Select school context → open **/finance**. 2) Configure fee structures for current academic year/class. 3) Generate/issue invoices. 4) Record payments (and refunds if needed). 5) Recalculate dues and review defaulters. 6) Apply discounts where approved. 7) Produce reports and export.

**Parent/Student Flow (Read-only)**
1) Open **/finance** → view invoices, dues, and payment history. 2) Open document viewer to download invoice/receipt.

```mermaid
graph TD
  A["Dashboard"] --> B["Finance Workspace (/finance)"]
  B --> C["Student Finance Ledger (/finance/students/:studentId)"]
  B --> D["Document Viewer (/finance/documents/:type/:id)"]