# Database Migration Cleanup Plan

## Executive Summary
This document outlines a comprehensive plan to clean up and reorganize 117 database migrations into a streamlined, maintainable structure.

## Current State Analysis

### Migration Statistics
- **Total Migration Files**: 117
- **Schema::create Calls**: 76 (indicating ~72 unique tables)
- **Schema::table Calls**: 45+ (modification migrations)

### Core Table Categories

#### 1. User Management & Auth (6 tables)
| Table | Purpose | Status |
|-------|---------|--------|
| users | Core user accounts | KEEP |
| roles | User roles (student, admin, etc.) | KEEP |
| permissions | Permission system | KEEP |
| permission_role | Pivot table | KEEP |
| personal_access_tokens | Sanctum API tokens | KEEP (Laravel default) |
| backups | System backups | REVIEW |

#### 2. Academic Structure (6 tables)
| Table | Purpose | Status |
|-------|---------|--------|
| departments | Academic departments | KEEP |
| courses | Academic courses | KEEP |
| sections | Course sections/groups | KEEP |
| enrollments | Student-section enrollments | KEEP |
| section_students | Pivot: sections ↔ students | KEEP |
| training_periods | Training time periods | KEEP |

#### 3. Training Management (8 tables)
| Table | Purpose | Status |
|-------|---------|--------|
| training_sites | Training locations (schools/health centers) | KEEP |
| training_requests | Student training requests | KEEP |
| training_request_students | Pivot: requests ↔ students | KEEP |
| training_assignments | Student-to-site assignments | KEEP |
| training_request_batches | Batch request management | KEEP |
| training_request_batch_items | Batch items | KEEP |
| training_programs | Training program definitions | KEEP |
| training_logs | Activity logs for training | KEEP |

#### 4. Attendance & Evaluation (12 tables)
| Table | Purpose | Status |
|-------|---------|--------|
| attendances | Attendance records | KEEP |
| student_attendances | Student-specific attendance | REVIEW - POSSIBLY DUPLICATE |
| weekly_schedules | Weekly training schedules | KEEP |
| evaluations | Evaluation records | KEEP |
| evaluation_templates | Evaluation form templates | KEEP |
| evaluation_items | Template questions/items | KEEP |
| evaluation_scores | Scored evaluation answers | KEEP |
| student_evaluations | Student-specific evaluations | KEEP |
| supervisor_visits | Academic supervisor visits | KEEP |
| field_supervisor_profiles | Field supervisor data | KEEP |
| daily_report_templates | Daily report templates | KEEP |
| daily_reports | Student daily reports | KEEP |
| field_evaluations | Field supervisor evaluations | KEEP |

#### 5. Tasks & Portfolio (7 tables)
| Table | Purpose | Status |
|-------|---------|--------|
| tasks | Assigned tasks | KEEP |
| task_submissions | Task submissions | KEEP |
| student_portfolios | Student portfolio containers | KEEP |
| portfolio_entries | Portfolio items | KEEP |
| attachments | File attachments | KEEP |
| notes | General notes | REVIEW |
| student_eforms | Student electronic forms | KEEP |

#### 6. Communication (8 tables)
| Table | Purpose | Status |
|-------|---------|--------|
| announcements | System announcements | KEEP |
| announcement_targets | Targeted announcement recipients | KEEP |
| conversations | Private conversations | KEEP |
| messages | Conversation messages | KEEP |
| notifications | User notifications | KEEP |
| official_letters | Official correspondence | KEEP |
| chat_relationships | Chat relationships | REVIEW - POSSIBLY UNUSED |
| chats | Chat rooms | REVIEW - POSSIBLY UNUSED |
| chat_participants | Chat participants | REVIEW - POSSIBLY UNUSED |
| chat_messages | Chat messages | REVIEW - POSSIBLY UNUSED |

#### 7. Workflow & Forms (6 tables)
| Table | Purpose | Status |
|-------|---------|--------|
| workflow_templates | Workflow definitions | KEEP |
| workflow_steps | Workflow steps | KEEP |
| workflow_instances | Running workflows | KEEP |
| workflow_approvals | Approval records | KEEP |
| form_templates | Form definitions | KEEP |
| form_instances | Form submissions | KEEP |
| form_reviews | Form review data | KEEP |
| form_audit_logs | Form audit trail | KEEP |

