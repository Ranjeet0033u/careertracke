package model;

import java.sql.Timestamp;

/**
 * UNIT II & V: Encapsulation & Model class representing a User Account.
 * Maps directly to the 'user_details' table in MySQL.
 */
public class User {

    private int userId;
    private String fullName;
    private String normalizedName;
    private String email;
    private String passwordHash;
    private Timestamp createdAt;

    // Default constructor
    public User() {
    }

    // Constructor for registering a new user
    public User(String fullName, String normalizedName, String email, String passwordHash) {
        this.fullName = fullName;
        this.normalizedName = normalizedName;
        this.email = email;
        this.passwordHash = passwordHash;
    }

    // Full constructor (for reading existing user records from MySQL)
    public User(int userId, String fullName, String normalizedName, String email, String passwordHash, Timestamp createdAt) {
        this.userId = userId;
        this.fullName = fullName;
        this.normalizedName = normalizedName;
        this.email = email;
        this.passwordHash = passwordHash;
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public int getUserId() {
        return userId;
    }

    public void setUserId(int userId) {
        this.userId = userId;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getNormalizedName() {
        return normalizedName;
    }

    public void setNormalizedName(String normalizedName) {
        this.normalizedName = normalizedName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public Timestamp getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Timestamp createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public String toString() {
        // Safe representation that NEVER exposes or prints the password hash
        return "User{" +
                "userId=" + userId +
                ", fullName='" + fullName + '\'' +
                ", normalizedName='" + normalizedName + '\'' +
                ", email='" + email + '\'' +
                ", createdAt=" + createdAt +
                '}';
    }
}
