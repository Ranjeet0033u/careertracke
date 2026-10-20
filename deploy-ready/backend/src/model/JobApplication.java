package model;

import java.time.LocalDate;

/**
 * UNIT II: Inheritance & Method Overriding
 * Concrete subclass representing a full-time permanent job opportunity.
 */
public class JobApplication extends Application {

    public JobApplication() {
        super();
        this.type = "Job";
    }

    public JobApplication(int applicationId, int companyId, String companyName, String role, 
                          LocalDate appliedDate, String status, LocalDate followUpDate) {
        super(applicationId, companyId, companyName, role, "Job", appliedDate, status, followUpDate);
    }

    public JobApplication(int companyId, String role, LocalDate appliedDate, 
                          String status, LocalDate followUpDate) {
        super(companyId, role, "Job", appliedDate, status, followUpDate);
    }

    /**
     * UNIT II: Method Overriding demonstrating polymorphic behavior
     */
    @Override
    public String showDetails() {
        return String.format("[FULL-TIME JOB] Role: %s | Company: %s | Status: %s | Applied: %s",
                role, (companyName != null ? companyName : "ID:" + companyId), status, appliedDate);
    }
}