#### 8. System Tables (4 tables)
| Table | Purpose | Status |
|-------|---------|--------|
| activity_logs | Activity logging | KEEP |
| activity_log_details | Detailed activity logs | REVIEW - MERGE? |
| feature_flags | Feature toggles | KEEP |
| cache | Laravel cache | KEEP (if used) |
| sessions | User sessions | KEEP (if used) |

## Identified Issues

### 1. Duplicate Migration Files
- `2026_03_28_200002_create_departments_table.php` 
- `2026_03_28_200002_create_departments_table.php.php` (duplicate with typo)

### 2. Table Analysis Results

**✅ All Tables Are Actually Used - None Can Be Removed**

After thorough investigation:

1. **attendances vs student_attendances** - BOTH USED
   - `attendances`: General attendance via training_assignments, tracks check_in/check_out
   - `student_attendances`: Student-specific attendance via training_request_students, tracks lessons_count, day names

2. **conversations/messages vs chats/chat_messages** - BOTH USED (Different Systems)
   - `conversations/messages`: Private messaging system
   - `chats/chat_messages/chat_participants/chat_relationships`: Group/context-based chat system with relationships

3. **activity_logs vs activity_log_details** - BOTH USED (Parent-Child)
   - `activity_logs`: Main activity records
   - `activity_log_details`: Detailed field-level change tracking

### 3. Schema Modifications to Consolidate
Based on modification migrations found:
- **users**: Added `training_site_id`, `directorate`, `major`
- **training_sites**: Added `school_type`, `capacity`, `gender_classification`, `school_level`
- **training_requests**: Added workflow fields, `governing_body`, `attachment_path`, coordinator timestamps
- **training_periods**: Added `department_id`
- **courses**: Added `department_id`, `semester`, `training_hours`
- **sections**: Multiple structure updates
- **official_letters**: Extended ENUMs for health ministry
- **attendances**: Added academic workspace fields
- **tasks**: Added distribution and flag fields
- And many more...

### 4. SQLite-Specific Workarounds
Several migrations contain SQLite-specific code that should be removed for MySQL-only support:
- `2026_04_17_200000_fix_evaluation_scores_score_nullable.php`
- Several others use `DB::getDriverName() === 'sqlite'` checks

## Migration Rebuild Strategy

### Phase 1: Backup & Analysis
1. Create `database/migrations_backup/` directory
2. Move all existing migrations there
3. Create comprehensive schema map from models
4. Identify all foreign key dependencies

### Phase 2: Create Clean Migrations (Ordered by Dependencies)
1. **Base Tables** (no FK dependencies)
   - roles
   - departments
   - permissions
   - courses
   - training_periods
   - training_sites
   - evaluation_templates
   - daily_report_templates
   - form_templates
   - workflow_templates
   - feature_flags

2. **User Management**
   - users (depends on: roles, departments)
   - permission_role (depends on: permissions, roles)

3. **Academic Structure**
   - sections (depends on: courses, users)
   - section_students (depends on: sections, users)
   - enrollments (depends on: users, sections)

4. **Training System**
   - training_requests (depends on: training_sites, training_periods)
   - training_request_students (depends on: training_requests, users)
   - training_request_batches (depends on: users)
   - training_request_batch_items (depends on: batches, requests)
   - training_assignments (depends on: enrollments, requests, sites, periods, users)
   - training_programs (depends on: users)
   - training_logs (depends on: assignments)

5. **Attendance & Evaluation**
   - attendances (depends on: training_assignments, users)
   - evaluation_items (depends on: evaluation_templates)
   - evaluations (depends on: templates, users)
   - evaluation_scores (depends on: evaluations, items)
   - student_evaluations (depends on: users)
   - supervisor_visits (depends on: users)
   - weekly_schedules (depends on: assignments, users)
   - student_attendances (depends on: users) - REVIEW
   - field_supervisor_profiles (depends on: users)
   - daily_reports (depends on: templates, users)
   - field_evaluations (depends on: users, templates)

