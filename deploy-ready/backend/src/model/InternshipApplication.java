package model;

import java.time.LocalDate;

/**
 * UNIT II: Inheritance & Method Overriding
 * Concrete subclass representing a student internship opportunity.
 */
public class InternshipApplication extends Application {

    public InternshipApplication() {
        super();
        this.type = "Internship";
    }

    public InternshipApplication(int applicationId, int companyId, String companyName, String role, 
                                LocalDate appliedDate, String status, LocalDate followUpDate) {
        super(applicationId, companyId, companyName, role, "Internship", appliedDate, status, followUpDate);
    }

    public InternshipApplication(int companyId, String role, LocalDate appliedDate, 
                                String status, LocalDate followUpDate) {
        super(companyId, role, "Internship", appliedDate, status, followUpDate);
    }

    /**
     * UNIT II: Method Overriding demonstrating polymorphic behavior
     */
    @Override
    public String showDetails() {
        return String.format("[INTERNSHIP] Role: %s | Company: %s | Status: %s | Applied: %s",
                role, (companyName != null ? companyName : "ID:" + companyId), status, appliedDate);
    }
}
