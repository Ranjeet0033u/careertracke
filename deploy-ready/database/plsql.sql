-- =============================================================================
-- CareerTrack — Job & Internship Application Tracker
-- PL/SQL Elements: plsql.sql
-- Topic: DBMS Unit II - Triggers, Stored Procedures, Functions, ER-to-Relational Mapping
-- =============================================================================

USE job_tracker;

DELIMITER $$

-- -----------------------------------------------------------------------------
-- 1. TRIGGER: Automatically update Application status to 'Offered' on Offer insertion
-- Viva Explanation: Ensures data consistency across tables without requiring
-- manual dual-updates from Java application code.
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_after_offer_insert$$

CREATE TRIGGER trg_after_offer_insert
AFTER INSERT ON offers
FOR EACH ROW
BEGIN
    UPDATE applications
    SET status = 'Offered'
    WHERE application_id = NEW.application_id;
END$$

-- -----------------------------------------------------------------------------
-- 2. STORED PROCEDURE: Retrieve follow-ups within the next N days
-- Viva Explanation: Encapsulates business date calculation and allows parameter
-- passing (IN days_ahead INT) for reusable execution.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS get_upcoming_followups$$

CREATE PROCEDURE get_upcoming_followups(IN days_ahead INT)
BEGIN
    SELECT 
        a.application_id,
        c.name AS company_name,
        a.role,
        a.follow_up_date,
        DATEDIFF(a.follow_up_date, CURDATE()) AS days_remaining
    FROM applications a
    INNER JOIN companies c ON a.company_id = c.company_id
    WHERE a.follow_up_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL days_ahead DAY)
    ORDER BY a.follow_up_date ASC;
END$$

-- -----------------------------------------------------------------------------
-- 3. STORED FUNCTION: Calculate Offer Rate percentage
-- Viva Explanation: A deterministic routine that returns a scalar value (DECIMAL)
-- compute-able inside standard SQL SELECT statements.
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS calculate_offer_rate$$

CREATE FUNCTION calculate_offer_rate()
RETURNS DECIMAL(5,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE total_apps INT DEFAULT 0;
    DECLARE total_offers INT DEFAULT 0;
    DECLARE rate DECIMAL(5,2) DEFAULT 0.00;

    SELECT COUNT(*) INTO total_apps FROM applications;
    SELECT COUNT(*) INTO total_offers FROM offers;

    IF total_apps > 0 THEN
        SET rate = (total_offers * 100.0) / total_apps;
    ELSE
        SET rate = 0.00;
    END IF;

    RETURN rate;
END$$

DELIMITER ;

-- -----------------------------------------------------------------------------
-- VERIFICATION TEST CALLS:
-- -----------------------------------------------------------------------------
-- CALL get_upcoming_followups(7);
-- SELECT calculate_offer_rate() AS current_offer_rate_pct;

/*
================================================================================
VIVA REFERENCE: ER DIAGRAM TO RELATIONAL SCHEMA MAPPING (UNIT II)
================================================================================
Entity-Relationship (ER) Cardinalities:
1. Company (1) ----- (N) Application
   - One company can receive multiple applications from students.
   - Foreign key `company_id` is embedded in the `applications` relation table.
   - ON DELETE CASCADE maintains referential integrity.

2. Application (1) ----- (N) Interview
   - One application can go through multiple interview rounds (Aptitude, Tech, HR).
   - Foreign key `application_id` is embedded in the `interviews` table.

3. Application (1) ----- (1) Offer
   - One application yields at most one offer.
   - Enforced by a UNIQUE constraint on `offers.application_id`.
================================================================================
*/
