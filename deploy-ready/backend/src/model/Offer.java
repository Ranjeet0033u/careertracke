package model;

import java.time.LocalDate;

/**
 * UNIT I & II: Classes, Encapsulation, and Types
 * Represents a job or internship offer received by the candidate.
 */
public class Offer {
    private int offerId;
    private int applicationId;
    private String roleAndCompany;
    private double packageLpa;
    private LocalDate deadline;
    private String offerStatus; // "Pending", "Accepted", "Rejected"

    // Default constructor
    public Offer() {
    }

    // Parameterized constructor with all fields
    public Offer(int offerId, int applicationId, String roleAndCompany, 
                 double packageLpa, LocalDate deadline, String offerStatus) {
        this.offerId = offerId;
        this.applicationId = applicationId;
        this.roleAndCompany = roleAndCompany;
        this.packageLpa = packageLpa;
        this.deadline = deadline;
        this.offerStatus = offerStatus;
    }

    // Constructor without label
    public Offer(int offerId, int applicationId, double packageLpa, LocalDate deadline, String offerStatus) {
        this.offerId = offerId;
        this.applicationId = applicationId;
        this.packageLpa = packageLpa;
        this.deadline = deadline;
        this.offerStatus = offerStatus;
    }

    // Constructor without ID (for inserts)
    public Offer(int applicationId, double packageLpa, LocalDate deadline, String offerStatus) {
        this.applicationId = applicationId;
        this.packageLpa = packageLpa;
        this.deadline = deadline;
        this.offerStatus = offerStatus;
    }

    // Getters and Setters
    public int getOfferId() {
        return offerId;
    }

    public void setOfferId(int offerId) {
        this.offerId = offerId;
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

    public double getPackageLpa() {
        return packageLpa;
    }

    public void setPackageLpa(double packageLpa) {
        this.packageLpa = packageLpa;
    }

    public LocalDate getDeadline() {
        return deadline;
    }

    public void setDeadline(LocalDate deadline) {
        this.deadline = deadline;
    }

    public String getOfferStatus() {
        return offerStatus;
    }

    public void setOfferStatus(String offerStatus) {
        this.offerStatus = offerStatus;
    }

    @Override
    public String toString() {
        return String.format("[%d] App #%d (%s) | Package: %.2f LPA | Deadline: %s | Status: %s",
                offerId, applicationId, (roleAndCompany != null ? roleAndCompany : "N/A"),
                packageLpa, deadline, offerStatus);
    }
}
