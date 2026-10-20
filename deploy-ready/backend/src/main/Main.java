package main;

import dao.*;
import model.*;
import util.InvalidStatusException;
import util.ReportUtil;

import java.sql.SQLException;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.*;

/**
 * UNIT I & IV: Java Architecture, Single Entry Point on JVM, and Console Stream I/O
 * Main controller presenting a terminal-driven interactive dashboard for CareerTrack.
 * Note for viva: System.in (InputStream) and System.out (PrintStream) demonstrate
 * Java's underlying byte and character stream architecture wrapped cleanly by java.util.Scanner.
 */
public class Main {

    private static final Scanner scanner = new Scanner(System.in);
    private static final CompanyDAO companyDAO = new CompanyDAOImpl();
    private static final ApplicationDAO applicationDAO = new ApplicationDAOImpl();
    private static final InterviewDAO interviewDAO = new InterviewDAOImpl();
    private static final OfferDAO offerDAO = new OfferDAOImpl();

    public static void main(String[] args) {
        System.out.println("==================================================================");
        System.out.println("         CAREERTRACK — Job & Internship Tracker (Java + MySQL)   ");
        System.out.println("              Student Placement Management System                ");
        System.out.println("==================================================================");

        boolean running = true;
        while (running) {
            printMainMenu();
            System.out.print("Select an option (0-7): ");
            String choice = scanner.nextLine().trim();

            try {
                switch (choice) {
                    case "1":
                        handleCompanyMenu();
                        break;
                    case "2":
                        handleApplicationMenu();
                        break;
                    case "3":
                        handleStatusTracking();
                        break;
                    case "4":
                        handleInterviewMenu();
                        break;
                    case "5":
                        handleFollowUpMenu();
                        break;
                    case "6":
                        handleOfferMenu();
                        break;
                    case "7":
                        handleReportsAndStatistics();
                        break;
                    case "0":
                        running = false;
                        System.out.println("\nThank you for using CareerTrack. Best of luck with placements!");
                        break;
                    default:
                        System.out.println("Invalid option! Please enter a number between 0 and 7.");
                }
            } catch (SQLException e) {
                System.out.println("\n[DATABASE ERROR] " + e.getMessage());
            } catch (Exception e) {
                System.out.println("\n[ERROR] An unexpected error occurred: " + e.getMessage());
            }
            System.out.println();
        }
    }

    private static void printMainMenu() {
        System.out.println("\n----------------- MAIN DASHBOARD MENU -----------------");
        System.out.println("1. Company Management (Add, View, Update, Delete)");
        System.out.println("2. Application Management (Add, View, Search, Delete)");
        System.out.println("3. Status Tracking (Update Application Status)");
        System.out.println("4. Interview Tracking (Schedule, View, Update Result)");
        System.out.println("5. Follow-ups (Upcoming & Overdue Reminders)");
        System.out.println("6. Offer Management (Record Offer, Update Status)");
        System.out.println("7. Reports & Analytics (Streams API & Statistical Summary)");
        System.out.println("0. Exit Application");
        System.out.println("-------------------------------------------------------");
    }

