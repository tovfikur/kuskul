# Student Settings Tab - Verification Test Plan

## Overview
This document outlines the verification steps to ensure all operations in the Student Settings tab work correctly from both backend and frontend.

## Backend Integration Status

### ✅ Completed
1. **Settings API Endpoint**: `/api/v1/settings`
   - GET `/api/v1/settings/{key}` - Retrieve a specific setting
   - PUT `/api/v1/settings/{key}` - Update a specific setting
   - Settings are stored in the `settings` table with school_id isolation

2. **Database Model**: `Setting` model exists with:
   - `id` (UUID)
   - `school_id` (UUID, foreign key to schools)
   - `key` (String, 120 chars)
   - `value` (String, 4000 chars - stores JSON)
   - `updated_at` (DateTime with timezone)

3. **Frontend Integration**: `SettingsTab.tsx` updated to:
   - Load settings from `/api/v1/settings/students.settings` on mount
   - Save settings to backend via PUT request
   - Display loading state while fetching
   - Handle 404 gracefully (use defaults if setting doesn't exist)
   - Show success/error toasts for user feedback

## Test Cases

### 1. Initial Load
**Steps:**
1. Navigate to `http://localhost:3000/students`
2. Click on the "Settings" tab
3. Observe loading spinner
4. Settings should load (either from backend or defaults)

**Expected Result:**
- Loading spinner appears briefly
- All settings fields populate with either saved values or defaults
- No errors in console

### 2. Modify Settings
**Steps:**
1. Toggle any switch (e.g., "Auto-generate Admission Numbers")
2. Change text field (e.g., "Admission Number Prefix" to "ADM")
3. Change number field (e.g., "Start Numbering From" to 2000)
4. Change dropdown (e.g., "Default Student Status" to "Pending")

**Expected Result:**
- Yellow warning alert appears: "You have unsaved changes"
- "Save Settings" button becomes enabled
- Changes are reflected in the UI immediately

### 3. Save Settings
**Steps:**
1. Make some changes (as in Test 2)
2. Click "Save Settings" button
3. Wait for response

**Expected Result:**
- Button shows "Saving..." text
- Success toast appears: "Settings saved successfully"
- Warning alert disappears
- "Save Settings" button becomes disabled
- Network tab shows PUT request to `/api/v1/settings/students.settings`

### 4. Reset to Defaults
**Steps:**
1. Make some changes
2. Click "Reset to Defaults" button

**Expected Result:**
- All fields reset to default values
- Info toast appears: "Settings reset to defaults"
- Warning alert appears (unsaved changes)
- "Save Settings" button is enabled

### 5. Persistence Test
**Steps:**
1. Make changes and save
2. Navigate away from Settings tab
3. Navigate back to Settings tab
4. Refresh the page
5. Navigate back to Settings tab

**Expected Result:**
- Settings persist across tab switches
- Settings persist across page refreshes
- Saved values are loaded from backend

### 6. Multiple Settings Categories
Verify all setting categories work:

#### Admission Settings
- ✓ Auto-generate Admission Numbers (toggle)
- ✓ Admission Number Prefix (text)
- ✓ Start Numbering From (number)
- ✓ Require Admission Approval (toggle)

#### ID Card Settings
- ✓ Include Photo on ID Card (toggle)
- ✓ Include Barcode/QR Code on ID Card (toggle)
- ✓ ID Card Validity (Years) (number, 1-10)

#### Academic Settings
- ✓ Default Student Status (dropdown: active/inactive/pending)
- ✓ Allow Multiple Simultaneous Enrollments (toggle)
- ✓ Track Student History (toggle)

#### Portal Access Settings
- ✓ Enable Student Portal Access (toggle)
- ✓ Enable Parent Portal Access (toggle)
- ✓ Send Login Credentials on Creation (toggle)

#### Fee Settings
- ✓ Default Fee Category (dropdown: general/day_scholar/boarding/scholarship)
- ✓ Require Fee Clearance for Promotion (toggle)

#### Advanced Features
- ✓ Enable RFID/NFC Tracking (toggle)
- ✓ Enable Biometric Attendance (toggle)
- ✓ Require Vaccination Records (toggle)

### 7. Error Handling
**Steps:**
1. Stop the backend server
2. Try to save settings

**Expected Result:**
- Error toast appears: "Failed to save settings"
- Settings remain in unsaved state
- User can retry after backend is back online

## API Endpoints Used

### GET /api/v1/settings/students.settings
**Purpose:** Load student settings
**Response:** 
```json
{
  "id": "uuid",
  "school_id": "uuid",
  "key": "students.settings",
  "value": "{\"auto_generate_admission_no\":true,...}"
}
```

### PUT /api/v1/settings/students.settings
**Purpose:** Save student settings
**Request Body:**
```json
{
  "value": "{\"auto_generate_admission_no\":true,...}"
}
```
**Response:** Same as GET

## Settings Data Structure

The settings are stored as a JSON string in the `value` field:

```typescript
{
  auto_generate_admission_no: boolean;
  admission_no_prefix: string;
  admission_no_start_from: number;
  require_admission_approval: boolean;
  include_photo_on_id_card: boolean;
  include_barcode_on_id_card: boolean;
  id_card_validity_years: number;
  default_student_status: string;
  allow_multiple_enrollments: boolean;
  track_student_history: boolean;
  enable_student_portal: boolean;
  enable_parent_portal: boolean;
  send_credentials_on_creation: boolean;
  default_fee_category: string;
  require_fee_clearance_for_promotion: boolean;
  enable_rfid_tracking: boolean;
  enable_biometric_attendance: boolean;
  require_vaccination_records: boolean;
}
```

## Verification Checklist

- [ ] Backend server is running on port 8000
- [ ] Frontend server is running on port 3000
- [ ] Database migrations are up to date
- [ ] User is logged in with appropriate permissions
- [ ] Settings tab loads without errors
- [ ] All toggle switches work
- [ ] All text fields work
- [ ] All number fields work
- [ ] All dropdowns work
- [ ] Save button works and persists data
- [ ] Reset button works
- [ ] Settings persist across page refreshes
- [ ] Loading state displays correctly
- [ ] Success/error toasts display correctly
- [ ] Unsaved changes warning displays correctly

## Notes

- Settings are school-specific (isolated by `school_id`)
- Settings require `settings:read` permission to view
- Settings require `settings:write` permission to modify
- Default values are used if no settings exist in database
- All settings are stored as a single JSON object for efficiency
