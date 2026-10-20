package model;

import java.time.LocalDate;

/**
 * UNIT II: Classes, Inheritance and Abstract Classes
 * Abstract base class for all job and internship applications.
 */
public abstract class Application {
    protected int applicationId;
    protected int companyId;
    protected String companyName;
    protected String role;
    protected String type; // "Job" or "Internship"
    protected LocalDate appliedDate;
    protected String status; // "Applied", "Shortlisted", "Interview Scheduled", "Offered", "Rejected"
    protected LocalDate followUpDate;

    // Default constructor
    public Application() {
    }

    // Parameterized constructor
    public Application(int applicationId, int companyId, String companyName, String role, 
                       String type, LocalDate appliedDate, String status, LocalDate followUpDate) {
        this.applicationId = applicationId;
        this.companyId = companyId;
        this.companyName = companyName;
        this.role = role;
        this.type = type;
        this.appliedDate = appliedDate;
        this.status = status;
        this.followUpDate = followUpDate;
    }

    // Constructor without applicationId (for new submissions)
    public Application(int companyId, String role, String type, LocalDate appliedDate, 
                       String status, LocalDate followUpDate) {
        this.companyId = companyId;
        this.role = role;
        this.type = type;
        this.appliedDate = appliedDate;
        this.status = status;
        this.followUpDate = followUpDate;
    }

    /**
     * UNIT II: Abstract method to be overridden by child classes (JobApplication and InternshipApplication)
     */
    public abstract String showDetails();

    // Getters and Setters
    public int getApplicationId() {
        return applicationId;
    }

    public void setApplicationId(int applicationId) {
        this.applicationId = applicationId;
    }

    public int getCompanyId() {
        return companyId;
    }

    public void setCompanyId(int companyId) {
        this.companyId = companyId;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public LocalDate getAppliedDate() {
        return appliedDate;
    }

    public void setAppliedDate(LocalDate appliedDate) {
        this.appliedDate = appliedDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDate getFollowUpDate() {
        return followUpDate;
    }

    public void setFollowUpDate(LocalDate followUpDate) {
        this.followUpDate = followUpDate;
    }

    @Override
    public String toString() {
        String followUpStr = (followUpDate != null) ? followUpDate.toString() : "Not set";
        return String.format("[%d] %s at %s | Type: %s | Applied: %s | Status: %s | Follow-up: %s",
                applicationId, role, (companyName != null ? companyName : "Company #" + companyId),
                type, appliedDate, status, followUpStr);
    }
}
