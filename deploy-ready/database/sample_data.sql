-- =============================================================================
-- CareerTrack — Job & Internship Application Tracker
-- Sample Data: sample_data.sql
-- Topic: DBMS Unit I - Database Modifications (INSERT)
-- =============================================================================

USE job_tracker;

-- Clean existing data in reverse order of foreign keys
DELETE FROM offers;
DELETE FROM interviews;
DELETE FROM applications;
DELETE FROM companies;

-- -----------------------------------------------------------------------------
-- 1. Insert Companies
-- -----------------------------------------------------------------------------
INSERT INTO companies (company_id, name, location, role_offered, contact_email) VALUES
(1, 'ABC Technologies', 'Chennai, India', 'Software Developer Intern', 'hr@abctech.com'),
(2, 'XYZ Solutions', 'Bangalore, India', 'Graduate Engineer Trainee', 'careers@xyz.com'),
(3, 'BrightSoft', 'Hyderabad, India', 'Java Developer Intern', 'hr@brightsoft.com'),
(4, 'Nexa Systems', 'Chennai, India', 'Associate Engineer', 'jobs@nexa.com'),
(5, 'TechCorp', 'Pune, India', 'Data Analyst', 'hr@techcorp.com'),
(6, 'CodeLabs', 'Delhi, India', 'Web Development Intern', 'careers@codelabs.com');

-- -----------------------------------------------------------------------------
-- 2. Insert Applications
-- -----------------------------------------------------------------------------
INSERT INTO applications (application_id, company_id, role, type, applied_date, status, follow_up_date) VALUES
(1, 1, 'Software Developer Intern', 'Internship', '2026-10-15', 'Applied', '2026-10-20'),
(2, 2, 'Graduate Engineer Trainee', 'Job', '2026-10-12', 'Interview Scheduled', '2026-10-25'),
(3, 3, 'Java Developer Intern', 'Internship', '2026-10-10', 'Shortlisted', '2026-10-18'),
(4, 4, 'Associate Engineer', 'Job', '2026-10-08', 'Rejected', NULL),
(5, 5, 'Data Analyst', 'Job', '2026-10-05', 'Applied', '2026-10-15'),
(6, 6, 'Web Development Intern', 'Internship', '2026-10-01', 'Interview Scheduled', '2026-10-22'),
(7, 1, 'Product Intern', 'Internship', '2026-09-28', 'Offered', '2026-10-10'),
(8, 2, 'Backend Developer', 'Job', '2026-09-25', 'Offered', NULL);

-- -----------------------------------------------------------------------------
-- 3. Insert Interviews
-- -----------------------------------------------------------------------------
INSERT INTO interviews (interview_id, application_id, interview_date, round, result) VALUES
(1, 1, '2026-10-22', 'Technical', 'Pending'),
(2, 2, '2026-10-24', 'HR', 'Pending'),
(3, 3, '2026-10-18', 'Aptitude', 'Cleared'),
(4, 6, '2026-10-28', 'Technical', 'Pending'),
(5, 5, '2026-10-15', 'HR', 'Rejected');

-- -----------------------------------------------------------------------------
-- 4. Insert Offers
-- -----------------------------------------------------------------------------
INSERT INTO offers (offer_id, application_id, package, deadline, offer_status) VALUES
(1, 7, 12.00, '2026-10-30', 'Accepted'),
(2, 8, 8.50, '2026-10-28', 'Pending');
