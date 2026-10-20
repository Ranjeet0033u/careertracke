-- =============================================================================
-- CareerTrack — Job & Internship Application Tracker
-- Queries: queries.sql
-- Topic: DBMS Unit I - Aggregate Functions, Group By, Having, Set Operations,
--                      Nested Subqueries, Complex Queries & Joined Relations
-- =============================================================================

USE job_tracker;

-- -----------------------------------------------------------------------------
-- 1. BASIC QUERIES WITH WHERE, ORDER BY, AND LIKE
-- -----------------------------------------------------------------------------
-- Search applications by company name or role pattern
SELECT a.application_id, c.name AS company, a.role, a.status
FROM applications a
INNER JOIN companies c ON a.company_id = c.company_id
WHERE c.name LIKE '%Tech%' OR a.role LIKE '%Developer%'
ORDER BY a.applied_date DESC;

-- Filter applications by status
SELECT * FROM applications WHERE status = 'Interview Scheduled';

-- -----------------------------------------------------------------------------
-- 2. JOINED RELATIONS (INNER JOIN and LEFT JOIN)
-- -----------------------------------------------------------------------------
-- Complete application details including interviews and offers
SELECT 
    a.application_id,
    c.name AS company_name,
    a.role,
    a.type,
    a.status,
    i.round AS latest_round,
    i.result AS interview_result,
    o.package AS offer_package_lpa
FROM applications a
INNER JOIN companies c ON a.company_id = c.company_id
LEFT JOIN interviews i ON a.application_id = i.application_id
LEFT JOIN offers o ON a.application_id = o.application_id
ORDER BY a.application_id;

-- -----------------------------------------------------------------------------
-- 3. AGGREGATE FUNCTIONS & GROUP BY / HAVING
-- -----------------------------------------------------------------------------
-- Overall totals
SELECT 
    (SELECT COUNT(*) FROM applications) AS total_applications,
    (SELECT COUNT(*) FROM interviews) AS total_interviews,
    (SELECT COUNT(*) FROM offers) AS total_offers,
    (SELECT COUNT(*) FROM applications WHERE status = 'Rejected') AS total_rejections,
    (SELECT MAX(package) FROM offers) AS highest_package_lpa,
    (SELECT AVG(package) FROM offers) AS average_package_lpa;

-- Applications grouped by status
SELECT status, COUNT(*) AS count
FROM applications
GROUP BY status
ORDER BY count DESC;

-- Applications per company
SELECT c.name AS company_name, COUNT(a.application_id) AS applications_count
FROM companies c
LEFT JOIN applications a ON c.company_id = a.company_id
GROUP BY c.company_id, c.name
ORDER BY applications_count DESC;

-- Companies with MORE THAN 1 application (Demonstrating HAVING clause)
SELECT c.name AS company_name, COUNT(a.application_id) AS app_count
FROM companies c
INNER JOIN applications a ON c.company_id = a.company_id
GROUP BY c.company_id, c.name
HAVING COUNT(a.application_id) > 1;

-- -----------------------------------------------------------------------------
-- 4. COMPLEX QUERY: OFFER RATE PERCENTAGE
-- -----------------------------------------------------------------------------
SELECT 
    COUNT(o.offer_id) AS total_offers,
    COUNT(a.application_id) AS total_applications,
    ROUND((COUNT(o.offer_id) * 100.0) / NULLIF(COUNT(a.application_id), 0), 2) AS offer_rate_percentage
FROM applications a
LEFT JOIN offers o ON a.application_id = o.application_id;

-- -----------------------------------------------------------------------------
-- 5. SET OPERATIONS (UNION)
-- Combines companies that have offered with companies that have scheduled interviews
-- -----------------------------------------------------------------------------
SELECT c.name AS company_name, 'Has Offer' AS status_category
FROM companies c
INNER JOIN applications a ON c.company_id = a.company_id
INNER JOIN offers o ON a.application_id = o.application_id

UNION

SELECT c.name AS company_name, 'Has Interview' AS status_category
FROM companies c
INNER JOIN applications a ON c.company_id = a.company_id
INNER JOIN interviews i ON a.application_id = i.application_id
ORDER BY company_name;

-- -----------------------------------------------------------------------------
-- 6. NESTED SUBQUERIES
-- -----------------------------------------------------------------------------
-- Subquery 1: Companies that have NO applications yet (NOT IN / NOT EXISTS)
SELECT name, location, contact_email
FROM companies
WHERE company_id NOT IN (
    SELECT DISTINCT company_id FROM applications
);

-- Subquery 2: Applications whose offer package is ABOVE the average package
SELECT a.application_id, c.name AS company, a.role, o.package
FROM offers o
INNER JOIN applications a ON o.application_id = a.application_id
INNER JOIN companies c ON a.company_id = c.company_id
WHERE o.package > (
    SELECT AVG(package) FROM offers
);

-- Subquery 3: Correlated subquery to check if company has any accepted offer
SELECT c.name, c.location
FROM companies c
WHERE EXISTS (
    SELECT 1 FROM applications a
    INNER JOIN offers o ON a.application_id = o.application_id
    WHERE a.company_id = c.company_id AND o.offer_status = 'Accepted'
);