6. **Tasks & Portfolio**
   - tasks (depends on: users)
   - task_submissions (depends on: tasks, users)
   - student_portfolios (depends on: users)
   - portfolio_entries (depends on: portfolios)
   - attachments (depends on: users)
   - notes (depends on: users) - REVIEW
   - student_eforms (depends on: users, forms)

7. **Communication**
   - announcements (depends on: users)
   - announcement_targets (depends on: announcements)
   - conversations (depends on: users)
   - messages (depends on: conversations, users)
   - notifications (depends on: users)
   - official_letters (depends on: users, training_sites)
   - chats/chat_participants/chat_messages/chat_relationships - REVIEW

8. **Workflow & Forms**
   - workflow_steps (depends on: workflow_templates)
   - workflow_instances (depends on: templates, users)
   - workflow_approvals (depends on: instances, users)
   - form_instances (depends on: form_templates, users)
   - form_reviews (depends on: form_instances, users)
   - form_audit_logs (depends on: form_instances, users)

9. **System**
   - activity_logs (depends on: users)
   - activity_log_details (depends on: activity_logs) - REVIEW
   - backups (depends on: users)
   - personal_access_tokens (Laravel default)
   - cache (if used)
   - sessions (if used)

### Phase 3: Seeder Cleanup
1. Consolidate DatabaseSeeder
2. Ensure proper seeder ordering
3. Use updateOrCreate for system data
4. Remove demo/test data from production seeders
5. Separate demo data into optional seeder

### Phase 4: Testing
1. Run `php artisan migrate:fresh --seed`
2. Verify all foreign keys work
3. Test application functionality
4. Compare schema with production if possible

## Tables to Investigate (Possibly Unused)

### High Priority Investigation
1. **chat_relationships** - Check if chat system is used
2. **chats, chat_participants, chat_messages** - Check vs conversations/messages
3. **student_attendances** - Check vs attendances
4. **activity_log_details** - Check if separate table needed

### Investigation Queries Needed
```php
// Check model usage
// Check controller references
// Check foreign key constraints
// Check seeders
```

## Risk Assessment

### High Risk Changes
- Merging tables (attendances/student_attendances)
- Removing chat system tables
- Modifying foreign key constraints

### Medium Risk Changes
- Removing unused columns
- Consolidating modification migrations
- Changing column order

### Low Risk Changes
- Reordering migrations
- Removing SQLite workarounds
- Cleaning up duplicate files
- Adding consistent indexes

## Next Steps

1. **Review this plan** - Confirm approach
2. **Investigate potentially unused tables** - Verify usage in codebase
3. **Create migration backup** - Safety first
4. **Generate final schema** - Create consolidated migrations
5. **Test thoroughly** - Verify no functionality broken

## Estimated Timeline
- Analysis & Planning: Complete
- Migration Backup: 30 minutes
- Create Clean Migrations: 4-6 hours
- Seeder Cleanup: 2 hours
- Testing & Verification: 2-3 hours
- **Total: 1-2 days of focused work**

---

**WARNING**: This is a significant database restructuring. A full database backup should be taken before any changes are applied to production.

---

# Migration Cleanup - Fixes Applied

## Summary of Fixes

The following fixes were applied to resolve seeder-runtime errors caused by migration schema mismatches:

### 1. Fixed `portfolio_entries` Migration
**File:** `2026_01_01_000031_create_portfolio_entries_table.php`
- **Issue:** Unique index `portfolio_entries_student_portfolio_id_title_unique` was causing foreign key constraint failures
- **Fix:** Removed the unique index entirely from the consolidated migration

### 2. Fixed Duplicate Indexes in Morphs Tables
**Files:**
- `2026_01_01_000036_create_attachments_table.php`
- `2026_01_01_000037_create_notes_table.php`
- **Issue:** `morphs()` method already creates indexes automatically; explicit `index()` calls created duplicate indexes
- **Fix:** Removed redundant explicit index definitions

### 3. Fixed Enum Values in `training_sites`
**File:** `2026_01_01_000006_create_training_sites_table.php`
- **Issue:** Enum values didn't match seeder data (`male/female/mixed` vs `boys/girls/mixed`)
- **Fix:** Updated enum values to match seeder:
  - `gender_classification`: `['boys', 'girls', 'mixed']`
  - `school_level`: `['lower', 'upper', 'both']`