    // =========================================================================
    // 1. COMPANY MANAGEMENT
    // =========================================================================
    private static void handleCompanyMenu() throws SQLException {
        System.out.println("\n--- [1] COMPANY MANAGEMENT ---");
        System.out.println("1. View All Companies");
        System.out.println("2. Add New Company");
        System.out.println("3. Update Company Details");
        System.out.println("4. Delete Company (Cascades to applications)");
        System.out.print("Choose sub-option: ");
        String sub = scanner.nextLine().trim();

        switch (sub) {
            case "1":
                List<Company> list = companyDAO.getAllCompanies();
                if (list.isEmpty()) {
                    System.out.println("No companies recorded yet.");
                } else {
                    System.out.println("\nTotal Registered Companies: " + list.size());
                    for (Company c : list) {
                        System.out.println("  " + c);
                    }
                }
                break;
            case "2":
                System.out.print("Company Name: ");
                String name = scanner.nextLine().trim();
                System.out.print("Location (e.g. Chennai, India): ");
                String loc = scanner.nextLine().trim();
                System.out.print("Role Offered: ");
                String role = scanner.nextLine().trim();
                System.out.print("Contact Email (unique): ");
                String email = scanner.nextLine().trim();

                Company newComp = new Company(name, loc, role, email);
                companyDAO.addCompany(newComp);
                System.out.println("Successfully added company with ID #" + newComp.getCompanyId());
                break;
            case "3":
                System.out.print("Enter Company ID to update: ");
                int compId = Integer.parseInt(scanner.nextLine().trim());
                Company existing = companyDAO.getCompanyById(compId);
                if (existing == null) {
                    System.out.println("Company not found with ID #" + compId);
                    return;
                }
                System.out.print("New Name (leave blank to keep '" + existing.getName() + "'): ");
                String uName = scanner.nextLine().trim();
                if (!uName.isEmpty()) existing.setName(uName);

                System.out.print("New Location (leave blank to keep '" + existing.getLocation() + "'): ");
                String uLoc = scanner.nextLine().trim();
                if (!uLoc.isEmpty()) existing.setLocation(uLoc);

                System.out.print("New Role Offered: ");
                String uRole = scanner.nextLine().trim();
                if (!uRole.isEmpty()) existing.setRoleOffered(uRole);

                System.out.print("New Contact Email: ");
                String uEmail = scanner.nextLine().trim();
                if (!uEmail.isEmpty()) existing.setContactEmail(uEmail);

                companyDAO.updateCompany(existing);
                System.out.println("Company updated successfully.");
                break;
            case "4":
                System.out.print("Enter Company ID to delete: ");
                int delId = Integer.parseInt(scanner.nextLine().trim());
                companyDAO.deleteCompany(delId);
                System.out.println("Company #" + delId + " deleted successfully (cascaded to linked records).");
                break;
            default:
                System.out.println("Invalid company menu option.");
        }
    }

    // =========================================================================
    // 2. APPLICATION MANAGEMENT
    // =========================================================================
    private static void handleApplicationMenu() throws SQLException {
        System.out.println("\n--- [2] APPLICATION MANAGEMENT ---");
        System.out.println("1. View All Applications");
        System.out.println("2. Add New Application (Job / Internship)");
        System.out.println("3. Search Applications (by Company Name or Role)");
        System.out.println("4. Filter Applications by Status");
        System.out.println("5. Delete Application");
        System.out.print("Choose sub-option: ");
        String sub = scanner.nextLine().trim();

        switch (sub) {
            case "1":
                List<Application> apps = applicationDAO.getAllApplications();
                if (apps.isEmpty()) {
                    System.out.println("No applications found.");
                } else {
                    System.out.println("\nTotal Applications: " + apps.size());
                    for (Application a : apps) {
                        // Demonstrating polymorphic method showDetails()
                        System.out.println("  " + a.showDetails() + " [ID: " + a.getApplicationId() + "]");
                    }
                }
                break;
            case "2":
                System.out.print("Enter Company ID: ");
                int companyId = Integer.parseInt(scanner.nextLine().trim());
                System.out.print("Role (e.g. Software Developer Intern): ");
                String role = scanner.nextLine().trim();
                System.out.print("Type ('Job' or 'Internship'): ");
                String type = scanner.nextLine().trim();
                System.out.print("Applied Date (YYYY-MM-DD, e.g. 2026-10-15): ");
                LocalDate appDate = LocalDate.parse(scanner.nextLine().trim());
                System.out.print("Initial Status (Applied / Shortlisted / Interview Scheduled / Offered / Rejected): ");
                String status = scanner.nextLine().trim();
                System.out.print("Follow-up Date (YYYY-MM-DD, or leave blank for none): ");
                String fStr = scanner.nextLine().trim();
                LocalDate fDate = fStr.isEmpty() ? null : LocalDate.parse(fStr);

                Application newApp;
                if ("Job".equalsIgnoreCase(type)) {
                    newApp = new JobApplication(companyId, role, appDate, status, fDate);
                } else {
                    newApp = new InternshipApplication(companyId, role, appDate, status, fDate);
                }

                applicationDAO.addApplication(newApp);
                System.out.println("Application added successfully with ID #" + newApp.getApplicationId());
                break;
            case "3":
                System.out.print("Enter keyword to search: ");
                String keyword = scanner.nextLine().trim();
                List<Application> found = applicationDAO.searchByCompanyOrRole(keyword);
                System.out.println("\nMatching Applications (" + found.size() + "):");
                for (Application a : found) {
                    System.out.println("  " + a);
                }
                break;
            case "4":
                System.out.print("Enter status (Applied / Shortlisted / Interview Scheduled / Offered / Rejected): ");
                String st = scanner.nextLine().trim();
                List<Application> filtered = applicationDAO.filterByStatus(st);
                System.out.println("\nApplications with status '" + st + "' (" + filtered.size() + "):");
                for (Application a : filtered) {
                    System.out.println("  " + a);
                }
                break;
            case "5":
                System.out.print("Enter Application ID to delete: ");
                int delAppId = Integer.parseInt(scanner.nextLine().trim());
                applicationDAO.deleteApplication(delAppId);
                System.out.println("Application #" + delAppId + " deleted successfully.");
                break;
            default:
                System.out.println("Invalid application menu option.");
        }
    }

