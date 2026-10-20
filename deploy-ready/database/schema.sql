-- =============================================================================
-- CareerTrack — Job & Internship Application Tracker
-- Database Schema: schema.sql
-- Topic: DBMS Unit I - Data Definition, Domain Types, Keys, Constraints, Views
-- =============================================================================

DROP DATABASE IF EXISTS job_tracker;
CREATE DATABASE job_tracker;
USE job_tracker;

-- -----------------------------------------------------------------------------
-- Table 1: companies
-- Stores organization details recruiting students.
-- Keys: company_id (PK, AUTO_INCREMENT), contact_email (UNIQUE)
-- -----------------------------------------------------------------------------
CREATE TABLE companies (
    company_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    role_offered VARCHAR(100),
    contact_email VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- Table 2: applications
-- Stores individual student applications submitted to companies.
-- Keys: application_id (PK, AUTO_INCREMENT), company_id (FK -> companies)
-- Constraints: ON DELETE CASCADE, ENUM domain types, DEFAULT 'Applied'
-- -----------------------------------------------------------------------------
CREATE TABLE applications (
    application_id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    role VARCHAR(100) NOT NULL,
    type ENUM('Job', 'Internship') NOT NULL,
    applied_date DATE NOT NULL,
    status ENUM('Applied', 'Shortlisted', 'Interview Scheduled', 'Offered', 'Rejected') NOT NULL DEFAULT 'Applied',
    follow_up_date DATE NULL,
    CONSTRAINT fk_app_company 
        FOREIGN KEY (company_id) REFERENCES companies(company_id) 
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- Table 3: interviews
-- Tracks interview rounds for a specific application.
-- Keys: interview_id (PK, AUTO_INCREMENT), application_id (FK -> applications)
-- Constraints: ON DELETE CASCADE, ENUM domain types
-- -----------------------------------------------------------------------------
CREATE TABLE interviews (
    interview_id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    interview_date DATE NOT NULL,
    round ENUM('Aptitude', 'Technical', 'HR') NOT NULL,
    result ENUM('Pending', 'Cleared', 'Rejected') NOT NULL DEFAULT 'Pending',
    CONSTRAINT fk_interview_app 
        FOREIGN KEY (application_id) REFERENCES applications(application_id) 
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- Table 4: offers
-- Records job/internship offers received.
-- Keys: offer_id (PK, AUTO_INCREMENT), application_id (FK, UNIQUE -> 1-to-1)
-- Constraints: CHECK (package > 0), ON DELETE CASCADE
-- -----------------------------------------------------------------------------
CREATE TABLE offers (
    offer_id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL UNIQUE,
    package DECIMAL(10,2) NOT NULL CHECK (package > 0),
    deadline DATE NOT NULL,
    offer_status ENUM('Pending', 'Accepted', 'Rejected') NOT NULL DEFAULT 'Pending',
    CONSTRAINT fk_offer_app 
        FOREIGN KEY (application_id) REFERENCES applications(application_id) 
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- SQL VIEWS (DBMS UNIT I: Views and Joined Relations)
-- =============================================================================

-- View 1: Complete application overview with company, interviews, and offers
CREATE OR REPLACE VIEW view_application_details AS
SELECT 
    a.application_id,
    c.company_id,
    c.name AS company_name,
    c.location AS company_location,
    a.role,
    a.type,
    a.applied_date,
    a.status,
    COALESCE(a.follow_up_date, 'Not set') AS follow_up_status,
    o.package AS offer_package,
    o.offer_status
FROM applications a
INNER JOIN companies c ON a.company_id = c.company_id
LEFT JOIN offers o ON a.application_id = o.application_id;

-- View 2: Application count grouped by status
CREATE OR REPLACE VIEW view_status_summary AS
SELECT 
    status,
    COUNT(*) AS total_count
FROM applications
GROUP BY status;

-- View 3: Upcoming follow-ups within the next 7 days
CREATE OR REPLACE VIEW view_upcoming_followups AS
SELECT 
    a.application_id,
    c.name AS company_name,
    a.role,
    a.follow_up_date
FROM applications a
INNER JOIN companies c ON a.company_id = c.company_id
WHERE a.follow_up_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
ORDER BY a.follow_up_date ASC;
