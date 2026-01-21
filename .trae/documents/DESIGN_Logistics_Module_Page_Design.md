# Logistics Module Page Design (Desktop-first)

## Global Styles (applies to Logistics)
- Design system: MUI components for structure + Tailwind utilities for spacing/layout tweaks.
- Theme tokens:
  - Background: `#F7F8FA` page, `#FFFFFF` surfaces
  - Text: primary `#111827`, secondary `#6B7280`
  - Accent: brand primary (reuse app theme), status colors: success/warn/error from MUI palette
  - Typography scale: 12/14/16 body, 20/24 headers; tab labels 14 semibold
  - Buttons: primary contained for “Create/Submit/Approve”, outlined for secondary actions; disabled states use MUI defaults.
- Data density: table rows 44px (default), compact toggle optional.

## Page: Logistics (Route: /logistics and nested tabs)

## Implementation-ready UI component map (React + MUI)

### Top-level composition
- `LogisticsRoutes`
  - Owns nested routes (or `tab` query param) and renders one of:
    - `InventoryTab`
    - `ProcurementTab`
    - `AssetsTab`
    - `MaintenanceTab`
    - `TransportTab` (wrapper around existing transport module views)
    - `VendorsTab`
    - `ReportsTab`

- `LogisticsLayout`
  - Slots:
    - `LogisticsSidebarNav` (left)
    - `LogisticsHeader` (breadcrumb + primary CTA)
    - `LogisticsWorkspace` (right content)
  - Shared behaviors:
    - Reads school context (drives `X-School-Id` header)
    - Uses `RBACGate` to hide/lock tabs and protect content

### Shared UI primitives (reused across tabs)
- `RBACGate({ permission, children })`
  - Shows forbidden empty state on 403, and hides locked navigation entries.
- `ListFiltersBar`
  - Left: `SearchInput`, `StatusSelect`, date range (when needed)
  - Right: `RefreshButton`, `ExportCsvButton` (where allowed)
- `EntityTable`
  - MUI DataGrid-style table: sortable columns, row click opens drawer.
- `EntityDrawer`
  - Props: `{ mode: "create"|"view"|"edit", title, onClose, primaryAction, secondaryActions }`
  - Contains forms with `react-hook-form` + `zod` schema.

### Inventory tab components
- `InventoryItemsTable`
  - Columns: SKU, Item, UoM, Stock (derived), Reorder level, Active.
  - Actions: `NewItemButton`, row action menu (Edit/Deactivate).
- `InventoryItemDrawer`
  - Sections: Item fields (sku/name/uom/reorder/is_active), audit (created_at).
  - Secondary action: `RecordMovementButton`.
- `StockMovementDialog`
  - Fields: type (receive/issue/adjust), location, qty, note, ref (optional).
  - On submit: calls `POST /api/logistics/inventory/movements` then refreshes stock-on-hand.
- `LocationsManagement` (sub-panel in Inventory)
  - CRUD for `InventoryLocation` (code/name/is_active).

### Procurement tab components
- `ProcurementSubTabs` (PR / PO / Goods Receipts)
- `PurchaseRequestsTable`
  - Columns: PR No (id short), Status, Requested by, Created at.
  - Filters: status, q.
- `PurchaseRequestDrawer`
  - Header: status chip + requester.
  - Lines grid: item, qty, note.
  - Actions:
    - Draft: Save, Submit
    - Submitted: Approve / Reject (permission gated; requires decision note)
- `PurchaseOrdersTable`
  - Columns: PO No, Vendor, Status, Created at.
- `PurchaseOrderDrawer`
  - Lines grid: item, qty_ordered, unit_price.
  - Actions: Save (open), Create Receipt, Cancel.
- `GoodsReceiptDrawer`
  - Fields: PO, received_at, received_by, location.
  - Lines: PO line → qty_received.
  - Submit behavior: server creates goods receipt + writes stock movements.

### Assets tab components
- `AssetsTable`
  - Columns: Tag, Name, Category, Location, Status, Custodian.
- `AssetDrawer`
  - Fields: tag, serial_no, category, location, custodian, status.
  - Side panel: linked tickets count (maintenance).

### Maintenance tab components
- `MaintenanceTicketsTable`
  - Columns: Title, Asset/Area, Priority, Status, Assigned to, Cost, Updated.
- `MaintenanceTicketDrawer`
  - Fields: title, description, asset (optional), priority, status, assignee, cost.
  - Notes timeline: append-only `WorkNoteInput` (if/when implemented).