    // =========================================================================
    // 3. STATUS TRACKING WITH CUSTOM EXCEPTION
    // =========================================================================
    private static void handleStatusTracking() throws SQLException {
        System.out.println("\n--- [3] STATUS TRACKING ---");
        System.out.print("Enter Application ID to update status: ");
        int appId = Integer.parseInt(scanner.nextLine().trim());
        System.out.print("Enter New Status (Applied / Shortlisted / Interview Scheduled / Offered / Rejected): ");
        String newStatus = scanner.nextLine().trim();

        try {
            // UNIT III: Method validates status and throws custom checked InvalidStatusException
            applicationDAO.updateStatus(appId, newStatus);
            System.out.println("Status of Application #" + appId + " successfully updated to: " + newStatus);
        } catch (InvalidStatusException ex) {
            System.out.println("\n[CUSTOM EXCEPTION CAUGHT] " + ex.getMessage());
            System.out.println("Please enter a valid status from the allowed syllabus set.");
        }
    }

    // =========================================================================
    // 4. INTERVIEW TRACKING
    // =========================================================================
    private static void handleInterviewMenu() throws SQLException {
        System.out.println("\n--- [4] INTERVIEW TRACKING ---");
        System.out.println("1. View All Scheduled Interviews");
        System.out.println("2. Schedule New Interview");
        System.out.println("3. Update Interview Result (Pending / Cleared / Rejected)");
        System.out.println("4. Delete Interview Record");
        System.out.print("Choose sub-option: ");
        String sub = scanner.nextLine().trim();

        switch (sub) {
            case "1":
                List<Interview> ivs = interviewDAO.getAllInterviews();
                if (ivs.isEmpty()) {
                    System.out.println("No interview records found.");
                } else {
                    System.out.println("\nTotal Interviews: " + ivs.size());
                    for (Interview iv : ivs) {
                        System.out.println("  " + iv);
                    }
                }
                break;
            case "2":
                System.out.print("Enter Application ID: ");
                int appId = Integer.parseInt(scanner.nextLine().trim());
                System.out.print("Interview Date (YYYY-MM-DD): ");
                LocalDate ivDate = LocalDate.parse(scanner.nextLine().trim());
                System.out.print("Round (Aptitude / Technical / HR): ");
                String round = scanner.nextLine().trim();
                System.out.print("Result (Pending / Cleared / Rejected) [Default: Pending]: ");
                String result = scanner.nextLine().trim();
                if (result.isEmpty()) result = "Pending";

                Interview newIv = new Interview(appId, ivDate, round, result);
                interviewDAO.addInterview(newIv);
                System.out.println("Interview scheduled successfully with ID #" + newIv.getInterviewId());
                break;
            case "3":
                System.out.print("Enter Interview ID to update: ");
                int ivId = Integer.parseInt(scanner.nextLine().trim());
                System.out.print("Enter Result (Pending / Cleared / Rejected): ");
                String res = scanner.nextLine().trim();
                interviewDAO.updateResult(ivId, res);
                System.out.println("Interview #" + ivId + " result updated to " + res);
                break;
            case "4":
                System.out.print("Enter Interview ID to delete: ");
                int delIvId = Integer.parseInt(scanner.nextLine().trim());
                interviewDAO.deleteInterview(delIvId);
                System.out.println("Interview #" + delIvId + " deleted successfully.");
                break;
            default:
                System.out.println("Invalid interview option.");
        }
    }

