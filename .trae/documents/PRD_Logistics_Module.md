## 1. Product Overview
A professional Logistics module for school operations, accessible at `/logistics`.
It centralizes inventory, procurement, assets, maintenance, transport, vendors, and logistics reporting with strict RBAC enforcement.

## 2. Core Features

### 2.1 User Roles
The system already supports role-based access per school (membership + permission list). The Logistics module must reuse this model.

| Role | Registration Method | Core Permissions |
|------|---------------------|------------------|
| Super Admin | Existing system user | Global access (`super:*`), can access Logistics for any school context |
| Admin | Existing system user | Full Logistics management for their school (create/update/approve) |
| Teacher | Existing system user | Optional read-only access if granted by role permissions |
| Student/Parent | Existing system user | No Logistics access by default |

### 2.2 Feature Module
Our Logistics requirements consist of the following main pages:
1. **Logistics**: module navigation (tabs), lists, filters, create/edit flows, approvals, and reporting.

### 2.3 Page Details
| Page Name | Module Name | Feature description |
|-----------|-------------|---------------------|
| Logistics | RBAC entry guard | Block/allow access based on assigned permissions; show “no access” state if forbidden. |
| Logistics | Global module navigation | Switch between Inventory, Procurement, Assets, Maintenance, Transport, Vendors, Reports; preserve selected tab in URL for deep links. |
| Logistics | Inventory | View items and current stock by location; create/update items; record stock movements (receive/issue/adjust) with notes and reference docs. |
| Logistics | Procurement | Create purchase requests (PR) with line items; approve/reject PR; convert approved PR to purchase order (PO); record goods receipt against PO to update stock. |
| Logistics | Vendors | Create/update vendor directory; link vendors to POs; store contact details and status (active/inactive). |
| Logistics | Assets | Register assets (tag/serial, category, location, assigned custodian); update lifecycle status (in-use, in-repair, retired). |
| Logistics | Maintenance | Create maintenance tickets linked to an asset/vehicle/building area; assign owner; update status (open/in-progress/done); capture work notes and cost fields. |
| Logistics | Transport (integration) | View and manage transport routes/vehicles/stops/assignments using existing transport capabilities; surface them under Logistics for operational continuity. |
| Logistics | Reports | Generate logistics reports (stock on hand, movements, open PR/PO, asset register, maintenance backlog/cost); export view as CSV. |

## 3. Core Process
### Admin / Logistics Staff Flow
1. Open `/logistics` and choose a sub-area (Inventory/Procurement/Assets/Maintenance/Transport/Vendors/Reports).
2. Inventory: create items and locations, then record receipts/issues/adjustments to keep stock accurate.
3. Procurement: create PR → approve/reject → create PO → record goods receipt; receiving updates inventory automatically.
4. Assets: register assets when received; assign to custodian/location; raise maintenance tickets when faults occur.
5. Maintenance: triage tickets, assign and complete work; track costs for reporting.
6. Reports: run operational views (stock on hand, open orders, maintenance backlog) and export when needed.

```mermaid
graph TD
  A["Dashboard / Modules"] --> B["Logistics (/logistics)"]
  B --> C["Inventory"]
  B --> D["Procurement"]
  B --> E["Assets"]
  B --> F["Maintenance"]
  B --> G["Transport"]
  B --> H["Vendors"]
  B --> I["Reports"]
  D --> J["Purchase Request"]
  J --> K["Approval"]
  K --> L["Purchase Order"]
  L --> M["Goods Receipt"]
