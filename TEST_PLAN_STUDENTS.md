# Students Page Test Plan - http://localhost:3000/students

## Test Environment
- **URL**: http://localhost:3000/students
- **Date**: 2026-01-24
- **Status**: Running in Docker

---

## ✅ **1. Layout & Navigation Tests**

### 1.1 Sidebar Navigation
- [ ] Verify sidebar appears on desktop (260px width)
- [ ] Verify sidebar has proper styling with white background
- [ ] Check all 4 tabs are visible:
  - [ ] Student Directory (People icon)
  - [ ] Admissions (PersonAdd icon)
  - [ ] Reports (Assessment icon)
  - [ ] Settings (Settings icon)
- [ ] Verify active tab is highlighted with primary color
- [ ] Verify inactive tabs have proper hover effect
- [ ] Click each tab and verify content changes

### 1.2 Mobile Responsiveness
- [ ] Resize browser to mobile size (< 960px)
- [ ] Verify sidebar becomes a drawer (hidden by default)
- [ ] Verify hamburger menu icon appears in header
- [ ] Click hamburger menu and verify drawer opens
- [ ] Select a tab and verify drawer closes automatically
- [ ] Verify mobile drawer overlay works correctly

### 1.3 Header Section
- [ ] Verify header shows correct title based on active tab
- [ ] Verify breadcrumb shows: "Home / Students / [Active Tab]"
- [ ] Verify header has bottom border (#E5E7EB)
- [ ] Verify header actions area (if any) displays correctly

### 1.4 Content Area
- [ ] Verify content background is #F7F8FA
- [ ] Verify content has proper padding (24px)
- [ ] Verify content area scrolls independently

---

## ✅ **2. Student Directory Tab Tests**

### 2.1 Initial Load
- [ ] Verify page loads without errors
- [ ] Verify student list appears
- [ ] Check loading spinner shows during data fetch
- [ ] Verify "Student Directory" header displays
- [ ] Check statistics/counters show (Active/Inactive counts)

### 2.2 Student Table
- [ ] Verify table columns:
  - [ ] Photo
  - [ ] Name
  - [ ] Admission No
  - [ ] Class/Section
  - [ ] Gender
  - [ ] Status
  - [ ] Actions
- [ ] Verify table rows display student data correctly
- [ ] Check status chips have correct colors:
  - [ ] Active → Green (success)
  - [ ] Inactive → Grey (default)
  - [ ] Suspended → Orange (warning)
  - [ ] Alumni → Blue (info)
- [ ] Verify student photos display or show placeholder

### 2.3 Search & Filters
- [ ] **Search Box**:
  - [ ] Type in search box and verify filtering works
  - [ ] Test search by first name
  - [ ] Test search by last name
  - [ ] Test search by admission number
  - [ ] Verify search is debounced/responsive
  
- [ ] **Status Filter**:
  - [ ] Select "Active" and verify only active students show
  - [ ] Select "Inactive" and verify only inactive students show
  - [ ] Clear filter and verify all students show
  
- [ ] **Gender Filter**:
  - [ ] Select "Male" and verify filtering
  - [ ] Select "Female" and verify filtering
  - [ ] Clear filter
  
- [ ] **Class Filter**:
  - [ ] Select a class and verify filtering
  - [ ] Verify section filter appears/updates based on class
  
- [ ] **Section Filter**:
  - [ ] Select a section and verify filtering
  - [ ] Verify section filter only shows sections for selected class

### 2.4 Pagination
- [ ] Verify pagination controls at bottom of table
- [ ] Verify rows per page selector (20, 50, 100)
- [ ] Change rows per page and verify table updates
- [ ] Navigate to next page and verify new students load
- [ ] Navigate to previous page
- [ ] Verify total count is accurate

### 2.5 Action Buttons
- [ ] **Add Student Button**:
  - [ ] Verify "Add Student" button is visible
  - [ ] Click button and verify dialog opens
  
- [ ] **Refresh Button**:
  - [ ] Click refresh and verify data reloads
  - [ ] Check loading indicator appears
  
- [ ] **Export CSV Button**:
  - [ ] Click export and verify CSV downloads
  - [ ] Open CSV and verify data format
  
- [ ] **Import CSV Button**:
  - [ ] Click import button
  - [ ] Select a CSV file
  - [ ] Verify import process completes
  - [ ] Check success/error messages

### 2.6 Row Actions (Three-dot menu)
- [ ] Click three-dot menu on a student row
- [ ] Verify menu options:
  - [ ] View Details
  - [ ] Edit
  - [ ] Download ID Card
  - [ ] Deactivate/Activate
  - [ ] Delete
- [ ] Test each action:
  - [ ] **View Details**: Opens drawer with student info
  - [ ] **Edit**: Opens edit dialog
  - [ ] **Download ID Card**: Downloads PDF
  - [ ] **Deactivate**: Changes status (with confirmation)
  - [ ] **Delete**: Deletes student (with confirmation)

---

## ✅ **3. Create Student Dialog Tests**

### 3.1 Dialog Opening
- [ ] Click "Add Student" button
- [ ] Verify dialog opens with proper animation
- [ ] Verify dialog title is "Add New Student"
- [ ] Verify dialog has tabs:
  - [ ] Student Information
  - [ ] Academic
  - [ ] Parent/Guardian
  - [ ] Documents

### 3.2 Student Information Tab
- [ ] **Required Fields**:
  - [ ] First Name (required) - verify validation
  - [ ] Last Name
  - [ ] Admission Number
  - [ ] Gender dropdown (Male/Female/Other)
  - [ ] Date of Birth (date picker)
  
- [ ] **Personal Info**:
  - [ ] Full Name (BC)
  - [ ] Place of Birth
  - [ ] Nationality
  - [ ] Religion
  - [ ] Blood Group
  
- [ ] **Contact Info**:
  - [ ] Present Address
  - [ ] Permanent Address
  - [ ] City
  - [ ] Thana
  - [ ] Postal Code
  
- [ ] **Medical Info**:
  - [ ] Known Allergies
  - [ ] Chronic Illness
  - [ ] Physical Disabilities
  - [ ] Doctor Name & Phone
  
- [ ] **Other Fields**:
  - [ ] Emergency Contact
  - [ ] RFID/NFC Number
  - [ ] Portal Access checkboxes

### 3.3 Academic Tab
- [ ] **Enrollment Fields**:
  - [ ] Class dropdown (required) - verify populated with active classes
  - [ ] Section dropdown - verify shows sections for selected class
  - [ ] Roll Number
  
- [ ] **Academic Info**:
  - [ ] Admission Date (date picker)
  - [ ] Admission Status dropdown
  - [ ] Medium (English/Bengali/etc.)
  - [ ] Shift (Morning/Day/Evening)
  
- [ ] **Previous School**:
  - [ ] Previous School Name
  - [ ] Previous Class
  - [ ] Transfer Certificate No
  
- [ ] **Financial**:
  - [ ] Fee Category
  - [ ] Scholarship Type

### 3.4 Parent/Guardian Tab
- [ ] **Father Information**:
  - [ ] Full Name
  - [ ] Occupation
  - [ ] Phone
  - [ ] Email
  - [ ] ID Number
  - [ ] Photo upload (verify file selection)
  
- [ ] **Mother Information**:
  - [ ] Full Name
  - [ ] Occupation
  - [ ] Phone
  - [ ] Email
  - [ ] ID Number
  - [ ] Photo upload
  
- [ ] **Guardian Information**:
  - [ ] Full Name
  - [ ] Relation dropdown
  - [ ] Phone
  - [ ] Email
  - [ ] Occupation
  - [ ] Address
  - [ ] Photo upload

### 3.5 Documents Tab
- [ ] Student Photo upload
- [ ] Previous TC upload
- [ ] Verify file selection UI works
- [ ] Verify file preview (if applicable)

### 3.6 Form Validation & Submission
- [ ] Try to save without first name - verify error
- [ ] Try to save without class - verify error
- [ ] Fill required fields and click "Save"
- [ ] Verify loading indicator during save
- [ ] Verify success toast message
- [ ] Verify dialog closes after save
- [ ] Verify new student appears in table
- [ ] **Cancel button**: Click and verify dialog closes without saving

---

## ✅ **4. Edit Student Dialog Tests**

### 4.1 Opening Edit Dialog
- [ ] Click "Edit" from row actions menu
- [ ] Verify dialog opens with "Edit Student" title
- [ ] Verify all tabs are present
- [ ] Verify loading indicator while fetching data
- [ ] Verify form fields are pre-filled with student data

### 4.2 Edit Functionality
- [ ] Modify first name and save
- [ ] Verify changes appear in table
- [ ] Edit academic information (class/section)
- [ ] Verify enrollment updates correctly
- [ ] Upload new student photo
- [ ] Verify photo updates
- [ ] Test validation on edit (empty required fields)

---

## ✅ **5. Student Details Drawer Tests**

### 5.1 Opening Drawer
- [ ] Click "View Details" from row actions
- [ ] OR click on a student row
- [ ] Verify drawer slides in from right
- [ ] Verify drawer shows student photo and basic info
- [ ] Check loading indicator during initial load

### 5.2 Overview Tab
- [ ] Verify student photo displays
- [ ] Check all personal information fields display:
  - [ ] Name, Admission No, Gender, DOB
  - [ ] Address, Contact info
  - [ ] Status chip with correct color
- [ ] Verify enrollment info shows:
  - [ ] Current class/section
  - [ ] Roll number
  - [ ] Academic year
- [ ] Check parent/guardian information displays

### 5.3 Attendance Tab
- [ ] Click "Attendance" tab
- [ ] Verify attendance summary loads (30-day period)
- [ ] Check statistics display:
  - [ ] Total days
  - [ ] Present days
  - [ ] Absent days
  - [ ] Attendance percentage
- [ ] Verify attendance records table shows:
  - [ ] Date
  - [ ] Status (Present/Absent/Late)
  - [ ] Remarks
- [ ] Verify proper formatting and colors

### 5.4 Fees Tab
- [ ] Click "Fees" tab
- [ ] **Fee Dues Section**:
  - [ ] Verify fee dues table displays
  - [ ] Check columns: Fee Type, Amount, Due Date, Status
  - [ ] Verify pending/paid status colors
  
- [ ] **Fee Payments Section**:
  - [ ] Verify payment history table displays
  - [ ] Check columns: Date, Amount, Method, Receipt No
  - [ ] Verify total  paid amount calculation

### 5.5 Timetable Tab
- [ ] Click "Timetable" tab
- [ ] Verify weekly timetable loads
- [ ] Verify timetable grid shows:
  - [ ] Days (Mon-Sun)
  - [ ] Time slots
  - [ ] Subject names
  - [ ] Teacher names
- [ ] Check proper formatting and colors
- [ ] Verify responsive layout

### 5.6 Drawer Interactions
- [ ] Verify drawer can be closed by:
  - [ ] Clicking close icon
  - [ ] Clicking outside drawer
  - [ ] Pressing ESC key
- [ ] Verify smooth transition on close
- [ ] Open drawer for different students and verify data updates

---

## ✅ **6. ID Card Generation Test**

- [ ] Click "Download ID Card" from row actions
- [ ] Verify PDF generation starts (loading indicator)
- [ ] Verify PDF downloads successfully
- [ ] Open PDF and verify:
  - [ ] Student photo
  - [ ] Name, Class, Roll Number
  - [ ] School name/logo
  - [ ] Barcode/QR code (if applicable)
  - [ ] Proper formatting and layout

---

## ✅ **7. Student Import/Export Tests**

### 7.1 Export CSV
- [ ] Click "Export CSV" button
- [ ] Verify file downloads with proper name
- [ ] Open CSV and verify:
  - [ ] All columns are present
  - [ ] Data is properly formatted
  - [ ] Special characters handled correctly
  - [ ] Date format is consistent

### 7.2 Import CSV
- [ ] Prepare a valid CSV file with student data
- [ ] Click "Import CSV" button
- [ ] Select the CSV file
- [ ] Verify upload progress indicator
- [ ] Check success message
- [ ] Verify imported students appear in table
- [ ] **Error Handling**:
  - [ ] Try importing invalid CSV format
  - [ ] Try importing with missing required fields
  - [ ] Verify error messages are clear

---

## ✅ **8. Admissions Tab Tests**

- [ ] Click "Admissions" tab in sidebar
- [ ] Verify placeholder content shows:
  - [ ] "Admissions Management" title
  - [ ] Description text
  - [ ] "Under development" message
- [ ] Verify proper styling (Paper component with padding)

---

## ✅ **9. Reports Tab Tests**

- [ ] Click "Reports" tab in sidebar
- [ ] Verify placeholder content shows:
  - [ ] "Student Reports" title
  - [ ] Description text
  - [ ] "Under development" message
- [ ] Verify proper styling

---

## ✅ **10. Settings Tab Tests**

- [ ] Click "Settings" tab in sidebar
- [ ] Verify placeholder content shows:
  - [ ] "Student Settings" title
  - [ ] Description text
  - [ ] "Under development" message
- [ ] Verify proper styling

---

## ✅ **11. Error Handling Tests**

### 11.1 Network Errors
- [ ] Simulate network failure (disconnect/500 error)
- [ ] Verify error toast appears with meaningful message
- [ ] Verify loading state ends properly
- [ ] Verify page doesn't crash

### 11.2 API Errors
- [ ] Test with invalid student ID
- [ ] Test with unauthorized access (if applicable)
- [ ] Verify error messages display correctly
- [ ] Verify graceful degradation

### 11.3 Validation Errors
- [ ] Submit form with invalid email format
- [ ] Submit with invalid phone number
- [ ] Submit with invalid date
- [ ] Verify inline validation messages

---

## ✅ **12. Performance Tests**

- [ ] Load page with 100+ students
- [ ] Verify table renders within acceptable time
- [ ] Test pagination performance
- [ ] Test search/filter performance
- [ ] Verify smooth scrolling
- [ ] Check for memory leaks (drawer open/close multiple times)
- [ ] Verify no unnecessary re-renders

---

## ✅ **13. Accessibility Tests**

- [ ] **Keyboard Navigation**:
  - [ ] Tab through all interactive elements
  - [ ] Press Enter on focused buttons
  - [ ] Navigate table with arrow keys
  - [ ] Close dialog with ESC key
  
- [ ] **Screen Reader**:
  - [ ] Verify labels are properly associated
  - [ ] Check ARIA attributes
  - [ ] Verify focus management
  
- [ ] **Color Contrast**:
  - [ ] Verify text has sufficient contrast
  - [ ] Check status chips are distinguishable

---

## ✅ **14. Visual Design Tests**

### 14.1 Golden Ratio & Spacing
- [ ] Verify consistent spacing using golden ratio principles
- [ ] Check margins and padding are proportional
- [ ] Verify visual hierarchy is clear

### 14.2 Typography
- [ ] Verify font weights are appropriate (400, 500, 700)
- [ ] Check heading sizes follow hierarchy
- [ ] Verify line heights and letter spacing

### 14.3 Colors & Theme
- [ ] Verify primary color usage is consistent
- [ ] Check border colors (#E5E7EB) are consistent
- [ ] Verify background colors:
  - [ ] White (#FFFFFF) for cards
  - [ ] Light grey (#F7F8FA) for background
- [ ] Check hover states have visible feedback

### 14.4 Professional Layout
- [ ] Verify layout looks polished and professional
- [ ] Check alignment is pixel-perfect
- [ ] Verify no UI glitches or overlaps
- [ ] Check responsive breakpoints work smoothly

---

## ✅ **15. Browser Compatibility Tests**

- [ ] Test in Chrome (latest)
- [ ] Test in Firefox (latest)
- [ ] Test in Safari (if available)
- [ ] Test in Edge (latest)
- [ ] Verify consistent behavior across browsers

---

## ✅ **16. Integration Tests**

- [ ] Create student → Verify appears in directory
- [ ] Edit student → Verify changes persist
- [ ] Delete student → Verify removed from directory
- [ ] Filter by class → Create student in that class → Verify appears in filtered view
- [ ] Export → Edit via CSV → Import → Verify changes applied

---

## 🎯 **Priority Test Checklist (Quick Smoke Test)**

If time is limited, test these critical paths:

1. [ ] Page loads without errors
2. [ ] Student table displays with data
3. [ ] Search functionality works
4. [ ] Create new student (full flow)
5. [ ] Edit existing student
6. [ ] View student details drawer
7. [ ] Delete student (with confirmation)
8. [ ] Export CSV
9. [ ] Mobile responsive sidebar
10. [ ] All tabs switch correctly

---

## 📝 **Test Results Documentation**

### Date: _______________
### Tester: _______________
### Environment: Docker - http://localhost:3000/students

| Test Section | Status | Notes |
|-------------|--------|-------|
| Layout & Navigation | ☐ Pass ☐ Fail | |
| Student Directory | ☐ Pass ☐ Fail | |
| Create Student | ☐ Pass ☐ Fail | |
| Edit Student | ☐ Pass ☐ Fail | |
| Student Drawer | ☐ Pass ☐ Fail | |
| ID Card | ☐ Pass ☐ Fail | |
| Import/Export | ☐ Pass ☐ Fail | |
| Other Tabs | ☐ Pass ☐ Fail | |
| Performance | ☐ Pass ☐ Fail | |
| Responsiveness | ☐ Pass ☐ Fail | |

### Issues Found:
1. 
2. 
3. 

### Overall Status: ☐ All Tests Passed ☐ Issues Found

---

## 🔄 **Automated Test Script** (Manual Browser Testing)

Use this step-by-step guide for thorough manual testing:

1. **Open**: http://localhost:3000/students
2. **Verify**: Page loads, sidebar visible, "Student Directory" active
3. **Search**: Type "test" in search box → verify filtering
4. **Filter**: Select a status → verify filtering  → clear filter
5. **Pagination**: Change rows per page → navigate pages
6. **Create**: Click "Add Student" → fill form → save → verify success
7. **Edit**: Click ⋮ on student → Edit → modify → save → verify changes
8. **View**: Click ⋮ → View Details → check all tabs → close drawer
9. **Export**: Click Export CSV → verify download
10. **Delete**: Click ⋮ → Delete → confirm → verify removal
11. **Mobile**: Resize to 500px → verify hamburger menu → test drawer
12. **Tabs**: Click each sidebar tab → verify content changes

---

## ✨ **Expected Quality Standards**

This students page should meet these criteria:

✅ **Functionality**: All CRUD operations work flawlessly  
✅ **Performance**: Page loads under 2 seconds, interactions are instant  
✅ **Responsive**: Works perfectly on mobile, tablet, and desktop  
✅ **Professional**: Layout uses golden ratio, looks polished  
✅ **User-Friendly**: Intuitive navigation, clear feedback, helpful validations  
✅ **Error Handling**: Graceful errors with clear messages  
✅ **Accessibility**: Keyboard navigable, screen reader friendly  

---

**Test Plan Version**: 1.0  
**Last Updated**: 2026-01-24  
**Status**: Ready for Testing ✅
