package dao;

import model.Company;
import util.DBConnection;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * UNIT III & V: Interfaces Implementation & JDBC PreparedStatement Execution
 */
public class CompanyDAOImpl implements CompanyDAO {

    @Override
    public void addCompany(Company company) throws SQLException {
        Connection con = null;
        PreparedStatement ps = null;
        String sql = "INSERT INTO companies (name, location, role_offered, contact_email) VALUES (?, ?, ?, ?)";

        try {
            con = DBConnection.getConnection();
            ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, company.getName());
            ps.setString(2, company.getLocation());
            ps.setString(3, company.getRoleOffered());
            ps.setString(4, company.getContactEmail());
            ps.executeUpdate();

            ResultSet rs = ps.getGeneratedKeys();
            if (rs.next()) {
                company.setCompanyId(rs.getInt(1));
            }
        } finally {
            if (ps != null) ps.close();
            DBConnection.closeConnection(con);
        }
    }

    @Override
    public Company getCompanyById(int companyId) throws SQLException {
        Connection con = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        String sql = "SELECT * FROM companies WHERE company_id = ?";

        try {
            con = DBConnection.getConnection();
            ps = con.prepareStatement(sql);
            ps.setInt(1, companyId);
            rs = ps.executeQuery();

            if (rs.next()) {
                return new Company(
                        rs.getInt("company_id"),
                        rs.getString("name"),
                        rs.getString("location"),
                        rs.getString("role_offered"),
                        rs.getString("contact_email")
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
    public List<Company> getAllCompanies() throws SQLException {
        Connection con = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        List<Company> list = new ArrayList<>();
        String sql = "SELECT * FROM companies ORDER BY company_id ASC";

        try {
            con = DBConnection.getConnection();
            ps = con.prepareStatement(sql);
            rs = ps.executeQuery();

            while (rs.next()) {
                Company c = new Company(
                        rs.getInt("company_id"),
                        rs.getString("name"),
                        rs.getString("location"),
                        rs.getString("role_offered"),
                        rs.getString("contact_email")
                );
                list.add(c);
            }
            return list;
        } finally {
            if (rs != null) rs.close();
            if (ps != null) ps.close();
            DBConnection.closeConnection(con);
        }
    }

    @Override
    public void updateCompany(Company company) throws SQLException {
        Connection con = null;
        PreparedStatement ps = null;
        String sql = "UPDATE companies SET name = ?, location = ?, role_offered = ?, contact_email = ? WHERE company_id = ?";

        try {
            con = DBConnection.getConnection();
            ps = con.prepareStatement(sql);
            ps.setString(1, company.getName());
            ps.setString(2, company.getLocation());
            ps.setString(3, company.getRoleOffered());
            ps.setString(4, company.getContactEmail());
            ps.setInt(5, company.getCompanyId());
            ps.executeUpdate();
        } finally {
            if (ps != null) ps.close();
            DBConnection.closeConnection(con);
        }
    }

    @Override
    public void deleteCompany(int companyId) throws SQLException {
        Connection con = null;
        PreparedStatement ps = null;
        String sql = "DELETE FROM companies WHERE company_id = ?";

        try {
            con = DBConnection.getConnection();
            ps = con.prepareStatement(sql);
            ps.setInt(1, companyId);
            ps.executeUpdate();
        } finally {
            if (ps != null) ps.close();
            DBConnection.closeConnection(con);
        }
    }
}
