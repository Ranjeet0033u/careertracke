package util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

/**
 * UNIT V: Accessing Databases with JDBC
 * Singleton utility class managing database connections to MySQL.
 */
public class DBConnection {

    // Database credentials (adjust URL, user, password to match local MySQL setup)
    private static final String URL = "jdbc:mysql://localhost:3306/job_tracker?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC";
    private static final String USER = "root";
    private static final String PASSWORD = "your_password";

    // Static block to register MySQL driver class
    static {
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException e) {
            System.err.println("MySQL JDBC Driver not found on classpath: " + e.getMessage());
        }
    }

    /**
     * Returns a new connection to the job_tracker database.
     * @return active java.sql.Connection
     * @throws SQLException on connection failure
     */
    public static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(URL, USER, PASSWORD);
    }

    /**
     * Closes the connection safely, used in 'finally' blocks to prevent resource leaks.
     * @param con Connection to close
     */
    public static void closeConnection(Connection con) {
        if (con != null) {
            try {
                con.close();
            } catch (SQLException e) {
                System.out.println("Error closing connection: " + e.getMessage());
            }
        }
    }
}
