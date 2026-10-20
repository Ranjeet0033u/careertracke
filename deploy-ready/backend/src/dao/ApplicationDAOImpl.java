package dao;

import model.Application;
import model.InternshipApplication;
import model.JobApplication;
import util.DBConnection;
import util.InvalidStatusException;
import util.ReportUtil;

import java.sql.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * UNIT II, III & V: Polymorphism, Interfaces, and JDBC Implementation
 */
public class ApplicationDAOImpl implements ApplicationDAO {

    /**
     * Factory helper demonstrating polymorphism: creates either a JobApplication or InternshipApplication
     */
    private Application createApplicationFromResultSet(ResultSet rs) throws SQLException {
        int id = rs.getInt("application_id");
        int companyId = rs.getInt("company_id");
        String companyName = rs.getString("company_name");
        String role = rs.getString("role");
        String type = rs.getString("type");
        Date appDate = rs.getDate("applied_date");
        LocalDate appliedDate = (appDate != null) ? appDate.toLocalDate() : null;
        String status = rs.getString("status");
        Date fDate = rs.getDate("follow_up_date");
        LocalDate followUpDate = (fDate != null) ? fDate.toLocalDate() : null;

        if ("Job".equalsIgnoreCase(type)) {
            return new JobApplication(id, companyId, companyName, role, appliedDate, status, followUpDate);
        } else {
            return new InternshipApplication(id, companyId, companyName, role, appliedDate, status, followUpDate);
        }
    }

