package util;

import model.Application;
import model.Offer;

import java.time.LocalDate;
import java.util.*;
import java.util.function.Predicate;
import java.util.stream.Collectors;

/**
 * UNIT IV & V: Collections, Streams API, Lambda Expressions, and Functional Interfaces
 * Provides statistical reductions, filtering, and grouped reporting on tracker data.
 */
public class ReportUtil {

    // Valid application statuses in the system
    private static final Set<String> VALID_STATUSES = new HashSet<>(Arrays.asList(
            "Applied", "Shortlisted", "Interview Scheduled", "Offered", "Rejected"
    ));

    /**
     * UNIT III: Validates status using if/switch and throws custom InvalidStatusException
     */
    public static void validateStatus(String status) throws InvalidStatusException {
        if (status == null || !VALID_STATUSES.contains(status.trim())) {
            throw new InvalidStatusException("Invalid application status: '" + status 
                    + "'. Allowed: " + VALID_STATUSES);
        }
    }

    /**
     * UNIT V: Functional Interfaces (Predicate) and Stream filter
     */
    public static List<Application> filterApplications(List<Application> applications, 
                                                       Predicate<Application> condition) {
        return applications.stream()
                .filter(condition)
                .collect(Collectors.toList());
    }

    /**
     * UNIT V: Lambda Expressions and Stream filter by Status
     */
    public static List<Application> filterByStatus(List<Application> applications, String status) {
        return filterApplications(applications, app -> app.getStatus().equalsIgnoreCase(status));
    }

    /**
     * UNIT V: Lambda with LocalDate.now() to retrieve upcoming follow-ups (next N days)
     * Sorted in ascending order of follow-up date
     */
    public static List<Application> getUpcomingFollowUps(List<Application> applications, int days) {
        LocalDate today = LocalDate.now();
        LocalDate maxDate = today.plusDays(days);

        return applications.stream()
                .filter(app -> app.getFollowUpDate() != null)
                .filter(app -> !app.getFollowUpDate().isBefore(today) && !app.getFollowUpDate().isAfter(maxDate))
                .sorted(Comparator.comparing(Application::getFollowUpDate))
                .collect(Collectors.toList());
    }

    /**
     * UNIT V: Lambda with LocalDate.now() to retrieve overdue follow-ups
     */
    public static List<Application> getOverdueFollowUps(List<Application> applications) {
        LocalDate today = LocalDate.now();

        return applications.stream()
                .filter(app -> app.getFollowUpDate() != null)
                .filter(app -> app.getFollowUpDate().isBefore(today))
                .sorted(Comparator.comparing(Application::getFollowUpDate))
                .collect(Collectors.toList());
    }

    /**
     * UNIT V: Stream API reduction & Collecting with Collectors.groupingBy and counting()
     * Stored in a Map / HashMap
     */
    public static Map<String, Long> getApplicationsGroupedByStatus(List<Application> applications) {
        return applications.stream()
                .collect(Collectors.groupingBy(Application::getStatus, Collectors.counting()));
    }

    /**
     * UNIT V: Group applications count per company name
     */
    public static Map<String, Long> getApplicationsPerCompany(List<Application> applications) {
        return applications.stream()
                .collect(Collectors.groupingBy(
                        app -> (app.getCompanyName() != null ? app.getCompanyName() : "Unknown"),
                        Collectors.counting()
                ));
    }

    /**
     * UNIT V: mapToDouble().max() and OptionalDouble for the highest package offered
     */
    public static OptionalDouble getHighestPackage(List<Offer> offers) {
        return offers.stream()
                .mapToDouble(Offer::getPackageLpa)
                .max();
    }

    /**
     * UNIT I & V: Computes offer rate percentage (offers / applications * 100)
     */
    public static double calculateOfferRate(int totalOffers, int totalApplications) {
        if (totalApplications == 0) return 0.0;
        return ((double) totalOffers / totalApplications) * 100.0;
    }

    /**
     * UNIT IV: Demonstrates Iterator to traverse Collections (Syllabus topic: Iterator)
     */
    public static void printSummaryReportWithIterator(Map<String, Long> statusCounts) {
        System.out.println("--- Status Breakdown (via Iterator) ---");
        Iterator<Map.Entry<String, Long>> iterator = statusCounts.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<String, Long> entry = iterator.next();
            System.out.println(" * " + entry.getKey() + ": " + entry.getValue());
        }
    }
}
