package dao;

import model.Offer;
import java.sql.SQLException;
import java.util.List;

/**
 * UNIT III: Interfaces
 * Data Access Object contract for Job and Internship Offers.
 */
public interface OfferDAO {
    void addOffer(Offer offer) throws SQLException;
    List<Offer> getAllOffers() throws SQLException;
    Offer getOfferByApplication(int applicationId) throws SQLException;
    void updateOfferStatus(int offerId, String status) throws SQLException;
    void deleteOffer(int offerId) throws SQLException;
}