    // =========================================================================
    // 5. FOLLOW-UP DATES (STREAMS & LAMBDAS)
    // =========================================================================
    private static void handleFollowUpMenu() throws SQLException {
        System.out.println("\n--- [5] FOLLOW-UP DATES ---");
        System.out.println("1. View Upcoming Follow-ups (Next 7 Days)");
        System.out.println("2. View Overdue Follow-ups (Past Due)");
        System.out.println("3. Set / Update Follow-up Date on an Application");
        System.out.print("Choose sub-option: ");
        String sub = scanner.nextLine().trim();

        List<Application> all = applicationDAO.getAllApplications();

        switch (sub) {
            case "1":
                // UNIT V: Stream API filter and sorted by follow-up date
                List<Application> upcoming = ReportUtil.getUpcomingFollowUps(all, 7);
                System.out.println("\nUpcoming Follow-ups (Next 7 Days): " + upcoming.size());
                if (upcoming.isEmpty()) {
                    System.out.println("  No upcoming follow-ups in the next 7 days.");
                } else {
                    for (Application a : upcoming) {
                        System.out.println("  * " + a.getRole() + " at " + a.getCompanyName() + 
                                " -> Follow-up Date: " + a.getFollowUpDate());
                    }
                }
                break;
            case "2":
                // UNIT V: Lambda with LocalDate.now()
                List<Application> overdue = ReportUtil.getOverdueFollowUps(all);
                System.out.println("\nOverdue Follow-ups: " + overdue.size());
                if (overdue.isEmpty()) {
                    System.out.println("  No overdue follow-ups. You are all caught up!");
                } else {
                    for (Application a : overdue) {
                        System.out.println("  [OVERDUE] " + a.getRole() + " at " + a.getCompanyName() + 
                                " -> Was due on: " + a.getFollowUpDate());
                    }
                }
                break;
            case "3":
                System.out.print("Enter Application ID: ");
                int appId = Integer.parseInt(scanner.nextLine().trim());
                System.out.print("Enter Follow-up Date (YYYY-MM-DD): ");
                LocalDate fDate = LocalDate.parse(scanner.nextLine().trim());
                applicationDAO.setFollowUpDate(appId, fDate);
                System.out.println("Follow-up date updated successfully.");
                break;
            default:
                System.out.println("Invalid follow-up option.");
        }
    }