### Vendors tab components
- `VendorsTable`
  - Columns: Name, Phone, Email, Status.
- `VendorDrawer`
  - Fields: name, phone, email, status.

### Reports tab components
- `ReportsPicker`
  - Card grid: Stock on Hand, Movements, Open Orders, Asset Register, Maintenance Backlog/Cost.
- `ReportViewer`
  - Top: parameters (date range, location, status)
  - Body: chart (recharts) + table
  - Action: Export CSV (calls the matching `/api/logistics/reports/...` endpoint)

### Data fetching & state (recommended)
- Use Redux Toolkit Query (or existing app data layer) to define slices:
  - `inventoryApi`, `procurementApi`, `vendorsApi`, `assetsApi`, `maintenanceApi`, `reportsApi`
- Cache invalidation rules:
  - Goods receipt creation invalidates: `stock-on-hand`, `movements`, `purchase-orders`, `goods-receipts`
  - Stock movement creation invalidates: `stock-on-hand`, `movements`
- Error/empty/loading states must be consistent across tables and drawers.

### Layout
- Primary layout: CSS Grid (desktop) with `grid-template-columns: 260px 1fr`.
  - Left: module sidebar (tabs)
  - Right: content workspace
- Responsive:
  - ≥1024px: persistent sidebar + content
  - <1024px: sidebar collapses into a top tab bar / drawer; tables become card-list on very small widths.

### Meta Information
- Title: `Logistics | {School Name}`
- Description: `Inventory, procurement, assets, maintenance, transport, and vendor operations for {School Name}.`
- Open Graph: `og:title`, `og:description`, `og:type=website` (reuse global app defaults).

### Page Structure
1. **Top App Bar (existing shell)**
   - School switcher (sets `X-School-Id`), user menu, global search (if existing).
2. **Logistics Header Row**
   - Left: page title “Logistics” + breadcrumb `Home / Logistics / {Active Tab}`
   - Right: primary CTA changes per tab (e.g., “New Item”, “New PR”, “New Asset”, “New Ticket”, “New Vendor”).
3. **Sidebar (Logistics Areas)**
   - Items: Inventory, Procurement, Assets, Maintenance, Transport, Vendors, Reports.
   - Each item shows an icon + label; active highlight; disabled/hidden if access denied.
4. **Workspace Content (per tab)**
   - Shared sub-layout: Filters bar → Data table/grid → Pagination/footer.

### Shared Components & Interaction States
- **RBAC Gate**
  - If API returns 403: show “You don’t have access to Logistics” with suggested next steps (contact admin).
  - If some tabs forbidden: hide them or show locked state with tooltip.
- **Filters Bar**
  - Left: search input + quick filters (status/location/date range depending on tab).
  - Right: “Export CSV” (for list/report views), “Refresh”.
- **Data Table**
  - Columns per tab; sortable headers where meaningful; row click opens details.
  - Empty state: clear explanation + single CTA.
  - Error state: inline banner with retry.
- **Details Drawer (right side, 480–560px)**
  - Used for view/edit/create across all tabs to avoid route explosion.
  - Header: entity name + status chip; actions: Save, Submit/Approve (when applicable), Close.
  - Body: form sections with clear dividers.

### Tab Specifications
- **Inventory**
  - List: SKU, Item, UoM, Stock (computed), Reorder level, Active.
  - Drawer: item form + “Record Movement” sub-form (receive/issue/adjust) with qty, note, optional reference.
- **Procurement**
  - Split-view toggle: Purchase Requests / Purchase Orders / Goods Receipts.
  - PR drawer: header (requester, status) + line items table; actions: Submit, Approve/Reject (permission-gated).
  - PO drawer: vendor select + lines; receipt action creates a goods receipt and updates stock.
- **Assets**
  - List: Tag, Name, Category, Location, Status.
  - Drawer: asset details + history summary (receipts/tickets count).
- **Maintenance**
  - List: Ticket, Asset/Area, Priority, Status, Assigned to, Cost.
  - Drawer: update status, add work notes, assign owner; show timeline of updates.
- **Transport**
  - Reuse existing transport screens but presented under Logistics navigation; keep consistent header/filter patterns.
- **Vendors**
  - List: Name, Contact, Status, Last PO date (if available).
  - Drawer: contact form + status toggle.
- **Reports**
  - Report picker (card grid): Stock on hand, Movements, Open PR/PO, Asset register, Maintenance backlog/cost.
  - Output: chart + table; export