# QuranHikma academic standards gap audit (Nov 4, 2026)

Reference standards (public): DEAC Accreditation Handbook https://www.deac.org/Seeking-Accreditation/The-DEAC-Accrediting-Handbook.aspx ·
Quality Matters Higher Education Rubric https://www.qualitymatters.org/qa-resources/rubric-standards/higher-ed-rubric ·
WCAG 2.1 https://www.w3.org/TR/WCAG21/ · FERPA (student records) https://studentprivacy.ed.gov/ferpa ·
International Center for Academic Integrity https://www.academicintegrity.org/ · CHEA (recognized accreditors) https://www.chea.org/

| Standard | Before (main @5270dbfa) | Built in feat/academic-standards | Source |
|---|---|---|---|
| Academic catalog | Missing (courses.html is a listing only) | /catalog.html from live qh_courses, with credit, prerequisites, outcomes, syllabus links | DEAC Handbook (publications/catalog) |
| Learning outcomes per course | Missing (no column) | Rendered on catalog + syllabus; `learning_outcomes` column in migration | QM Std 2 |
| Syllabus per course | Missing | /syllabus.html?course=ID template: info table, description, outcomes, schedule, readings w/ full citations, assessments/weights, policies, print | QM Std 1, 3 |
| Grading policy & scale | Missing | /policies.html#grading draft scale, incompletes, appeals | QM Std 3.2 |
| Academic integrity | Missing | /policies.html#integrity draft | ICAI; QM 3.2/1.4 |
| Attendance/participation | Missing | /policies.html#attendance draft | DEAC (student engagement) |
| Accessibility statement | Missing | /policies.html#accessibility (WCAG 2.1 AA target, no false conformance claim) | WCAG 2.1; QM Std 8 |
| Privacy / terms | Missing | /policies.html#privacy, #terms drafts | FERPA principles |
| Refund policy | Missing | /policies.html#refund template (all values TBP) | DEAC (tuition/refund disclosure) |
| Admissions requirements | Partial (apply.html flow, no published requirements) | /student-handbook.html#admissions | DEAC |
| Student handbook | Missing | /student-handbook.html (rights, support, records, complaints) | DEAC |
| Academic calendar | Missing | /student-handbook.html#calendar template | DEAC |
| FAQ | Missing | /student-handbook.html#faq | — |
| Faculty page structure | Present (faculty.html with review-gated credentials) | Footer added; syllabus links to instructor_id profile | DEAC (faculty qualifications) |
| Transcripts/certificates | Table qh_certificates exists, no student view | /transcript.html unofficial transcript (read-only) | FERPA (student access to records) |
| Student progress | Data in qh_enrollments/qh_student_progress, no student view (progress.html is hadith linking) | /my-progress.html | QM Std 3.5 |
| Consistent footer links | Missing | academic/footer.js + shared footer on all new pages and faculty.html | QM Std 1.1 |
| Accreditation disclosure | None | Footer states no accreditation claim unless provided | CHEA |

Migration: migrations/20261104_academic_standards.sql (NOT applied).

## Phase 2 (2026-11-04)
- `admin/syllabus-editor.html` + `academic/syllabus-editor.js`: owner-only editor for catalog/syllabus fields, outcomes, outcome-to-assessment mapping and per-lesson objectives, with entry checks (weights = 100%, every outcome assessed, citations have author + title). Save is disabled until the migrations are applied; RLS still authorizes writes.
- `syllabus.html`: lesson objectives and an outcome-to-assessment alignment table (empty state when absent).
- `lesson.html`: shows lesson objectives; grades through `qh_grade_quiz` when installed, else the existing client-graded insert.
- `course.html`: real lesson count for guests via `qh_public_lesson_counts` when installed.
- `ad-banner.js`: reads `qh_active_ads` when installed, else the table.
- `certificate.html`: public certificate verification by ID via `qh_verify_certificate` (no recipient name returned).
- Accessibility: `<main>` landmark on course pages, skip link and focus ring (site-chrome.js), account button inside a nav landmark, footer heading order.
- Migration `migrations/20261104b_quiz_integrity_public_reads.sql` (NOT APPLIED).
