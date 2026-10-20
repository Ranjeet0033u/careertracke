package model;

import java.time.LocalDate;

/**
 * UNIT I & II: Classes, Overloaded Constructors, and Encapsulation
 * Represents an interview stage linked to an application.
 */
public class Interview {
    private int interviewId;
    private int applicationId;
    private String roleAndCompany;
    private LocalDate interviewDate;
    private String round;  // "Aptitude", "Technical", "HR"
    private String result; // "Pending", "Cleared", "Rejected"

    // Default constructor
    public Interview() {
    }

    // Overloaded Constructor 1: Full fields with display label
    public Interview(int interviewId, int applicationId, String roleAndCompany, 
                     LocalDate interviewDate, String round, String result) {
        this.interviewId = interviewId;
        this.applicationId = applicationId;
        this.roleAndCompany = roleAndCompany;
        this.interviewDate = interviewDate;
        this.round = round;
        this.result = result;
    }

    // Overloaded Constructor 2: Standard database record without label
    public Interview(int interviewId, int applicationId, LocalDate interviewDate, String round, String result) {
        this.interviewId = interviewId;
        this.applicationId = applicationId;
        this.interviewDate = interviewDate;
        this.round = round;
        this.result = result;
    }

    // Overloaded Constructor 3: For new interviews (without ID)
    public Interview(int applicationId, LocalDate interviewDate, String round, String result) {
        this.applicationId = applicationId;
        this.interviewDate = interviewDate;
        this.round = round;
        this.result = result;
    }

    // Getters and Setters
    public int getInterviewId() {
        return interviewId;
    }

    public void setInterviewId(int interviewId) {
        this.interviewId = interviewId;
    }

    public int getApplicationId() {
        return applicationId;
    }

    public void setApplicationId(int applicationId) {
        this.applicationId = applicationId;
    }

    public String getRoleAndCompany() {
        return roleAndCompany;
    }

    public void setRoleAndCompany(String roleAndCompany) {
        this.roleAndCompany = roleAndCompany;
    }

    public String getRole() {
        if (roleAndCompany != null && roleAndCompany.contains(" - ")) {
            return roleAndCompany.split(" - ", 2)[0];
        }
        return roleAndCompany != null ? roleAndCompany : "N/A";
    }

    public String getCompanyName() {
        if (roleAndCompany != null && roleAndCompany.contains(" - ")) {
            return roleAndCompany.split(" - ", 2)[1];
        }
        return "";
    }

    public LocalDate getInterviewDate() {
        return interviewDate;
    }

    public void setInterviewDate(LocalDate interviewDate) {
        this.interviewDate = interviewDate;
    }

    public String getRound() {
        return round;
    }

    public void setRound(String round) {
        this.round = round;
    }

    public String getResult() {
        return result;
    }

    public void setResult(String result) {
        this.result = result;
    }

    @Override
    public String toString() {
        return String.format("[%d] App #%d (%s) | Date: %s | Round: %s | Result: %s",
                interviewId, applicationId, (roleAndCompany != null ? roleAndCompany : "N/A"),
                interviewDate, round, result);
    }
}