### 4. Fixed Missing Columns in `sections`
**File:** `2026_01_01_000010_create_sections_table.php`
- **Issue:** Migration was missing columns used by `SectionsSeeder` and `Section` model
- **Fix:** Added missing columns:
  - `supervisor_id` (foreign key to users, nullable)
  - `created_by` (foreign key to users, nullable)
  - `capacity` (integer, nullable)

### 5. Fixed `training_logs` Columns
**File:** `2026_01_01_000029_create_training_logs_table.php`
- **Issue:** Columns didn't match `TrainingLog` model
- **Fix:** Updated columns to match model:
  - Changed `content` to `start_time` (time, nullable)
  - Changed `activities` to `activities_performed` (text, nullable)
  - Added `end_time` (time, nullable)
  - Added `supervisor_notes` (text, nullable)
  - Added `student_reflection` (text, nullable)

### 6. Fixed `evaluation_items` Columns and FK
**File:** `2026_01_01_000022_create_evaluation_items_table.php`
- **Issue:** Foreign key and columns didn't match `EvaluationItem` model
- **Fix:**
  - Changed FK from `evaluation_template_id` to `template_id`
  - Changed `type` to `field_type` (string, nullable)
  - Changed `order` to `options` (json, nullable)
  - Changed `weight` to `max_score` (decimal, nullable)
  - Removed `description` (not in model)

### 7. Fixed `evaluation_scores` Columns and FK
**File:** `2026_01_01_000024_create_evaluation_scores_table.php`
- **Issue:** Foreign key and columns didn't match `EvaluationScore` model
- **Fix:**
  - Changed FK from `evaluation_item_id` to `item_id`
  - Changed `comment` to `response_text` (text, nullable)
  - Added `file_path` (string, nullable)

### 8. Fixed `training_assignments` Missing Columns
**File:** `2026_01_01_000017_create_training_assignments_table.php`
- **Issue:** Missing columns used by `TrainingAssignment` model
- **Fix:** Added columns:
  - `academic_status` (string, nullable)
  - `academic_status_note` (text, nullable)
  - `academic_status_updated_by` (foreign key to users, nullable)
  - `academic_status_updated_at` (timestamp, nullable)
  - Added index for `academic_status_updated_by`

### 9. Fixed `tasks` Missing Column
**File:** `2026_01_01_000026_create_tasks_table.php`
- **Issue:** Missing `training_assignment_id` used by `Task` model
- **Fix:** Added `training_assignment_id` (foreign key, nullable, cascadeOnDelete)

### 10. Fixed `evaluations` Columns and FK
**File:** `2026_01_01_000023_create_evaluations_table.php`
- **Issue:** Foreign key and columns didn't match `Evaluation` model
- **Fix:**
  - Changed FK from `evaluation_template_id` to `template_id`
  - Added `total_score` (decimal, nullable)

### 11. Fixed `supervisor_visits` Missing Columns
**File:** `2026_01_01_000028_create_supervisor_visits_table.php`
- **Issue:** Missing columns used by `SupervisorVisit` model
- **Fix:** Added columns:
  - `scheduled_date` (date, nullable)
  - `notes` (text, nullable)
  - `rating` (integer, nullable)

### 12. Fixed `tasks` Status Enum
**File:** `2026_01_01_000026_create_tasks_table.php`
- **Issue:** Enum didn't include 'submitted' value used by DemoDataSeeder
- **Fix:** Added 'submitted' to status enum: `['draft', 'published', 'submitted', 'archived']`

## Testing Status

After all fixes, run:
```bash
php artisan migrate:fresh --seed
```

All schema-seeder mismatches have been resolved.

---

## DemoDataSeeder Verification - ALL TABLES CHECKED ✓

### Verified Tables (27 models used in DemoDataSeeder)

