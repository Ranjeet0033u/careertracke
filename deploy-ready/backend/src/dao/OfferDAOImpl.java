package dao;

import model.Offer;
import util.DBConnection;

import java.sql.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * UNIT III & V: JDBC Implementation for OfferDAO
 */
public class OfferDAOImpl implements OfferDAO {

    @Override
    public void addOffer(Offer offer) throws SQLException {
        Connection con = null;
        PreparedStatement ps = null;
        String sql = "INSERT INTO offers (application_id, package, deadline, offer_status) VALUES (?, ?, ?, ?)";

        try {
            con = DBConnection.getConnection();
            ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, offer.getApplicationId());
            ps.setDouble(2, offer.getPackageLpa());
            ps.setDate(3, Date.valueOf(offer.getDeadline()));
            ps.setString(4, offer.getOfferStatus() != null ? offer.getOfferStatus() : "Pending");
            ps.executeUpdate();

            ResultSet rs = ps.getGeneratedKeys();
            if (rs.next()) {
                offer.setOfferId(rs.getInt(1));
            }
        } finally {
            if (ps != null) ps.close();
            DBConnection.closeConnection(con);
        }
    }

    @Override
    public List<Offer> getAllOffers() throws SQLException {
        Connection con = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        List<Offer> list = new ArrayList<>();
        String sql = "SELECT o.*, CONCAT(a.role, ' - ', c.name) AS role_company " +
                     "FROM offers o " +
                     "INNER JOIN applications a ON o.application_id = a.application_id " +
                     "INNER JOIN companies c ON a.company_id = c.company_id " +
                     "ORDER BY o.package DESC";

        try {
            con = DBConnection.getConnection();
            ps = con.prepareStatement(sql);
            rs = ps.executeQuery();

            while (rs.next()) {
                Date d = rs.getDate("deadline");
                LocalDate deadline = (d != null) ? d.toLocalDate() : null;
                Offer off = new Offer(
                        rs.getInt("offer_id"),
                        rs.getInt("application_id"),
                        rs.getString("role_company"),
                        rs.getDouble("package"),
                        deadline,
                        rs.getString("offer_status")
                );
                list.add(off);
            }
            return list;
        } finally {
            if (rs != null) rs.close();
            if (ps != null) ps.close();
            DBConnection.closeConnection(con);
        }
    }

    @Override
    public Offer getOfferByApplication(int applicationId) throws SQLException {
        Connection con = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        String sql = "SELECT o.*, CONCAT(a.role, ' - ', c.name) AS role_company " +
                     "FROM offers o " +
                     "INNER JOIN applications a ON o.application_id = a.application_id " +
                     "INNER JOIN companies c ON a.company_id = c.company_id " +
                     "WHERE o.application_id = ?";

        try {
            con = DBConnection.getConnection();
            ps = con.prepareStatement(sql);
            ps.setInt(1, applicationId);
            rs = ps.executeQuery();

            if (rs.next()) {
                Date d = rs.getDate("deadline");
                LocalDate deadline = (d != null) ? d.toLocalDate() : null;
                return new Offer(
                        rs.getInt("offer_id"),
                        rs.getInt("application_id"),
                        rs.getString("role_company"),
                        rs.getDouble("package"),
                        deadline,
                        rs.getString("offer_status")
                );
            }
            return null;
        } finally {
            if (rs != null) rs.close();
            if (ps != null) ps.close();
            DBConnection.closeConnection(con);
        }
    }

    @Override
    public void updateOfferStatus(int offerId, String status) throws SQLException {
        Connection con = null;
        PreparedStatement ps = null;
        String sql = "UPDATE offers SET offer_status = ? WHERE offer_id = ?";

        try {
            con = DBConnection.getConnection();
            ps = con.prepareStatement(sql);
            ps.setString(1, status);
            ps.setInt(2, offerId);
            ps.executeUpdate();
        } finally {
            if (ps != null) ps.close();
            DBConnection.closeConnection(con);
        }
    }

    @Override
    public void deleteOffer(int offerId) throws SQLException {
        Connection con = null;
        PreparedStatement ps = null;
        String sql = "DELETE FROM offers WHERE offer_id = ?";

        try {
            con = DBConnection.getConnection();
            ps = con.prepareStatement(sql);
            ps.setInt(1, offerId);
            ps.executeUpdate();
        } finally {
            if (ps != null) ps.close();
            DBConnection.closeConnection(con);
        }
    }
}