    @Override
    public void addApplication(Application app) throws SQLException {
        Connection con = null;
        PreparedStatement ps = null;
        String sql = "INSERT INTO applications (company_id, role, type, applied_date, status, follow_up_date) VALUES (?, ?, ?, ?, ?, ?)";

        try {
            con = DBConnection.getConnection();
            ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, app.getCompanyId());
            ps.setString(2, app.getRole());
            ps.setString(3, app.getType());
            ps.setDate(4, Date.valueOf(app.getAppliedDate()));
            ps.setString(5, app.getStatus() != null ? app.getStatus() : "Applied");
            if (app.getFollowUpDate() != null) {
                ps.setDate(6, Date.valueOf(app.getFollowUpDate()));
            } else {
                ps.setNull(6, Types.DATE);
            }
            ps.executeUpdate();

            ResultSet rs = ps.getGeneratedKeys();
            if (rs.next()) {
                app.setApplicationId(rs.getInt(1));
            }
        } finally {
            if (ps != null) ps.close();
            DBConnection.closeConnection(con);
        }
    }

    @Override
    public Application getApplicationById(int applicationId) throws SQLException {
        Connection con = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        String sql = "SELECT a.*, c.name AS company_name FROM applications a " +
                     "INNER JOIN companies c ON a.company_id = c.company_id " +
                     "WHERE a.application_id = ?";

        try {
            con = DBConnection.getConnection();
            ps = con.prepareStatement(sql);
            ps.setInt(1, applicationId);
            rs = ps.executeQuery();

            if (rs.next()) {
                return createApplicationFromResultSet(rs);
            }
            return null;
        } finally {
            if (rs != null) rs.close();
            if (ps != null) ps.close();
            DBConnection.closeConnection(con);
        }
    }

    @Override
    public List<Application> getAllApplications() throws SQLException {
        Connection con = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        List<Application> list = new ArrayList<>();
        String sql = "SELECT a.*, c.name AS company_name FROM applications a " +
                     "INNER JOIN companies c ON a.company_id = c.company_id " +
                     "ORDER BY a.application_id ASC";

        try {
            con = DBConnection.getConnection();
            ps = con.prepareStatement(sql);
            rs = ps.executeQuery();

            while (rs.next()) {
                list.add(createApplicationFromResultSet(rs));
            }
            return list;
        } finally {
            if (rs != null) rs.close();
            if (ps != null) ps.close();
            DBConnection.closeConnection(con);
        }
    }

    @Override
    public List<Application> searchByCompanyOrRole(String keyword) throws SQLException {
        Connection con = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        List<Application> list = new ArrayList<>();
        String sql = "SELECT a.*, c.name AS company_name FROM applications a " +
                     "INNER JOIN companies c ON a.company_id = c.company_id " +
                     "WHERE c.name LIKE ? OR a.role LIKE ? " +
                     "ORDER BY a.applied_date DESC";

        try {
            con = DBConnection.getConnection();
            ps = con.prepareStatement(sql);
            String term = "%" + keyword + "%";
            ps.setString(1, term);
            ps.setString(2, term);
            rs = ps.executeQuery();

            while (rs.next()) {
                list.add(createApplicationFromResultSet(rs));
            }
            return list;
        } finally {
            if (rs != null) rs.close();
            if (ps != null) ps.close();
            DBConnection.closeConnection(con);
        }
    }

    @Override
    public List<Application> filterByStatus(String status) throws SQLException {
        Connection con = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        List<Application> list = new ArrayList<>();
        String sql = "SELECT a.*, c.name AS company_name FROM applications a " +
                     "INNER JOIN companies c ON a.company_id = c.company_id " +
                     "WHERE a.status = ? ORDER BY a.applied_date DESC";

        try {
            con = DBConnection.getConnection();
            ps = con.prepareStatement(sql);
            ps.setString(1, status);
            rs = ps.executeQuery();

            while (rs.next()) {
                list.add(createApplicationFromResultSet(rs));
            }
            return list;
        } finally {
            if (rs != null) rs.close();
            if (ps != null) ps.close();
            DBConnection.closeConnection(con);
        }
    }

    @Override
    public List<Application> searchAndFilter(String keyword, String status, String type) throws SQLException {
        Connection con = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        List<Application> list = new ArrayList<>();

        StringBuilder sql = new StringBuilder(
            "SELECT a.*, c.name AS company_name FROM applications a " +
            "INNER JOIN companies c ON a.company_id = c.company_id WHERE 1=1 "
        );
        List<String> params = new ArrayList<>();

        if (keyword != null && !keyword.trim().isEmpty()) {
            sql.append("AND (c.name LIKE ? OR a.role LIKE ?) ");
            String kw = "%" + keyword.trim() + "%";
            params.add(kw);
            params.add(kw);
        }
        if (status != null && !status.trim().isEmpty() && !"All Statuses".equalsIgnoreCase(status.trim())) {
            sql.append("AND a.status = ? ");
            params.add(status.trim());
        }
        if (type != null && !type.trim().isEmpty() && !"All Types".equalsIgnoreCase(type.trim())) {
            sql.append("AND a.type = ? ");
            params.add(type.trim());
        }
        sql.append("ORDER BY a.applied_date DESC");

        try {
            con = DBConnection.getConnection();
            ps = con.prepareStatement(sql.toString());
            for (int i = 0; i < params.size(); i++) {
                ps.setString(i + 1, params.get(i));
            }
            rs = ps.executeQuery();
            while (rs.next()) {
                list.add(createApplicationFromResultSet(rs));
            }
            return list;
        } finally {
            if (rs != null) rs.close();
            if (ps != null) ps.close();
            DBConnection.closeConnection(con);
        }
    }

    @Override
    public void updateApplication(Application app) throws SQLException {
        Connection con = null;
        PreparedStatement ps = null;
        String sql = "UPDATE applications SET company_id = ?, role = ?, type = ?, applied_date = ?, status = ?, follow_up_date = ? WHERE application_id = ?";

        try {
            con = DBConnection.getConnection();
            ps = con.prepareStatement(sql);
            ps.setInt(1, app.getCompanyId());
            ps.setString(2, app.getRole());
            ps.setString(3, app.getType());
            ps.setDate(4, Date.valueOf(app.getAppliedDate()));
            ps.setString(5, app.getStatus());
            if (app.getFollowUpDate() != null) {
                ps.setDate(6, Date.valueOf(app.getFollowUpDate()));
            } else {
                ps.setNull(6, Types.DATE);
            }
            ps.setInt(7, app.getApplicationId());
            ps.executeUpdate();
        } finally {
            if (ps != null) ps.close();
            DBConnection.closeConnection(con);
        }
    }

    @Override
    public void updateStatus(int applicationId, String status) throws SQLException, InvalidStatusException {
        // UNIT III: Validate status and throw custom exception if invalid
        ReportUtil.validateStatus(status);

        Connection con = null;
        PreparedStatement ps = null;
        String sql = "UPDATE applications SET status = ? WHERE application_id = ?";

        try {
            con = DBConnection.getConnection();
            ps = con.prepareStatement(sql);
            ps.setString(1, status);
            ps.setInt(2, applicationId);
            ps.executeUpdate();
        } finally {
            if (ps != null) ps.close();
            DBConnection.closeConnection(con);
        }
    }

    @Override
    public void setFollowUpDate(int applicationId, LocalDate followUpDate) throws SQLException {
        Connection con = null;
        PreparedStatement ps = null;
        String sql = "UPDATE applications SET follow_up_date = ? WHERE application_id = ?";

        try {
            con = DBConnection.getConnection();
            ps = con.prepareStatement(sql);
            if (followUpDate != null) {
                ps.setDate(1, Date.valueOf(followUpDate));
            } else {
                ps.setNull(1, Types.DATE);
            }
            ps.setInt(2, applicationId);
            ps.executeUpdate();
        } finally {
            if (ps != null) ps.close();
            DBConnection.closeConnection(con);
        }
    }

    @Override
    public void deleteApplication(int applicationId) throws SQLException {
        Connection con = null;
        PreparedStatement ps = null;
        String sql = "DELETE FROM applications WHERE application_id = ?";

        try {
            con = DBConnection.getConnection();
            ps = con.prepareStatement(sql);
            ps.setInt(1, applicationId);
            ps.executeUpdate();
        } finally {
            if (ps != null) ps.close();
            DBConnection.closeConnection(con);
        }
    }
}
