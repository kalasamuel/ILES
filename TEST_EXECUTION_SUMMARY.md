# ILES Project - Unit Test Execution Summary

## Backend Unit Tests (Django Test Runner)

### Test Execution Command
```bash
cd backend
python manage.py test --verbosity=2
```

### Test Environment Setup
- **Database**: PostgreSQL (test_postgres)
- **Django Version**: 5.2.7
- **Python**: 3.x
- **Total Tests Found**: 33
- **Execution Time**: 123.887 seconds (~2 minutes)

### Test Execution Output
```
Creating test database for alias 'default' ('test_postgres')...
Found 33 test(s).
Operations to perform:
  Synchronize unmigrated apps: corsheaders, messages, rest_framework, rest_framework_simplejwt, simple_history, staticfiles
  Apply all migrations: accounts, admin, auth, contenttypes, dashboards, evaluations, logbooks, notifications, organizations, placements, reviews, sessions
```

### Database Migrations Applied
✓ Organizations (0001_initial)
✓ ContentTypes (0001_initial, 0002_remove_content_type_name)
✓ Auth (0001-0012 - 12 migrations)
✓ Accounts (0001-0011 - 11 migrations)
✓ Admin (0001-0003 - 3 migrations)
✓ Dashboards (0001-0002 - 2 migrations)
✓ Placements (0001-0002 - 2 migrations)
✓ Evaluations (0001_initial)
✓ Logbooks (0001-0004 - 4 migrations)
✓ Reviews (0001_initial)
✓ Notifications (0001-0008 - 8 migrations)
✓ Sessions (0001_initial)

### Test Results Summary

**Total: 33 tests**
- ✓ **Passed**: 29 tests
- ✗ **Failed**: 2 tests
- ⚠ **Errors**: 2 errors

**Exit Code**: 1 (indicates failures/errors)

### Passed Tests (29/33) ✓

**Accounts Tests (15 tests)**
- ✓ test_login_sends_email_and_creates_notification
- ✓ test_forgot_password_sends_reset_link
- ✓ test_reset_password_changes_password_and_invalidates_token
- ✓ test_reset_password_rejects_invalid_token
- ✓ test_send_institution_verification_code_requires_email
- ✓ test_student_registration_requires_institution
- ✓ test_verify_institution_verification_code_endpoint_confirms_valid_code
- ✓ test_change_password_validates_and_updates_password
- ✓ test_me_settings_get_creates_default_settings
- ✓ test_profile_picture_rejects_file_larger_than_5mb
- ✓ test_profile_picture_rejects_too_small_dimensions
- ✓ test_profile_picture_upload_and_remove
- ✓ test_profile_update_persists_profile_fields
- ✓ test_profile_update_rejects_duplicate_email
- ✓ test_settings_update_persists_notification_and_privacy_preferences

**Accounts Assignment Tests (1 test)**
- ✓ test_non_admin_cannot_bulk_assign

**Logbook Tests (5 tests)**
- ✓ test_admin_can_view_all_reports
- ✓ test_student_can_upload_report
- ✓ test_student_cannot_upload_for_others
- ✓ test_supervisor_can_view_assigned_report
- ✓ test_schedule_defers_submission_until_management_command_runs
- ✓ test_submit_creates_student_confirmation_and_supervisor_emails

**Notifications Tests (6 tests)**
- ✓ test_email_not_sent_when_email_notifications_disabled
- ✓ test_email_not_sent_when_log_reminders_disabled_for_deadline_type
- ✓ test_email_not_sent_when_notification_updated
- ✓ test_email_not_sent_when_review_alerts_disabled_for_review_types
- ✓ test_email_sent_when_notification_created
- ✓ test_login_alert_notification_does_not_send_email_from_signal

**Placements Tests (1 test)**
- ✓ test_locked_placement_rejects_student_updates_until_letter_deleted

### Failed Tests (2/33) ✗

#### 1. test_academic_registration_requires_valid_institution_verification_code
**Module**: accounts.tests.RegistrationAffiliationWorkflowTests
**Status**: FAIL
**Issue**: Test expects 'institution_verification_code' in error response, but got 'department_id' error instead
```
AssertionError: 'institution_verification_code' not found in 
{'department_id': [ErrorDetail(string='Department is required for academic supervisors.', code='invalid')]}
```

#### 2. test_student_registration_requires_institution_email_and_code
**Module**: accounts.tests.RegistrationAffiliationWorkflowTests
**Status**: FAIL
**Issue**: Test expects 'institution_email' in error response, but got 'course' error instead
```
AssertionError: 'institution_email' not found in 
{'course': [ErrorDetail(string='Course is required for students.', code='invalid')]}
```

### Errored Tests (2/33) ⚠

