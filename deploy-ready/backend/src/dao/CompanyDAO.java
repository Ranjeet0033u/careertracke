package dao;

import model.Company;
import java.sql.SQLException;
import java.util.List;

/**
 * UNIT III: Interfaces & Packages
 * Data Access Object interface defining contracts for company records.
 */
public interface CompanyDAO {
    void addCompany(Company company) throws SQLException;
    Company getCompanyById(int companyId) throws SQLException;
    List<Company> getAllCompanies() throws SQLException;
    void updateCompany(Company company) throws SQLException;
    void deleteCompany(int companyId) throws SQLException;
}
