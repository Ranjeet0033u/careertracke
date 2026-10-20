-- =============================================================================
-- CareerTrack — User Details Schema & Migration Script
-- File: database/user_details.sql
-- Description: Creates or updates the user_details table with unique account name
--              (normalized_name) and email constraints.
--
-- HOW TO EXECUTE IN MYSQL:
-- 1. Using the MySQL Command Line:
--      mysql -u root -p job_tracker < database/user_details.sql
--
-- 2. Inside MySQL Shell (CLI):
--      USE job_tracker;
--      SOURCE database/user_details.sql;
--
-- 3. In MySQL Workbench:
--      Open this script and click the lightning bolt (Execute) icon.
-- =============================================================================

USE job_tracker;

-- -----------------------------------------------------------------------------
-- 1. Create table if it does not exist yet
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_details (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    normalized_name VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 2. Safe Migration for existing tables:
-- If user_details was created previously without normalized_name, this procedure
-- safely adds the normalized_name column and unique constraint.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS migrate_user_details_table;

DELIMITER $$
CREATE PROCEDURE migrate_user_details_table()
BEGIN
    -- Check if normalized_name column is missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'user_details' 
          AND COLUMN_NAME = 'normalized_name'
    ) THEN
        -- Add column with temporary default
        ALTER TABLE user_details 
            ADD COLUMN normalized_name VARCHAR(100) NULL AFTER full_name;

        -- Populate existing rows by trimming and converting to lowercase
        UPDATE user_details 
            SET normalized_name = LOWER(TRIM(full_name)) 
            WHERE normalized_name IS NULL;

        -- Enforce NOT NULL and UNIQUE constraint
        ALTER TABLE user_details 
            MODIFY COLUMN normalized_name VARCHAR(100) NOT NULL,
            ADD CONSTRAINT uq_user_normalized_name UNIQUE (normalized_name);
    END IF;
END$$
DELIMITER ;

CALL migrate_user_details_table();
DROP PROCEDURE IF EXISTS migrate_user_details_table;

-- Verify table schema
DESCRIBE user_details;

-- -----------------------------------------------------------------------------
-- 3. Demo User Seed (demo-file for sign-in)
-- Default Test Credentials:
--   Email:    ramya@college.edu
--   Password: password123
-- -----------------------------------------------------------------------------
INSERT INTO user_details (user_id, full_name, normalized_name, email, password_hash)
VALUES (
    1,
    'Ramya Ranjith',
    'ramya ranjith',
    'ramya@college.edu',
    '65536:J5E23e3RkPWf/yxvkQSzXQ==:Cppm8BRUO4LUYrZhSlP7ZlPXOqtjXsIgBXGyZmrSM60='
)
ON DUPLICATE KEY UPDATE 
    full_name = VALUES(full_name),
    normalized_name = VALUES(normalized_name),
    password_hash = VALUES(password_hash);