    // =========================================================================
    // 6. OFFER MANAGEMENT
    // =========================================================================
    private static void handleOfferMenu() throws SQLException {
        System.out.println("\n--- [6] OFFER MANAGEMENT ---");
        System.out.println("1. View All Received Offers");
        System.out.println("2. Record New Offer");
        System.out.println("3. Update Offer Decision (Accepted / Rejected / Pending)");
        System.out.println("4. View Highest Package (via Streams mapToDouble().max())");
        System.out.println("5. Delete Offer Record");
        System.out.print("Choose sub-option: ");
        String sub = scanner.nextLine().trim();

        switch (sub) {
            case "1":
                List<Offer> offers = offerDAO.getAllOffers();
                if (offers.isEmpty()) {
                    System.out.println("No offers recorded yet.");
                } else {
                    System.out.println("\nOffers Received: " + offers.size());
                    for (Offer o : offers) {
                        System.out.println("  " + o);
                    }
                }
                break;
            case "2":
                System.out.print("Enter Application ID: ");
                int appId = Integer.parseInt(scanner.nextLine().trim());
                System.out.print("Package in LPA (e.g. 12.00): ");
                double pkg = Double.parseDouble(scanner.nextLine().trim());
                System.out.print("Decision Deadline (YYYY-MM-DD): ");
                LocalDate deadline = LocalDate.parse(scanner.nextLine().trim());
                System.out.print("Offer Status (Pending / Accepted / Rejected) [Default: Pending]: ");
                String st = scanner.nextLine().trim();
                if (st.isEmpty()) st = "Pending";

                Offer newOffer = new Offer(appId, pkg, deadline, st);
                offerDAO.addOffer(newOffer);
                System.out.println("Offer recorded successfully with ID #" + newOffer.getOfferId());
                break;
            case "3":
                System.out.print("Enter Offer ID: ");
                int offId = Integer.parseInt(scanner.nextLine().trim());
                System.out.print("Enter Decision (Accepted / Rejected / Pending): ");
                String dec = scanner.nextLine().trim();
                offerDAO.updateOfferStatus(offId, dec);
                System.out.println("Offer #" + offId + " updated to " + dec);
                break;
            case "4":
                List<Offer> allOffers = offerDAO.getAllOffers();
                OptionalDouble highest = ReportUtil.getHighestPackage(allOffers);
                if (highest.isPresent()) {
                    System.out.printf("\n>>> HIGHEST PACKAGE OFFERED: ₹ %.2f LPA <<<\n", highest.getAsDouble());
                } else {
                    System.out.println("No offers received yet.");
                }
                break;
            case "5":
                System.out.print("Enter Offer ID to delete: ");
                int delOffId = Integer.parseInt(scanner.nextLine().trim());
                offerDAO.deleteOffer(delOffId);
                System.out.println("Offer #" + delOffId + " deleted successfully.");
                break;
            default:
                System.out.println("Invalid offer menu option.");
        }
    }

    // =========================================================================
    // 7. REPORTS AND STATISTICS (STREAMS API & COLLECTIONS)
    // =========================================================================
    private static void handleReportsAndStatistics() throws SQLException {
        System.out.println("\n=======================================================");
        System.out.println("           CAREERTRACK ANALYTICAL REPORTS              ");
        System.out.println("      (Generated via Java Streams API & Collections)   ");
        System.out.println("=======================================================");

        List<Application> apps = applicationDAO.getAllApplications();
        List<Interview> ivs = interviewDAO.getAllInterviews();
        List<Offer> offers = offerDAO.getAllOffers();

        // 1. Overall Metric Counts
        long totalApps = apps.size();
        long totalInterviews = ivs.size();
        long totalOffers = offers.size();
        long totalRejections = apps.stream()
                .filter(a -> "Rejected".equalsIgnoreCase(a.getStatus()))
                .count();

        System.out.println("\n[KEY METRICS]");
        System.out.println(" - Total Applications : " + totalApps);
        System.out.println(" - Total Interviews   : " + totalInterviews);
        System.out.println(" - Offers Received    : " + totalOffers);
        System.out.println(" - Total Rejections   : " + totalRejections);

        // 2. Applications Grouped by Status (Collectors.groupingBy & counting)
        Map<String, Long> statusCounts = ReportUtil.getApplicationsGroupedByStatus(apps);
        System.out.println("\n[APPLICATIONS BY STATUS] (Collectors.groupingBy)");
        ReportUtil.printSummaryReportWithIterator(statusCounts);

        // 3. Applications per Company
        Map<String, Long> companyCounts = ReportUtil.getApplicationsPerCompany(apps);
        System.out.println("\n[APPLICATIONS BY COMPANY]");
        companyCounts.forEach((comp, count) -> 
            System.out.printf(" * %-22s : %d applications\n", comp, count)
        );

        // 4. Offer Rate Percentage
        double offerRate = ReportUtil.calculateOfferRate((int) totalOffers, (int) totalApps);
        System.out.printf("\n[OFFER RATE] : %.1f%% (%d offers out of %d applications)\n", 
                offerRate, totalOffers, totalApps);

        // 5. Highest Package
        OptionalDouble highestPkg = ReportUtil.getHighestPackage(offers);
        if (highestPkg.isPresent()) {
            System.out.printf("[HIGHEST PACKAGE] : ₹ %.2f LPA\n", highestPkg.getAsDouble());
        } else {
            System.out.println("[HIGHEST PACKAGE] : No offers recorded yet.");
        }
        System.out.println("=======================================================");
    }
}
