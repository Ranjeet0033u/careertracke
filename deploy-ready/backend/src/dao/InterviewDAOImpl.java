package dao;

import model.Interview;
import util.DBConnection;

import java.sql.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * UNIT III & V: JDBC Implementation for InterviewDAO
 */
public class InterviewDAOImpl implements InterviewDAO {

    @Override
    public void addInterview(Interview interview) throws SQLException {
        Connection con = null;
        PreparedStatement ps = null;
        String sql = "INSERT INTO interviews (application_id, interview_date, round, result) VALUES (?, ?, ?, ?)";

        try {
            con = DBConnection.getConnection();
            ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, interview.getApplicationId());
            ps.setDate(2, Date.valueOf(interview.getInterviewDate()));
            ps.setString(3, interview.getRound());
            ps.setString(4, interview.getResult() != null ? interview.getResult() : "Pending");
            ps.executeUpdate();

            ResultSet rs = ps.getGeneratedKeys();
            if (rs.next()) {
                interview.setInterviewId(rs.getInt(1));
            }
        } finally {
            if (ps != null) ps.close();
            DBConnection.closeConnection(con);
        }
    }

    @Override
    public List<Interview> getAllInterviews() throws SQLException {
        Connection con = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        List<Interview> list = new ArrayList<>();
        String sql = "SELECT i.*, CONCAT(a.role, ' - ', c.name) AS role_company " +
                     "FROM interviews i " +
                     "INNER JOIN applications a ON i.application_id = a.application_id " +
                     "INNER JOIN companies c ON a.company_id = c.company_id " +
                     "ORDER BY i.interview_date ASC";

        try {
            con = DBConnection.getConnection();
            ps = con.prepareStatement(sql);
            rs = ps.executeQuery();

            while (rs.next()) {
                Date d = rs.getDate("interview_date");
                LocalDate iDate = (d != null) ? d.toLocalDate() : null;
                Interview iv = new Interview(
                        rs.getInt("interview_id"),
                        rs.getInt("application_id"),
                        rs.getString("role_company"),
                        iDate,
                        rs.getString("round"),
                        rs.getString("result")
                );
                list.add(iv);
            }
            return list;
        } finally {
            if (rs != null) rs.close();
            if (ps != null) ps.close();
            DBConnection.closeConnection(con);
        }
    }

    @Override
    public List<Interview> getInterviewsByApplication(int applicationId) throws SQLException {
        Connection con = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        List<Interview> list = new ArrayList<>();
        String sql = "SELECT i.*, CONCAT(a.role, ' - ', c.name) AS role_company " +
                     "FROM interviews i " +
                     "INNER JOIN applications a ON i.application_id = a.application_id " +
                     "INNER JOIN companies c ON a.company_id = c.company_id " +
                     "WHERE i.application_id = ? " +
                     "ORDER BY i.interview_date ASC";

        try {
            con = DBConnection.getConnection();
            ps = con.prepareStatement(sql);
            ps.setInt(1, applicationId);
            rs = ps.executeQuery();

            while (rs.next()) {
                Date d = rs.getDate("interview_date");
                LocalDate iDate = (d != null) ? d.toLocalDate() : null;
                Interview iv = new Interview(
                        rs.getInt("interview_id"),
                        rs.getInt("application_id"),
                        rs.getString("role_company"),
                        iDate,
                        rs.getString("round"),
                        rs.getString("result")
                );
                list.add(iv);
            }
            return list;
        } finally {
            if (rs != null) rs.close();
            if (ps != null) ps.close();
            DBConnection.closeConnection(con);
        }
    }

    @Override
    public void updateResult(int interviewId, String result) throws SQLException {
        Connection con = null;
        PreparedStatement ps = null;
        String sql = "UPDATE interviews SET result = ? WHERE interview_id = ?";

        try {
            con = DBConnection.getConnection();
            ps = con.prepareStatement(sql);
            ps.setString(1, result);
            ps.setInt(2, interviewId);
            ps.executeUpdate();
        } finally {
            if (ps != null) ps.close();
            DBConnection.closeConnection(con);
        }
    }

    @Override
    public void deleteInterview(int interviewId) throws SQLException {
        Connection con = null;
        PreparedStatement ps = null;
        String sql = "DELETE FROM interviews WHERE interview_id = ?";

        try {
            con = DBConnection.getConnection();
            ps = con.prepareStatement(sql);
            ps.setInt(1, interviewId);
            ps.executeUpdate();
        } finally {
            if (ps != null) ps.close();
            DBConnection.closeConnection(con);
        }
    }
}