#### 1. test_admin_bulk_assign_supervisor
**Module**: accounts.tests_assignment.SupervisorAssignmentTests
**Status**: ERROR
**Issue**: FieldDoesNotExist - Student model no longer has 'academic_supervisor' field
```
django.core.exceptions.FieldDoesNotExist: Student has no field named 'academic_supervisor'
```
**Root Cause**: Migration removed 'academic_supervisor' field from Student model (migrations 0010_student_academic_supervisor.py, 0011_remove_student_academic_supervisor.py)

#### 2. test_student_can_submit_placement_with_letter_and_supervisor_email
**Module**: placements.tests.PlacementSubmissionWorkflowTests
**Status**: ERROR
**Issue**: AttributeError - Serializer still references removed 'academic_supervisor' field
```
AttributeError: 'Student' object has no attribute 'academic_supervisor'
```
**Location**: backend/placements/serializers.py, line 95
**Root Cause**: Code still tries to access student.academic_supervisor which was removed from model

---

## Frontend Unit Tests (Playwright E2E Tests)

### Test Execution Command
```bash
cd frontend/iles-frontend
npm run test:e2e
```

### Test Environment
- **Test Framework**: Playwright 1.45.0
- **Test Type**: End-to-End (E2E) Browser Tests
- **Browser Target**: Chromium (Headless)
- **Base URL**: http://localhost:5175

### Frontend Test File
- **Location**: frontend/iles-frontend/tests/notifications.spec.js
- **Test Count**: 1 test

### Test Details

#### Test: toggle notifications and verify backend persistence
**Type**: E2E Integration Test
**Purpose**: Verify that notification preferences can be toggled and persist in backend
**Steps**:
1. Log in via backend API to obtain JWT token
2. Set JWT token in localStorage
3. Navigate to Settings page
4. Toggle all notification preference checkboxes:
   - email_notifications
   - push_notifications
   - log_reminders
   - review_alerts
   - weekly_summary
5. Save preferences
6. Verify preferences persist in backend

### Frontend Test Infrastructure Notes
- **Config File**: playwright.config.js (ES module format)
- **Base URL**: http://localhost:5175 (Vite dev server)
- **Browser**: Chromium headless shell
- **Viewport**: 1280×800
- **Status**: Ready to execute (requires running frontend dev server on port 5175)

---

## Test Statistics Overview

### Backend Unit Tests
| Metric | Count |
|--------|-------|
| Total Tests | 33 |
| Passed | 29 (87.9%) |
| Failed | 2 (6.1%) |
| Errors | 2 (6.1%) |
| **Success Rate** | **87.9%** |
| Execution Time | 123.887s (~2 min) |

### Frontend E2E Tests
| Metric | Count |
|--------|-------|
| Total Tests | 1 |
| Test Files | 1 |
| Status | Ready |
| **Requires** | Frontend dev server on port 5175 |

---

## Issues Requiring Fix

### Backend Issues

#### Issue 1: Removed Field Still Referenced
**Severity**: HIGH (blocking 2 tests)
**Files Affected**:
- backend/placements/serializers.py (line 95)
- backend/accounts/tests_assignment.py (line 71)
- backend/placements/tests.py (line 80)

**Fix Required**: Remove all references to removed `academic_supervisor` field from Student model

#### Issue 2: Test Assertions Out of Sync
**Severity**: MEDIUM (tests need updating)
**Files Affected**:
- backend/accounts/tests.py (lines 358, 387)

**Fix Required**: Update test assertions to match new field requirement order (department_id and course checked before institution fields)

---

## Recommended Actions

1. **Fix Backend Tests**:
   - Remove `student.academic_supervisor` reference from placements/serializers.py line 95
   - Update test assertions in accounts/tests.py to expect correct field validation order
   - Ensure test data includes required fields in proper order

2. **Run Frontend Tests**:
   - Start frontend dev server: `npm run dev` (port 5173)
   - Run test: `npm run test:e2e`
   - Consider adding more unit tests with Jest/React Testing Library for component testing

3. **Test Coverage Improvements**:
   - Add component unit tests (Jest) for React components
   - Increase test coverage for critical paths
   - Add integration tests for API workflows

---

## How to Execute Tests

### Backend Tests
```bash
cd backend
python manage.py test --verbosity=2
# Or specific app
python manage.py test accounts --verbosity=2
```

### Frontend E2E Tests
```bash
# Terminal 1: Start frontend dev server
cd frontend/iles-frontend
npm run dev

# Terminal 2: Run tests
npm run test:e2e
```

### Test with HTML Report (Playwright)
```bash
npm run test:e2e -- --reporter=html
# Opens test-results/index.html
```

---

## Test Execution Timestamp
- **Date**: 2026-06-16
- **Backend Test Execution**: ~2 minutes
- **Total Setup + Migration Time**: ~2-3 minutes
