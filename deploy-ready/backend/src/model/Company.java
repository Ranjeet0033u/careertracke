package model;

/**
 * UNIT I & II: Classes and Fundamentals
 * Represents a recruiting company in the CareerTrack system.
 */
public class Company {
    private int companyId;
    private String name;
    private String location;
    private String roleOffered;
    private String contactEmail;

    // Default constructor
    public Company() {
    }

    // Parameterized constructor
    public Company(int companyId, String name, String location, String roleOffered, String contactEmail) {
        this.companyId = companyId;
        this.name = name;
        this.location = location;
        this.roleOffered = roleOffered;
        this.contactEmail = contactEmail;
    }

    // Constructor without ID (for inserts)
    public Company(String name, String location, String roleOffered, String contactEmail) {
        this.name = name;
        this.location = location;
        this.roleOffered = roleOffered;
        this.contactEmail = contactEmail;
    }

    // Getters and Setters
    public int getCompanyId() {
        return companyId;
    }

    public void setCompanyId(int companyId) {
        this.companyId = companyId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getRoleOffered() {
        return roleOffered;
    }

    public void setRoleOffered(String roleOffered) {
        this.roleOffered = roleOffered;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public void setContactEmail(String contactEmail) {
        this.contactEmail = contactEmail;
    }

    @Override
    public String toString() {
        return String.format("[%d] %s (%s) - Role: %s | Email: %s", 
                companyId, name, location, roleOffered != null ? roleOffered : "N/A", contactEmail);
    }
}
