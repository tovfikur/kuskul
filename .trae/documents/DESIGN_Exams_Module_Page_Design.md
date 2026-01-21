# Exams Module — Page Design Spec (Desktop-first)

## Global Styles
- Framework: MUI components with the existing theme.
- Palette tokens: Primary `#1976d2`, Background default `#f5f5f5`, Paper `#ffffff`.
- Typography: Roboto stack; headings use MUI `h4/h6`; body uses `body2` for metadata.
- Surfaces: `Paper` radius ~12px; Buttons radius ~8px; default button text is not uppercase.
- Interaction: Use MUI hover rows in tables; use `Chip` for status; use `Tooltip` for icon actions.

## Page 1: Login (/login)
### Layout
- Centered single-column card (max width ~420px).
- Use Flexbox to vertically center within viewport.

### Meta Information
- Title: "Login | KusKul"
- Description: "Sign in to manage school operations."

### Sections & Components
1. Login Card
   - Email field, password field, primary "Sign in" button.
   - Inline validation and server error banner.

## Page 2: Exams (/exams)
### Meta Information
- Title: "Examinations | KusKul"
- Description: "Create exams, build schedules, enter marks, and publish results."

### Layout
- Inherits `MainLayout`: left Drawer (280px), top AppBar, content padding.
- Page uses stacked sections: Title → Primary Tabs → Tab Content.
- Responsive: below `md`, Drawer becomes temporary; internal tables allow horizontal scroll.

### Page Structure
1. Header
   - `Typography h4`: “Examinations”.
2. Primary Tabs (existing)
   - Tabs: "Overview", "Onsite/Offline Exams", "Online Exams".

---

## Tab A: Overview
### Structure
- 4-card grid (existing) in a `Grid` with responsive columns.

### Components
- Card tiles: "Exam Master", "Exam Schedules", "Marks Entry", "Result Generation".
- Each tile is clickable:
  - Navigates within the same route by switching tabs and focusing the target sub-section.

---

## Tab B: Onsite/Offline Exams (expanded)
### Structure
- Two-level navigation inside the tab:
  - Secondary tabs (recommended): "Exam Master", "Schedules", "Marks Entry", "Results".
- Desktop layout: secondary tabs aligned horizontally under the section header.

### B1. Exam Master
**Purpose:** Manage exam definition and lifecycle fields.

Components
1. Toolbar
   - Left: current academic year label.
   - Right: "Refresh" (outlined), "Add" (contained).
2. Exams Table
   - Columns: Name, Code, Type, Date Range, Weight %, Status, Published, Results Editable, Deadlines, Actions.
   - Row actions:
     - Edit (icon)
     - Publish (button; disabled if already published)
     - Delete (icon)
3. Add/Edit Exam Dialog
   - Title: "Add Exam" / "Edit Exam".
   - Form layout: 2-column grid on desktop.
   - Fields:
     - Basics: name (required), exam code, exam type (select + custom), start/end date.
     - Result rules: weight %, included in final result, best-of count, aggregation method, counts for GPA.
     - Lifecycle: status, result entry deadline, result publish date, results editable toggle, instructions (multiline).
   - Actions: Cancel, Save.

### B2. Schedules
**Purpose:** Define the per-class/per-subject exam timetable and max marks.

Components
1. Filters row
   - Exam selector (required for add), Class selector (optional filter).
   - "Refresh" button.
2. Schedules Table
   - Columns: Exam, Class, Subject, Date, Time, Room, Max Marks, Actions.
   - Actions: Edit, Delete.
3. Add/Edit Schedule Dialog
   - Fields: exam, class, subject, date, start time, end time, room, max marks.
4. Bulk Create (optional UI)
   - Simple multi-row editor grid (same fields as schedule) + "Create".

### B3. Marks Entry
**Purpose:** Fast bulk entry for a chosen schedule.

Components
1. Context selectors
   - Exam → Class → Subject/Schedule.
2. Marks Grid (editable table)
   - Columns: Roll/Admission No (if available), Student Name, Marks (numeric), Absent (toggle), Remarks.
   - Validation:
     - If Absent = true → marks disabled and sent as null.
     - If Absent = false → marks required and must be ≤ schedule max marks.
3. Actions
   - "Save" (contained), "Reload" (outlined).
   - Save uses a single bulk request (upsert behavior).

### B4. Results
**Purpose:** Generate, review, publish, and lock results.

Components
1. Controls
   - Exam selector (required), Class selector (optional).
   - Buttons: "Generate/Refresh", "Publish", "Lock/Unlock".
2. Results Table
   - Columns: Student, Total Marks, Obtained, Percentage, Grade.
3. Status display
   - Status chip derived from exam fields: `status`, `is_published`, `result_publish_date`, `is_result_editable`.

---

## Tab C: Online Exams (existing, keep)
### Structure
- Secondary tabs: "Question Bank", "Configs", "Attempts" (already implemented).
- No layout changes required; keep consistent with existing table + dialog patterns.