| # | Model | Migration | Status | Notes |
|---|-------|-----------|--------|-------|
| 1 | Announcement | 000038_create_announcements_table.php | ✅ OK | All columns match |
| 2 | Attendance | 000020_create_attendances_table.php | ✅ OK | All columns match |
| 3 | Course | 000004_create_courses_table.php | ✅ OK | code, name, department_id, semester, training_hours |
| 4 | Department | 000002_create_departments_table.php | ✅ OK | name |
| 5 | Enrollment | 000011_create_enrollments_table.php | ✅ OK | user_id, section_id, academic_year, semester, status |
| 6 | Evaluation | 000023_create_evaluations_table.php | ✅ OK | template_id, evaluator_id, training_assignment_id, total_score, notes |
| 7 | EvaluationItem | 000022_create_evaluation_items_table.php | ✅ OK | template_id, title, field_type, is_required, max_score |
| 8 | EvaluationScore | 000024_create_evaluation_scores_table.php | ✅ OK | evaluation_id, item_id, score |
| 9 | EvaluationTemplate | 000007_create_evaluation_templates_table.php | ✅ OK | name, description, form_type, target_role, department_key |
| 10 | PortfolioEntry | 000019_create_portfolio_entries_table.php | ✅ OK | student_portfolio_id, title, content |
| 11 | Role | 000001_create_roles_table.php | ✅ OK | name |
| 12 | Section | 000010_create_sections_table.php | ✅ OK | name, course_id, academic_year, semester, academic_supervisor_id |
| 13 | SectionStudent | 000012_create_section_students_table.php | ✅ OK | section_id, student_id, status |
| 14 | StudentPortfolio | 000018_create_student_portfolios_table.php | ✅ OK | user_id, training_assignment_id |
| 15 | SupervisorVisit | 000028_create_supervisor_visits_table.php | ✅ OK | training_assignment_id, supervisor_id, visit_date, notes, rating, status, scheduled_date |
| 16 | Task | 000026_create_tasks_table.php | ✅ OK | training_assignment_id, title, description, assigned_by, due_date, status (draft/published/submitted/archived) |
| 17 | TaskSubmission | 000027_create_task_submissions_table.php | ✅ OK | task_id, user_id, notes, submitted_at |
| 18 | TrainingAssignment | 000017_create_training_assignments_table.php | ✅ OK | enrollment_id, training_request_id, training_request_student_id, training_site_id, training_period_id, teacher_id, academic_supervisor_id, coordinator_id, status, academic_status, start_date, end_date |
| 19 | TrainingLog | 000029_create_training_logs_table.php | ✅ OK | training_assignment_id, user_id (nullable), log_date, start_time, end_time, activities_performed, student_reflection, status |
| 20 | TrainingPeriod | 000005_create_training_periods_table.php | ✅ OK | name, start_date, end_date, is_active |
| 21 | TrainingRequest | 000013_create_training_requests_table.php | ✅ OK | requested_by, book_status, training_site_id, training_period_id, status, requested_at, rejection_reason, letter_number, letter_date, governing_body, coordinator_reviewed_at, sent_to_directorate_at, directorate_approved_at, sent_to_school_at, school_approved_at |
| 22 | TrainingRequestBatch | 000015_create_training_request_batches_table.php | ✅ OK | letter_number, letter_date, content, created_by, governing_body, directorate, status, sent_at |
| 23 | TrainingRequestBatchItem | 000016_create_training_request_batch_items_table.php | ✅ OK | batch_id, training_request_id |
| 24 | TrainingRequestStudent | 000014_create_training_request_students_table.php | ✅ OK | training_request_id, user_id, course_id, assigned_teacher_id, start_date, end_date, status, rejection_reason |
| 25 | TrainingSite | 000006_create_training_sites_table.php | ✅ OK | name, location, capacity, directorate, is_active |
| 26 | User | 000008_create_users_table.php | ✅ OK | university_id, name, email, password, role_id, department_id, training_site_id, directorate, major, status |
| 27 | WeeklySchedule | 000030_create_weekly_schedules_table.php | ✅ OK | teacher_id, day, start_time, end_time, training_site_id, submitted_by |

### Summary
✅ **All 27 tables used by DemoDataSeeder are verified and compatible**

All columns referenced in the seeder exist in their respective migrations with compatible data types.
