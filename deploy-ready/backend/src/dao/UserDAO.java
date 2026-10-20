package dao;

import model.User;
import java.sql.SQLException;

/**
 * UNIT III: Interfaces & Packages
 * Data Access Object interface defining the contract for user authentication in MySQL.
 */
public interface UserDAO {

    /**
     * Inserts a new user into the user_details table using PreparedStatement.
     * 
     * @param user User object containing fullName, normalizedName, email, and passwordHash
     * @throws SQLException on database error or duplicate key constraint violation
     */
    void registerUser(User user) throws SQLException;

    /**
     * Retrieves a user record by email address.
     * 
     * @param email The unique email to search for
     * @return User object if found, or null if no record exists
     * @throws SQLException on database access error
     */
    User getUserByEmail(String email) throws SQLException;

    /**
     * Checks if an email is already registered in the user_details table.
     * 
     * @param email The email to check
     * @return true if email exists, false otherwise
     * @throws SQLException on database access error
     */
    boolean emailExists(String email) throws SQLException;

    /**
     * Checks if a normalized account name already exists in the user_details table.
     * 
     * @param normalizedName The normalized name (trimmed, collapsed whitespace, lowercase)
     * @return true if name already exists, false otherwise
     * @throws SQLException on database access error
     */
    boolean normalizedNameExists(String normalizedName) throws SQLException;

    /**
     * Retrieves a user by user_id.
     * 
     * @param userId The unique user ID
     * @return User object or null
     * @throws SQLException on database access error
     */
    User getUserById(int userId) throws SQLException;
}
