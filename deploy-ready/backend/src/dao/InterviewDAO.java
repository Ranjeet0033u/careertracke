package dao;

import model.Interview;
import java.sql.SQLException;
import java.util.List;

/**
 * UNIT III: Interfaces
 * Data Access Object contract for Interview schedules and results.
 */
public interface InterviewDAO {
    void addInterview(Interview interview) throws SQLException;
    List<Interview> getAllInterviews() throws SQLException;
    List<Interview> getInterviewsByApplication(int applicationId) throws SQLException;
    void updateResult(int interviewId, String result) throws SQLException;
    void deleteInterview(int interviewId) throws SQLException;
}
