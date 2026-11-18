## What You’re Asking For
- Add a real **“Documents Library”** under `http://demo.localhost:3000/staff`.
- It must be **connected** to:
  - student report cards / certificates
  - parent (guardian) IDs
  - staff IDs
  - staff contracts / contract documents
  - any other certificates / documents across the system

## Current State (What Exists Today)
- Frontend `/staff` route exists and `DocumentsTab.tsx` is mostly placeholder. [DocumentsTab.tsx](file:///p:/KusKul/frontend/src/features/staff/components/documents/DocumentsTab.tsx)
- Backend already has a **generic documents system** stored in the `documents` table (`entity_type`, `entity_id`, `filename`, bytes). [document.py](file:///p:/KusKul/backend/app/models/document.py)
- Backend already supports:
  - `GET /documents?entity_type=&entity_id=`
  - `POST /documents/upload`
  - `DELETE /documents/{id}`
  - `GET /documents/{id}/download`
  [documents.py](file:///p:/KusKul/backend/app/api/v1/endpoints/documents.py)
- Student documents are stored as `entity_type="student"`, staff docs as `entity_type="staff"`.
- Staff contracts exist, but they currently only store a `contract_document_url` string (no real attachment workflow). [staff_extended.py](file:///p:/KusKul/backend/app/models/staff_extended.py)
- Report card generation is currently **not implemented** in backend. Certificates generation exists in backend but there’s no frontend integration.

## Approach (Make It Actually “Connected”)
I’ll implement a **single, consistent “Document Linking” model**:
- Every uploaded/generated file becomes a `Document` row.
- It is linked to the correct feature by:
  - `entity_type` (student / guardian / staff / staff_contract / certificate / report_card)
  - `entity_id` (UUID string)

This instantly connects uploads to students/parents/staff/contracts and makes the library reusable.

## Backend Work
### 1) Make documents API usable for a real library
- Expand `DocumentOut` to include fields needed by a professional library UI:
  - `created_at`, `content_type` (and optionally `size_bytes` if desired)
- Optionally expose `download` in schema or provide a clear client path.

### 2) Contract document linking
- Implement a workflow so a staff contract can have an attached document:
  - Upload file → create `Document(entity_type="staff_contract", entity_id=contract_id)`
  - Update `StaffContract.contract_document_url` to point to `/documents/{docId}/download`

### 3) Certificates + report cards connection (realistic scope)
- **Certificates**:
  - Add backend endpoints to list generated certificates per student and download them (or store them as `Document` automatically).
- **Report cards**:
  - Since report-card rendering is stubbed, implement one of:
    - A minimal PDF export endpoint based on existing results, saved to `Document(entity_type="report_card")`, OR
    - UI support to upload report card PDFs and store them as `Document(entity_type="student")` with a “Report Card” type.

(We can start with upload-based report cards immediately, then upgrade to generated PDFs later.)

## Frontend Work
### 1) Add a proper Documents API client
- Create `frontend/src/api/documents.ts`:
  - listDocuments(filters)
  - uploadDocument(file, entity_type, entity_id)
  - bulkUpload
  - deleteDocument
  - downloadDocumentBlob (hits `/documents/{id}/download`)

### 2) Implement “Documents Library” UI inside Staff → Documents tab
Replace placeholder with a real library:
- Filters:
  - Scope tabs: All / Students / Parents / Staff / Contracts / Certificates / Report Cards
  - Entity selector (autocomplete):
    - Students from existing `/students` API
    - Guardians from existing `/guardians` API
    - Staff from existing `listStaff`
    - Contracts from `listStaffContracts`
- Table/grid:
  - filename, entity, uploaded by, created_at, actions
- Actions:
  - Upload
  - Download
  - Delete
  - Quick link to the related record (student profile / staff profile / contract)

### 3) Connect Contracts tab to real contract docs
- Replace mock contracts with real `listStaffContracts` + “Upload Contract PDF” action.
- If a contract has `contract_document_url`, show “Download contract”.

## Verification
- Upload a staff ID doc → appears under Staff scope and downloads.
- Upload a guardian ID doc → appears under Parents scope.
- Upload a contract PDF → links to StaffContract and downloadable from contract row.
- Upload report card PDF for a student → appears under Students + Report Cards.
- Permission checks:
  - Staff roles can see relevant documents.
  - Parent role restrictions remain enforced by backend.

If you confirm, I’ll implement backend+frontend so “Documents Library” is fully functional and actually linked to students, guardians, staff, and staff contracts, with a clear path for certificates/report cards integration.