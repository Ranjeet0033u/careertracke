package dao;

import model.Application;
import util.InvalidStatusException;

import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;

/**
 * UNIT III: Interfaces
 * Data Access Object contract for Job and Internship applications.
 */
public interface ApplicationDAO {
    void addApplication(Application application) throws SQLException;
    Application getApplicationById(int applicationId) throws SQLException;
    List<Application> getAllApplications() throws SQLException;
    List<Application> searchByCompanyOrRole(String keyword) throws SQLException;
    List<Application> filterByStatus(String status) throws SQLException;
    List<Application> searchAndFilter(String keyword, String status, String type) throws SQLException;
    void updateApplication(Application application) throws SQLException;
    void updateStatus(int applicationId, String status) throws SQLException, InvalidStatusException;
    void setFollowUpDate(int applicationId, LocalDate followUpDate) throws SQLException;
    void deleteApplication(int applicationId) throws SQLException;
}
