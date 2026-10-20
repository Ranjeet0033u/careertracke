package util;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import dao.*;
import model.*;

import java.io.*;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.SecureRandom;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * UNIT V & INTEGRATION: Java HTTP Server connecting Frontend HTML directly to DAOs.
 * Uses standard JDK com.sun.net.httpserver (no external frameworks required).
 * 
 * Features:
 *  - Serves static mascot.png with image/png MIME type
 *  - Provides User Authentication (Sign In, Register User / Sign Up, Logout) with PBKDF2 hashing
 *  - Enforces UNIQUE Account Names via normalized_name (trimming, whitespace collapse, lowercase Locale.ROOT)
 *  - Enforces UNIQUE Email addresses at both application and MySQL database constraints
 *  - Manages secure server-side user sessions via unpredictable tokens & HTTP-only cookies
 *  - Protects the dashboard and all data-modifying POST routes from unauthenticated access
 *  - Serves dynamic HTML responses by querying MySQL through DAOs
 *  - Processes native HTML GET (search/filter) and POST (add, update, delete) form submissions
 *  - Redirects (HTTP 303) back to appropriate view anchors (/#companies, /#applications, etc.)
 *  - Escapes all HTML values to prevent broken markup or HTML injection
 */
public class WebServer {

    private static final int PORT = 8080;
    private static final CompanyDAO companyDAO = new CompanyDAOImpl();
    private static final ApplicationDAO applicationDAO = new ApplicationDAOImpl();
    private static final InterviewDAO interviewDAO = new InterviewDAOImpl();
    private static final OfferDAO offerDAO = new OfferDAOImpl();
    private static final UserDAO userDAO = new UserDAOImpl();

    // =========================================================================
    // SERVER-SIDE SESSION MANAGEMENT
    // =========================================================================

    /**
     * Session record holding authenticated user details in server memory.
     */
    public static class UserSession {
        private final String token;
        private final int userId;
        private final String fullName;
        private final String normalizedName;
        private final String email;
        private final long createdAtMillis;

        public UserSession(String token, int userId, String fullName, String normalizedName, String email) {
            this.token = token;
            this.userId = userId;
            this.fullName = fullName;
            this.normalizedName = normalizedName;
            this.email = email;
            this.createdAtMillis = System.currentTimeMillis();
        }

        public String getToken() { return token; }
        public int getUserId() { return userId; }
        public String getFullName() { return fullName; }
        public String getNormalizedName() { return normalizedName; }
        public String getEmail() { return email; }
        public long getCreatedAtMillis() { return createdAtMillis; }
    }

    // In-memory map of active sessions indexed by unpredictable session token
    private static final Map<String, UserSession> activeSessions = new ConcurrentHashMap<>();
    private static final SecureRandom SESSION_RANDOM = new SecureRandom();
    private static final String SESSION_COOKIE_NAME = "CT_SESSION";

    /**
     * Normalizes an account name per specification:
     * Trims leading/trailing spaces, collapses repeated internal spaces,
     * and normalizes to lowercase using Locale.ROOT.
     * E.g. "  Ramya   " -> "ramya", "Ramya" -> "ramya".
     */
    public static String normalizeAccountName(String rawName) {
        if (rawName == null) return "";
        return rawName.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    /**
     * Generates a 256-bit cryptographically unpredictable session token.
     */
    private static String generateSessionToken() {
        byte[] bytes = new byte[32];
        SESSION_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /**
     * Extracts session token from incoming HTTP "Cookie" header.
     */
    private static String getSessionTokenFromCookie(HttpExchange exchange) {
        List<String> cookieHeaders = exchange.getRequestHeaders().get("Cookie");
        if (cookieHeaders != null) {
            for (String header : cookieHeaders) {
                String[] cookies = header.split(";");
                for (String cookie : cookies) {
                    String[] parts = cookie.trim().split("=", 2);
                    if (parts.length == 2 && SESSION_COOKIE_NAME.equals(parts[0].trim())) {
                        return parts[1].trim();
                    }
                }
            }
        }
        return null;
    }

    /**
     * Returns the active UserSession for this request, or null if unauthenticated.
     */
    private static UserSession getAuthenticatedSession(HttpExchange exchange) {
        String token = getSessionTokenFromCookie(exchange);
        if (token == null || token.isEmpty()) {
            return null;
        }
        return activeSessions.get(token);
    }

    /**
     * Constructs a secure Set-Cookie header value.
     */
    private static String buildSessionCookieHeader(String token, boolean delete, HttpExchange exchange) {
        StringBuilder sb = new StringBuilder();
        sb.append(SESSION_COOKIE_NAME).append("=").append(delete ? "" : token);
        sb.append("; Path=/; HttpOnly; SameSite=Lax");
        if (delete) {
            sb.append("; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT");
        } else {
            sb.append("; Max-Age=86400"); // 24 hours
        }

        // Add Secure attribute when accessed over HTTPS
        List<String> proto = exchange.getRequestHeaders().get("X-Forwarded-Proto");
        if ((proto != null && !proto.isEmpty() && "https".equalsIgnoreCase(proto.get(0)))
                || "https".equalsIgnoreCase(exchange.getRequestURI().getScheme())) {
            sb.append("; Secure");
        }
        return sb.toString();
    }

    // =========================================================================
    // SERVER ENTRY POINT
    // =========================================================================

    public static void main(String[] args) {
        try {
            start();
        } catch (IOException e) {
            System.err.println("Could not start CareerTrack WebServer: " + e.getMessage());
        }
    }

    public static void start() throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
        System.out.println("==================================================================");
        System.out.println("   CAREERTRACK WEB SERVER RUNNING ON: http://localhost:" + PORT);
        System.out.println("   Open http://localhost:" + PORT + " in your web browser");
        System.out.println("==================================================================");

        // Authentication routes (GET pages & POST form actions)
        server.createContext("/signin", new SignInHandler());
        server.createContext("/signup", new SignUpHandler());
        server.createContext("/logout", new LogoutHandler());

        // Serve main HTML view and searches (Protected)
        server.createContext("/", new RootHandler());

        // Serve mascot image (Public)
        server.createContext("/mascot.png", new MascotHandler());

        // Serve auth visual hero image (Public)
        server.createContext("/assets/aistudio/image_103eb014.png", new AuthImageHandler());

        // Serve demo credentials file (Public)
        server.createContext("/demo-file", new DemoFileHandler());
        server.createContext("/demo-file.json", new DemoFileHandler());
        server.createContext("/demo-account.json", new DemoFileHandler());

        // POST Form Action Routes for Applications (Protected)
        server.createContext("/add-application", new AddApplicationHandler());
        server.createContext("/update-application", new UpdateApplicationHandler());
        server.createContext("/update-application-status", new UpdateAppStatusHandler());
        server.createContext("/delete-application", new DeleteApplicationHandler());

        // POST Form Action Routes for Interviews (Protected)
        server.createContext("/add-interview", new AddInterviewHandler());
        server.createContext("/update-interview-result", new UpdateInterviewResultHandler());
        server.createContext("/delete-interview", new DeleteInterviewHandler());

        // POST Form Action Routes for Follow-ups (Protected)
        server.createContext("/add-followup", new AddFollowUpHandler());

        // POST Form Action Routes for Offers (Protected)
        server.createContext("/add-offer", new AddOfferHandler());
        server.createContext("/update-offer-status", new UpdateOfferStatusHandler());
        server.createContext("/delete-offer", new DeleteOfferHandler());

        server.setExecutor(null); // Default worker executor
        server.start();
    }

    // =========================================================================
    // UTILITY HELPERS (HTML Escaping, Form Decoding, Redirects)
    // =========================================================================

    /**
     * Prevents HTML injection and broken markup by escaping special characters.
     */
    public static String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;")
                   .replace("'", "&#39;");
    }

    /**
     * Parses application/x-www-form-urlencoded POST body into a key-value Map.
     */
    private static Map<String, String> parseFormData(HttpExchange exchange) throws IOException {
        InputStream is = exchange.getRequestBody();
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        byte[] buffer = new byte[1024];
        int len;
        while ((len = is.read(buffer)) != -1) {
            baos.write(buffer, 0, len);
        }
        String body = new String(baos.toByteArray(), StandardCharsets.UTF_8);

        Map<String, String> map = new HashMap<>();
        if (!body.isEmpty()) {
            String[] pairs = body.split("&");
            for (String pair : pairs) {
                String[] parts = pair.split("=", 2);
                String key = URLDecoder.decode(parts[0], StandardCharsets.UTF_8);
                String value = parts.length > 1 ? URLDecoder.decode(parts[1], StandardCharsets.UTF_8) : "";
                map.put(key.trim(), value.trim());
            }
        }
        return map;
    }

    /**
     * Parses URL query string from GET requests (e.g. ?search=abc&status=Applied).
     */
    private static Map<String, String> parseQueryParams(String query) {
        Map<String, String> map = new HashMap<>();
        if (query != null && !query.isEmpty()) {
            String[] pairs = query.split("&");
            for (String pair : pairs) {
                String[] parts = pair.split("=", 2);
                String key = URLDecoder.decode(parts[0], StandardCharsets.UTF_8);
                String value = parts.length > 1 ? URLDecoder.decode(parts[1], StandardCharsets.UTF_8) : "";
                map.put(key.trim(), value.trim());
            }
        }
        return map;
    }

    /**
     * Sends HTTP 303 (See Other) redirect.
     */
    private static void sendRedirect(HttpExchange exchange, String location) throws IOException {
        exchange.getResponseHeaders().set("Location", location);
        exchange.sendResponseHeaders(303, -1);
        exchange.close();
    }

    /**
     * Sends an HTML string response with UTF-8 character encoding.
     */
    private static void sendHtmlResponse(HttpExchange exchange, int statusCode, String html) throws IOException {
        byte[] bytes = html.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/html; charset=UTF-8");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        OutputStream os = exchange.getResponseBody();
        os.write(bytes);
        os.close();
    }

    // =========================================================================
    // HANDLER: SERVE MASCOT ICON
    // =========================================================================
    static class MascotHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            File file = new File("frontend/mascot.png");
            if (!file.exists()) {
                file = new File("mascot.png");
            }
            if (file.exists()) {
                byte[] bytes = Files.readAllBytes(file.toPath());
                exchange.getResponseHeaders().set("Content-Type", "image/png");
                exchange.sendResponseHeaders(200, bytes.length);
                OutputStream os = exchange.getResponseBody();
                os.write(bytes);
                os.close();
            } else {
                exchange.sendResponseHeaders(404, -1);
                exchange.close();
            }
        }
    }

    // =========================================================================
    // HANDLER: SERVE AUTH HERO VISUAL IMAGE
    // =========================================================================
    static class AuthImageHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            File file = new File("public/assets/aistudio/image_103eb014.png");
            if (!file.exists()) {
                file = new File("frontend/assets/aistudio/image_103eb014.png");
            }
            if (!file.exists()) {
                file = new File("assets/aistudio/image_103eb014.png");
            }
            if (file.exists()) {
                byte[] bytes = Files.readAllBytes(file.toPath());
                exchange.getResponseHeaders().set("Content-Type", "image/png");
                exchange.sendResponseHeaders(200, bytes.length);
                OutputStream os = exchange.getResponseBody();
                os.write(bytes);
                os.close();
            } else {
                exchange.sendResponseHeaders(404, -1);
                exchange.close();
            }
        }
    }

    // =========================================================================
    // HANDLER: SERVE DEMO CREDENTIALS FILE (JSON)
    // =========================================================================
    static class DemoFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            File file = new File("public/demo-file.json");
            if (!file.exists()) {
                file = new File("demo-file.json");
            }

            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
            if (file.exists()) {
                byte[] bytes = Files.readAllBytes(file.toPath());
                exchange.sendResponseHeaders(200, bytes.length);
                OutputStream os = exchange.getResponseBody();
                os.write(bytes);
                os.close();
            } else {
                String fallbackJson = "{\"system\":\"CareerTrack Application Tracker\",\"demoUser\":{\"fullName\":\"Ramya Ranjith\",\"email\":\"ramya@college.edu\",\"password\":\"password123\"}}";
                byte[] bytes = fallbackJson.getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(200, bytes.length);
                OutputStream os = exchange.getResponseBody();
                os.write(bytes);
                os.close();
            }
        }
    }

    // =========================================================================
    // AUTHENTICATION: SIGN IN HANDLER (GET /signin & POST /signin)
    // =========================================================================
    static class SignInHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String method = exchange.getRequestMethod();

            if ("GET".equalsIgnoreCase(method)) {
                // If user already holds a valid session, redirect immediately to dashboard
                if (getAuthenticatedSession(exchange) != null) {
                    sendRedirect(exchange, "/");
                    return;
                }

                Map<String, String> qParams = parseQueryParams(exchange.getRequestURI().getRawQuery());
                String error = qParams.getOrDefault("error", "");
                boolean registered = "true".equalsIgnoreCase(qParams.get("registered"));

                String html = renderSignInPage(error, registered);
                sendHtmlResponse(exchange, 200, html);
                return;
            }

            if ("POST".equalsIgnoreCase(method)) {
                Map<String, String> data = parseFormData(exchange);
                String email = data.getOrDefault("email", "").trim().toLowerCase();
                String password = data.getOrDefault("password", "");

                // Basic validation
                if (email.isEmpty() || password.isEmpty()) {
                    sendRedirect(exchange, "/signin?error=Please+enter+both+email+and+password.");
                    return;
                }

                try {
                    // Look up user in database by unique email
                    User user = userDAO.getUserByEmail(email);

                    // Verify password using PBKDF2WithHmacSHA256 and constant-time comparison
                    if (user != null && PasswordUtil.verifyPassword(password, user.getPasswordHash())) {
                        // Generate unpredictable session token
                        String token = generateSessionToken();
                        UserSession session = new UserSession(token, user.getUserId(), user.getFullName(), user.getNormalizedName(), user.getEmail());
                        activeSessions.put(token, session);

                        // Attach session cookie and redirect to dashboard
                        exchange.getResponseHeaders().add("Set-Cookie", buildSessionCookieHeader(token, false, exchange));
                        sendRedirect(exchange, "/");
                        return;
                    } else {
                        // Generic error message prevents account enumeration
                        sendRedirect(exchange, "/signin?error=Invalid+email+or+password.+Please+try+again.");
                        return;
                    }
                } catch (SQLException e) {
                    System.err.println("Database error during sign-in: " + e.getMessage());
                    sendRedirect(exchange, "/signin?error=A+database+error+occurred.+Please+try+again+later.");
                    return;
                }
            }

            exchange.sendResponseHeaders(405, -1);
            exchange.close();
        }
    }

    // =========================================================================
    // AUTHENTICATION: REGISTER USER / SIGN UP (GET /signup & POST /signup)
    // =========================================================================
    static class SignUpHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String method = exchange.getRequestMethod();

            if ("GET".equalsIgnoreCase(method)) {
                // If user is already authenticated, redirect to dashboard
                if (getAuthenticatedSession(exchange) != null) {
                    sendRedirect(exchange, "/");
                    return;
                }

                Map<String, String> qParams = parseQueryParams(exchange.getRequestURI().getRawQuery());
                String error = qParams.getOrDefault("error", "");

                String html = renderSignUpPage(error);
                sendHtmlResponse(exchange, 200, html);
                return;
            }

            if ("POST".equalsIgnoreCase(method)) {
                Map<String, String> data = parseFormData(exchange);
                String rawFullName = data.getOrDefault("fullName", "");
                String email = data.getOrDefault("email", "").trim().toLowerCase();
                String password = data.getOrDefault("password", "");
                String confirmPassword = data.getOrDefault("confirmPassword", "");

                // Form validation
                if (rawFullName.trim().isEmpty()) {
                    sendRedirect(exchange, "/signup?error=Please+enter+your+full+name.");
                    return;
                }
                if (email.isEmpty() || !email.contains("@") || !email.contains(".")) {
                    sendRedirect(exchange, "/signup?error=Please+enter+a+valid+email+address.");
                    return;
                }
                if (password.length() < 6) {
                    sendRedirect(exchange, "/signup?error=Password+must+be+at+least+6+characters+long.");
                    return;
                }
                if (!password.equals(confirmPassword)) {
                    sendRedirect(exchange, "/signup?error=Passwords+do+not+match.+Please+try+again.");
                    return;
                }

                // Account Name Normalization:
                // Trim leading/trailing spaces, collapse repeated internal spaces, and lowercase Locale.ROOT
                String normalizedName = normalizeAccountName(rawFullName);
                String trimmedFullName = rawFullName.trim().replaceAll("\\s+", " ");

                if (normalizedName.isEmpty()) {
                    sendRedirect(exchange, "/signup?error=Please+enter+a+valid+name.");
                    return;
                }

                try {
                    // Check whether normalized account name already exists (unique name enforcement)
                    if (userDAO.normalizedNameExists(normalizedName)) {
                        sendRedirect(exchange, "/signup?error=This+account+name+is+already+taken.+Please+choose+a+different+name.");
                        return;
                    }

                    // Check whether email already exists (unique email enforcement)
                    if (userDAO.emailExists(email)) {
                        sendRedirect(exchange, "/signup?error=This+email+is+already+registered.+Please+sign+in+instead.");
                        return;
                    }

                    // Securely hash password using PBKDF2WithHmacSHA256 with unique random salt
                    String passwordHash = PasswordUtil.hashPassword(password);

                    // Insert user record into MySQL user_details table
                    User newUser = new User(trimmedFullName, normalizedName, email, passwordHash);
                    userDAO.registerUser(newUser);

                    // Direct user to Sign In with success notice
                    sendRedirect(exchange, "/signin?registered=true");
                    return;

                } catch (SQLException e) {
                    System.err.println("Database error during registration: " + e.getMessage());
                    // Gracefully handle database-level duplicate constraints (e.g. race conditions)
                    String msg = e.getMessage().toLowerCase();
                    if (msg.contains("normalized_name") || msg.contains("uq_user_normalized_name")) {
                        sendRedirect(exchange, "/signup?error=This+account+name+is+already+taken.+Please+choose+a+different+name.");
                    } else if (msg.contains("email") || e.getErrorCode() == 1062) {
                        sendRedirect(exchange, "/signup?error=This+email+is+already+registered.+Please+sign+in+instead.");
                    } else {
                        sendRedirect(exchange, "/signup?error=Registration+could+not+be+completed.+Please+try+again.");
                    }
                    return;
                }
            }

            exchange.sendResponseHeaders(405, -1);
            exchange.close();
        }
    }

    // =========================================================================
    // AUTHENTICATION: LOGOUT HANDLER (POST /logout & GET /logout)
    // =========================================================================
    static class LogoutHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String token = getSessionTokenFromCookie(exchange);
            if (token != null) {
                activeSessions.remove(token);
            }
            // Clear session cookie and redirect to sign-in page
            exchange.getResponseHeaders().add("Set-Cookie", buildSessionCookieHeader("", true, exchange));
            sendRedirect(exchange, "/signin");
        }
    }

    // =========================================================================
    // HANDLER: ROOT (DYNAMIC HTML RENDERING & GET SEARCH/FILTER) - PROTECTED
    // =========================================================================
    static class RootHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String path = exchange.getRequestURI().getPath();
            if (!path.equals("/") && !path.equals("/index.html")) {
                exchange.sendResponseHeaders(404, -1);
                exchange.close();
                return;
            }

            // Authentication Guard: Redirect unauthenticated requests to /signin
            UserSession currentSession = getAuthenticatedSession(exchange);
            if (currentSession == null) {
                sendRedirect(exchange, "/signin");
                return;
            }

            try {
                // Read base HTML file
                String htmlPath = "frontend/index.html";
                if (!new File(htmlPath).exists()) {
                    htmlPath = "index.html";
                }
                String htmlContent = new String(Files.readAllBytes(Paths.get(htmlPath)), StandardCharsets.UTF_8);

                // Check GET search & filter params
                String rawQuery = exchange.getRequestURI().getRawQuery();
                Map<String, String> qParams = parseQueryParams(rawQuery);
                String searchKw = qParams.getOrDefault("search", "");
                String statusFilter = qParams.getOrDefault("status", "");
                String typeFilter = qParams.getOrDefault("type", "");

                // Fetch Database Data via DAOs
                List<Company> companies = companyDAO.getAllCompanies();
                List<Application> allApplications = applicationDAO.getAllApplications();
                List<Interview> interviews = interviewDAO.getAllInterviews();
                List<Offer> offers = offerDAO.getAllOffers();

                // If searching/filtering, get filtered list for Applications view
                List<Application> displayedApplications;
                if (!searchKw.isEmpty() || !statusFilter.isEmpty() || !typeFilter.isEmpty()) {
                    displayedApplications = applicationDAO.searchAndFilter(searchKw, statusFilter, typeFilter);
                } else {
                    displayedApplications = allApplications;
                }

                // Calculate Analytics & Reports
                long totalApps = allApplications.size();
                long totalInterviews = interviews.size();
                long totalOffers = offers.size();
                long totalRejections = allApplications.stream()
                        .filter(a -> "Rejected".equalsIgnoreCase(a.getStatus()))
                        .count();
                double offerRate = ReportUtil.calculateOfferRate((int) totalOffers, (int) totalApps);
                OptionalDouble highestPkgOpt = ReportUtil.getHighestPackage(offers);
                double highestPkg = highestPkgOpt.isPresent() ? highestPkgOpt.getAsDouble() : 0.0;

                // Follow-ups calculations
                List<Application> overdueList = ReportUtil.getOverdueFollowUps(allApplications);
                List<Application> upcomingList = ReportUtil.getUpcomingFollowUps(allApplications, 7);
                int overdueCount = overdueList.size();
                String overdueBadge = overdueCount > 0 
                        ? "<span class='badge badge-danger-alert'>" + overdueCount + " overdue</span>" 
                        : "<span class='badge badge-applied'>All clear</span>";

                String interviewSubtext = totalInterviews > 0 ? totalInterviews + " scheduled" : "No interviews yet";
                String offersSubtext = totalOffers > 0 ? totalOffers + " recorded" : "No offers yet";

                // Filter & Search view persistence
                boolean hasFilter = !searchKw.isEmpty() || !statusFilter.isEmpty() || !typeFilter.isEmpty();
                String viewOverride = "";
                if (hasFilter) {
                    viewOverride = "<style>" +
                                   "#dashboard { display: none !important; }" +
                                   "#applications { display: block !important; }" +
                                   ".nav-dashboard { background-color: transparent !important; color: #94A3B8 !important; }" +
                                   ".nav-applications { background-color: var(--sidebar-active) !important; color: #FFFFFF !important; }" +
                                   "</style>";
                }

                // Build Dynamic HTML Rows and Placeholders
                String companiesTableRows = renderCompaniesTable(companies);
                String companySelectOptions = renderCompanyOptions(companies);
                String applicationsTableRows = renderApplicationsTable(displayedApplications);
                String applicationSelectOptions = renderApplicationOptions(allApplications);
                String interviewsTableRows = renderInterviewsTable(interviews);
                String overdueFollowupsRows = renderFollowUpsRows(overdueList, true);
                String upcomingFollowupsRows = renderFollowUpsRows(upcomingList, false);
                String offersTableRows = renderOffersTable(offers);
                String highestPackageHtml = renderHighestPackageBanner(offers);
                String statusBreakdownHtml = renderStatusBars(ReportUtil.getApplicationsGroupedByStatus(allApplications), totalApps);
                String companyBreakdownHtml = renderCompanyBars(ReportUtil.getApplicationsPerCompany(allApplications), totalApps);

                String recentApplicationsRows = renderRecentApplications(allApplications);
                String upcomingInterviewsRows = renderUpcomingInterviews(interviews);

                // Inject dynamic content into HTML template
                String rendered = htmlContent;

                // Replace Authenticated User Profile details
                String userName = currentSession.getFullName();
                String userInitial = userName.isEmpty() ? "U" : String.valueOf(userName.charAt(0)).toUpperCase();
                String userEmail = currentSession.getEmail();

                rendered = rendered.replace("{{USER_NAME}}", escapeHtml(userName))
                                   .replace("{{USER_INITIAL}}", escapeHtml(userInitial))
                                   .replace("{{USER_EMAIL}}", escapeHtml(userEmail));

                // Replace Dashboard Metric Numbers & Subtexts
                rendered = rendered.replace("{{TOTAL_APPS}}", String.valueOf(totalApps))
                                   .replace("{{TOTAL_INTERVIEWS}}", String.valueOf(totalInterviews))
                                   .replace("{{TOTAL_OFFERS}}", String.valueOf(totalOffers))
                                   .replace("{{TOTAL_REJECTIONS}}", String.valueOf(totalRejections))
                                   .replace("{{OFFER_RATE}}", String.format("%.1f", offerRate))
                                   .replace("{{HIGHEST_PACKAGE}}", String.format("%.2f", highestPkg))
                                   .replace("{{INTERVIEWS_SUBTEXT}}", escapeHtml(interviewSubtext))
                                   .replace("{{OFFERS_SUBTEXT}}", escapeHtml(offersSubtext))
                                   .replace("{{OVERDUE_COUNT_BADGE}}", overdueBadge);

                // Replace Search / Filter Persistence
                rendered = rendered.replace("<!-- DYNAMIC_VIEW_OVERRIDE -->", viewOverride)
                                   .replace("{{SEARCH_QUERY}}", escapeHtml(searchKw))
                                   .replace("{{STATUS_APPLIED_SELECTED}}", "Applied".equalsIgnoreCase(statusFilter) ? "selected" : "")
                                   .replace("{{STATUS_SHORTLISTED_SELECTED}}", "Shortlisted".equalsIgnoreCase(statusFilter) ? "selected" : "")
                                   .replace("{{STATUS_INTERVIEW_SELECTED}}", "Interview Scheduled".equalsIgnoreCase(statusFilter) ? "selected" : "")
                                   .replace("{{STATUS_OFFERED_SELECTED}}", "Offered".equalsIgnoreCase(statusFilter) ? "selected" : "")
                                   .replace("{{STATUS_REJECTED_SELECTED}}", "Rejected".equalsIgnoreCase(statusFilter) ? "selected" : "")
                                   .replace("{{TYPE_JOB_SELECTED}}", "Job".equalsIgnoreCase(typeFilter) ? "selected" : "")
                                   .replace("{{TYPE_INTERNSHIP_SELECTED}}", "Internship".equalsIgnoreCase(typeFilter) ? "selected" : "");

                // Replace Tables & Dropdown Placeholders
                rendered = rendered.replace("<!-- DYNAMIC_COMPANIES_ROWS -->", companiesTableRows)
                                   .replace("<!-- DYNAMIC_COMPANY_OPTIONS -->", companySelectOptions)
                                   .replace("<!-- DYNAMIC_APPLICATIONS_ROWS -->", applicationsTableRows)
                                   .replace("<!-- DYNAMIC_RECENT_APPLICATIONS -->", recentApplicationsRows)
                                   .replace("<!-- DYNAMIC_APPLICATION_OPTIONS -->", applicationSelectOptions)
                                   .replace("<!-- DYNAMIC_INTERVIEWS_ROWS -->", interviewsTableRows)
                                   .replace("<!-- DYNAMIC_UPCOMING_INTERVIEWS -->", upcomingInterviewsRows)
                                   .replace("<!-- DYNAMIC_OVERDUE_FOLLOWUPS -->", overdueFollowupsRows)
                                   .replace("<!-- DYNAMIC_UPCOMING_FOLLOWUPS -->", upcomingFollowupsRows)
                                   .replace("<!-- DYNAMIC_OFFERS_ROWS -->", offersTableRows)
                                   .replace("<!-- DYNAMIC_HIGHEST_PACKAGE -->", highestPackageHtml)
                                   .replace("<!-- DYNAMIC_STATUS_BREAKDOWN -->", statusBreakdownHtml)
                                   .replace("<!-- DYNAMIC_COMPANY_BREAKDOWN -->", companyBreakdownHtml);

                byte[] bytes = rendered.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "text/html; charset=UTF-8");
                exchange.sendResponseHeaders(200, bytes.length);
                OutputStream os = exchange.getResponseBody();
                os.write(bytes);
                os.close();

            } catch (SQLException e) {
                String err = "<html><body style='font-family:sans-serif;padding:30px;'>" +
                             "<h2>Database Connection / Query Error</h2>" +
                             "<p><b>Message:</b> " + escapeHtml(e.getMessage()) + "</p>" +
                             "<p><a href='/'>&larr; Return to Home</a></p></body></html>";
                byte[] bytes = err.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "text/html; charset=UTF-8");
                exchange.sendResponseHeaders(500, bytes.length);
                OutputStream os = exchange.getResponseBody();
                os.write(bytes);
                os.close();
            }
        }
    }

    // =========================================================================
    // DYNAMIC HTML ROW BUILDERS
    // =========================================================================

    private static String renderCompaniesTable(List<Company> list) {
        if (list.isEmpty()) {
            return "<tr><td colspan='4' style='text-align:center;padding:24px;color:#66758A;'>No companies available.</td></tr>";
        }
        StringBuilder sb = new StringBuilder();
        int idx = 1;
        for (Company c : list) {
            sb.append("<tr>")
              .append("<td>").append(idx++).append("</td>")
              .append("<td class='primary-cell-text'>").append(escapeHtml(c.getName())).append("</td>")
              .append("<td>").append(escapeHtml(c.getLocation())).append("</td>")
              .append("<td>").append(escapeHtml(c.getContactEmail())).append("</td>")
              .append("</tr>");
        }
        return sb.toString();
    }

    private static String renderCompanyOptions(List<Company> list) {
        StringBuilder sb = new StringBuilder("<option value=''>Select Company</option>");
        for (Company c : list) {
            sb.append("<option value='").append(c.getCompanyId()).append("'>")
              .append(escapeHtml(c.getName()))
              .append("</option>");
        }
        return sb.toString();
    }

    private static String renderApplicationsTable(List<Application> list) {
        if (list.isEmpty()) {
            return "<tr><td colspan='8' style='text-align:center;padding:24px;color:#66758A;'>No applications found matching criteria.</td></tr>";
        }
        StringBuilder sb = new StringBuilder();
        int idx = 1;
        for (Application a : list) {
            String followUpText = a.getFollowUpDate() != null ? a.getFollowUpDate().toString() : "-";

            sb.append("<tr>")
              .append("<td>").append(idx++).append("</td>")
              .append("<td class='primary-cell-text'>").append(escapeHtml(a.getRole())).append("</td>")
              .append("<td>").append(escapeHtml(a.getCompanyName() != null ? a.getCompanyName() : "Company #" + a.getCompanyId())).append("</td>")
              .append("<td><span class='badge-type-pill'>").append(escapeHtml(a.getType())).append("</span></td>")
              .append("<td>").append(a.getAppliedDate() != null ? a.getAppliedDate().toString() : "-").append("</td>")
              .append("<td>")
              .append("<form action='/update-application-status' method='POST' class='table-status-form'>")
              .append("<input type='hidden' name='applicationId' value='").append(a.getApplicationId()).append("'>")
              .append("<select name='status' class='select-table-status'>")
              .append("<option value='Applied'").append("Applied".equalsIgnoreCase(a.getStatus()) ? " selected" : "").append(">Applied</option>")
              .append("<option value='Shortlisted'").append("Shortlisted".equalsIgnoreCase(a.getStatus()) ? " selected" : "").append(">Shortlisted</option>")
              .append("<option value='Interview Scheduled'").append("Interview Scheduled".equalsIgnoreCase(a.getStatus()) ? " selected" : "").append(">Interview Scheduled</option>")
              .append("<option value='Offered'").append("Offered".equalsIgnoreCase(a.getStatus()) ? " selected" : "").append(">Offered</option>")
              .append("<option value='Rejected'").append("Rejected".equalsIgnoreCase(a.getStatus()) ? " selected" : "").append(">Rejected</option>")
              .append("</select>")
              .append("<button type='submit' class='btn-table-action' title='Update Status'>Update</button>")
              .append("</form>")
              .append("</td>")
              .append("<td>").append(followUpText).append("</td>")
              .append("<td style='text-align: right;'>")
              .append("<div class='actions-cell' style='justify-content: flex-end;'>")
              .append("<a href='#modal-update-app' class='btn-icon-only' title='Edit Application' style='text-decoration:none;display:inline-flex;align-items:center;justify-content:center;color:#2563A6;background:#F0F6FD;'>")
              .append("<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'></path><path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'></path></svg>")
              .append("</a>")
              .append("<form action='/delete-application' method='POST' style='display:inline;'>")
              .append("<input type='hidden' name='applicationId' value='").append(a.getApplicationId()).append("'>")
              .append("<button type='submit' class='btn-icon-only btn-delete' title='Delete Application'>")
              .append("<svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><polyline points='3 6 5 6 21 6'></polyline><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'></path></svg>")
              .append("</button>")
              .append("</form>")
              .append("</div>")
              .append("</td>")
              .append("</tr>");
        }
        return sb.toString();
    }

    private static String renderApplicationOptions(List<Application> list) {
        StringBuilder sb = new StringBuilder("<option value=''>Select Application</option>");
        for (Application a : list) {
            String companyName = a.getCompanyName() != null ? a.getCompanyName() : "Company #" + a.getCompanyId();
            sb.append("<option value='").append(a.getApplicationId()).append("'>")
              .append(escapeHtml(a.getRole())).append(" &mdash; ").append(escapeHtml(companyName))
              .append("</option>");
        }
        return sb.toString();
    }

    private static String renderInterviewsTable(List<Interview> list) {
        if (list.isEmpty()) {
            return "<tr><td colspan='6' style='text-align:center;padding:24px;color:#66758A;'>No interviews scheduled yet.</td></tr>";
        }
        StringBuilder sb = new StringBuilder();
        int idx = 1;
        for (Interview iv : list) {
            sb.append("<tr>")
              .append("<td>").append(idx++).append("</td>")
              .append("<td><div class='primary-cell-text'>").append(escapeHtml(iv.getRole())).append("</div><div class='secondary-cell-text'>").append(escapeHtml(iv.getCompanyName())).append("</div></td>")
              .append("<td>").append(iv.getInterviewDate() != null ? iv.getInterviewDate().toString() : "-").append("</td>")
              .append("<td>").append(escapeHtml(iv.getRound())).append("</td>")
              .append("<td>")
              .append("<form action='/update-interview-result' method='POST' class='table-status-form'>")
              .append("<input type='hidden' name='interviewId' value='").append(iv.getInterviewId()).append("'>")
              .append("<select name='result' class='select-table-status'>")
              .append("<option value='Pending'").append("Pending".equalsIgnoreCase(iv.getResult()) ? " selected" : "").append(">Pending</option>")
              .append("<option value='Cleared'").append("Cleared".equalsIgnoreCase(iv.getResult()) ? " selected" : "").append(">Cleared</option>")
              .append("<option value='Rejected'").append("Rejected".equalsIgnoreCase(iv.getResult()) ? " selected" : "").append(">Rejected</option>")
              .append("</select>")
              .append("<button type='submit' class='btn-table-action' title='Update Result'>Update</button>")
              .append("</form>")
              .append("</td>")
              .append("<td style='text-align: right;'>")
              .append("<div class='actions-cell' style='justify-content: flex-end;'>")
              .append("<form action='/delete-interview' method='POST' style='display:inline;'>")
              .append("<input type='hidden' name='interviewId' value='").append(iv.getInterviewId()).append("'>")
              .append("<button type='submit' class='btn-icon-only btn-delete' title='Delete Interview'>")
              .append("<svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><polyline points='3 6 5 6 21 6'></polyline><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'></path></svg>")
              .append("</button>")
              .append("</form>")
              .append("</div>")
              .append("</td>")
              .append("</tr>");
        }
        return sb.toString();
    }

    private static String renderFollowUpsRows(List<Application> list, boolean isOverdue) {
        if (list.isEmpty()) {
            return "<tr><td colspan='3' style='text-align:center;padding:16px;color:#66758A;'>None found</td></tr>";
        }
        StringBuilder sb = new StringBuilder();
        int idx = 1;
        for (Application a : list) {
            String badge = isOverdue ? "badge-rejected" : "badge-applied";
            sb.append("<tr>")
              .append("<td>").append(idx++).append("</td>")
              .append("<td><div class='primary-cell-text'>").append(escapeHtml(a.getRole())).append("</div><div class='secondary-cell-text'>").append(escapeHtml(a.getCompanyName() != null ? a.getCompanyName() : "Company #" + a.getCompanyId())).append("</div></td>")
              .append("<td><span class='badge ").append(badge).append("'>").append(a.getFollowUpDate()).append("</span></td>")
              .append("</tr>");
        }
        return sb.toString();
    }

    private static String renderUpcomingInterviews(List<Interview> list) {
        if (list.isEmpty()) {
            return "<tr><td colspan='3' style='text-align:center;padding:16px;color:#66758A;'>No upcoming interviews</td></tr>";
        }
        StringBuilder sb = new StringBuilder();
        int count = 0;
        for (Interview iv : list) {
            if (count++ >= 4) break;
            sb.append("<tr>")
              .append("<td><div class='primary-cell-text'>").append(escapeHtml(iv.getRole())).append("</div><div class='secondary-cell-text'>").append(escapeHtml(iv.getCompanyName())).append("</div></td>")
              .append("<td>").append(iv.getInterviewDate() != null ? iv.getInterviewDate().toString() : "-").append("</td>")
              .append("<td><span class='badge badge-applied'>").append(escapeHtml(iv.getRound())).append("</span></td>")
              .append("</tr>");
        }
        return sb.toString();
    }

    private static String renderRecentApplications(List<Application> list) {
        if (list.isEmpty()) {
            return "<tr><td colspan='5' style='text-align:center;padding:16px;color:#66758A;'>No recent applications</td></tr>";
        }
        StringBuilder sb = new StringBuilder();
        int count = 0;
        for (Application a : list) {
            if (count++ >= 4) break;
            sb.append("<tr>")
              .append("<td class='primary-cell-text'>").append(escapeHtml(a.getRole())).append("</td>")
              .append("<td>").append(escapeHtml(a.getCompanyName() != null ? a.getCompanyName() : "Company #" + a.getCompanyId())).append("</td>")
              .append("<td><span class='badge-type-pill'>").append(escapeHtml(a.getType())).append("</span></td>")
              .append("<td>").append(a.getAppliedDate() != null ? a.getAppliedDate().toString() : "-").append("</td>")
              .append("<td><span class='badge ").append(getBadgeClassForStatus(a.getStatus())).append("'>").append(escapeHtml(a.getStatus())).append("</span></td>")
              .append("</tr>");
        }
        return sb.toString();
    }

    private static String renderOffersTable(List<Offer> list) {
        if (list.isEmpty()) {
            return "<tr><td colspan='6' style='text-align:center;padding:24px;color:#66758A;'>No offers recorded yet.</td></tr>";
        }
        StringBuilder sb = new StringBuilder();
        int idx = 1;
        for (Offer o : list) {
            sb.append("<tr>")
              .append("<td>").append(idx++).append("</td>")
              .append("<td><div class='primary-cell-text'>").append(escapeHtml(o.getRole())).append("</div><div class='secondary-cell-text'>").append(escapeHtml(o.getCompanyName())).append("</div></td>")
              .append("<td><strong>").append(String.format("%.2f", o.getPackageLpa())).append("</strong></td>")
              .append("<td>").append(o.getDeadline() != null ? o.getDeadline().toString() : "-").append("</td>")
              .append("<td>")
              .append("<form action='/update-offer-status' method='POST' class='table-status-form'>")
              .append("<input type='hidden' name='offerId' value='").append(o.getOfferId()).append("'>")
              .append("<select name='offerStatus' class='select-table-status'>")
              .append("<option value='Pending'").append("Pending".equalsIgnoreCase(o.getOfferStatus()) ? " selected" : "").append(">Pending</option>")
              .append("<option value='Accepted'").append("Accepted".equalsIgnoreCase(o.getOfferStatus()) ? " selected" : "").append(">Accepted</option>")
              .append("<option value='Rejected'").append("Rejected".equalsIgnoreCase(o.getOfferStatus()) ? " selected" : "").append(">Rejected</option>")
              .append("</select>")
              .append("<button type='submit' class='btn-table-action' title='Update Decision'>Update</button>")
              .append("</form>")
              .append("</td>")
              .append("<td style='text-align: right;'>")
              .append("<div class='actions-cell' style='justify-content: flex-end;'>")
              .append("<form action='/delete-offer' method='POST' style='display:inline;'>")
              .append("<input type='hidden' name='offerId' value='").append(o.getOfferId()).append("'>")
              .append("<button type='submit' class='btn-icon-only btn-delete' title='Delete Offer'>")
              .append("<svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><polyline points='3 6 5 6 21 6'></polyline><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'></path></svg>")
              .append("</button>")
              .append("</form>")
              .append("</div>")
              .append("</td>")
              .append("</tr>");
        }
        return sb.toString();
    }

    private static String renderHighestPackageBanner(List<Offer> list) {
        if (list.isEmpty()) {
            return "<div class='highest-package-card' style='background:#F8FAFC;border-color:#E2E8F0;'>" +
                   "<div class='highest-package-content'><div>" +
                   "<div class='highest-package-label' style='color:#64748B;'>Highest Package</div>" +
                   "<div class='highest-package-amount' style='color:#64748B;'>No offers yet</div>" +
                   "</div></div></div>";
        }
        Offer best = list.stream().max(Comparator.comparingDouble(Offer::getPackageLpa)).orElse(list.get(0));
        return "<div class='highest-package-card'>" +
               "<div class='highest-package-content'>" +
               "<div class='trophy-badge'>" +
               "<svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='12' cy='8' r='6'></circle><path d='M15.477 12.89L17 22l-5-3-5 3 1.523-9.11'></path></svg>" +
               "</div>" +
               "<div>" +
               "<div class='highest-package-label'>Highest Package</div>" +
               "<div class='highest-package-amount'>&#8377; " + String.format("%.2f", best.getPackageLpa()) + " LPA</div>" +
               "<div class='highest-package-company'>" + escapeHtml(best.getRole()) + " (" + escapeHtml(best.getCompanyName()) + ")</div>" +
               "</div>" +
               "</div>" +
               "<div style='color: #16A34A;'>" +
               "<svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5'><polyline points='9 18 15 12 9 6'></polyline></svg>" +
               "</div>" +
               "</div>";
    }

    private static String renderStatusBars(Map<String, Long> statusCounts, long total) {
        if (total == 0) return "<p style='color:#66758A;'>No application data yet.</p>";
        String[] statuses = {"Applied", "Shortlisted", "Interview Scheduled", "Offered", "Rejected"};
        String[] colors = {"bar-blue", "bar-purple", "bar-amber", "bar-mint", "bar-pink"};

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < statuses.length; i++) {
            String st = statuses[i];
            long count = statusCounts.getOrDefault(st, 0L);
            long pct = (count * 100) / total;
            sb.append("<div class='report-stat-row'>")
              .append("<div class='report-stat-name'><span class='badge ").append(getBadgeClassForStatus(st)).append("'>").append(st).append("</span></div>")
              .append("<div class='bar-track'><div class='bar-fill ").append(colors[i]).append("' style='width: ").append(pct).append("%;'></div></div>")
              .append("<div class='report-count'>").append(count).append("</div>")
              .append("</div>");
        }
        return sb.toString();
    }

    private static String renderCompanyBars(Map<String, Long> companyCounts, long total) {
        if (total == 0) return "<p style='color:#66758A;'>No company applications yet.</p>";
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, Long> entry : companyCounts.entrySet()) {
            long pct = (entry.getValue() * 100) / total;
            sb.append("<div class='report-stat-row'>")
              .append("<div class='report-stat-name' style='width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;'>").append(escapeHtml(entry.getKey())).append("</div>")
              .append("<div class='bar-track'><div class='bar-fill bar-blue' style='width: ").append(pct).append("%;'></div></div>")
              .append("<div class='report-count'>").append(entry.getValue()).append("</div>")
              .append("</div>");
        }
        return sb.toString();
    }

    private static String getBadgeClassForStatus(String status) {
        if (status == null) return "badge-applied";
        switch (status.trim()) {
            case "Shortlisted": return "badge-shortlisted";
            case "Interview Scheduled": return "badge-interview";
            case "Offered": return "badge-offered";
            case "Rejected": return "badge-rejected";
            case "Applied":
            default: return "badge-applied";
        }
    }

    // =========================================================================
    // AUTHENTICATION HTML PAGES (SIGN IN & REGISTER USER / SIGN UP)
    // =========================================================================

    /**
     * Renders self-contained Sign In HTML matching CareerTrack design system.
     * Features a prominent Register User / Sign Up option.
     */
    private static String renderSignInPage(String error, boolean registered) {
        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html>\n<html lang='en'>\n<head>\n")
          .append("<meta charset='UTF-8'>\n")
          .append("<meta name='viewport' content='width=device-width, initial-scale=1.0'>\n")
          .append("<title>Sign In — CareerTrack</title>\n")
          .append("<link rel='icon' type='image/png' href='/mascot.png'>\n")
          .append("<style>\n")
          .append("*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }\n")
          .append(":root {\n")
          .append("  --primary-navy: #142D4E;\n")
          .append("  --primary-blue: #1765D1;\n")
          .append("  --btn-blue: #1765D1;\n")
          .append("  --btn-blue-hover: #1352AA;\n")
          .append("  --page-bg: #F3F6FA;\n")
          .append("  --card-white: #FFFFFF;\n")
          .append("  --border-gray: #DCE4EE;\n")
          .append("  --text-dark: #1E293B;\n")
          .append("  --text-muted: #64748B;\n")
          .append("  --radius-sm: 8px;\n")
          .append("  --radius-md: 14px;\n")
          .append("  --radius-lg: 18px;\n")
          .append("  --font-stack: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n")
          .append("}\n")
          .append("body {\n")
          .append("  font-family: var(--font-stack);\n")
          .append("  background-color: var(--page-bg);\n")
          .append("  color: var(--text-dark);\n")
          .append("  min-height: 100vh;\n")
          .append("  display: flex;\n")
          .append("  align-items: center;\n")
          .append("  justify-content: center;\n")
          .append("  padding: 24px;\n")
          .append("}\n")
          .append(".auth-split-card {\n")
          .append("  width: 100%;\n")
          .append("  max-width: 1060px;\n")
          .append("  background: var(--card-white);\n")
          .append("  border: 1px solid var(--border-gray);\n")
          .append("  border-radius: var(--radius-lg);\n")
          .append("  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);\n")
          .append("  display: flex;\n")
          .append("  overflow: hidden;\n")
          .append("}\n")
          .append(".auth-hero-pane {\n")
          .append("  flex: 1.15;\n")
          .append("  background: #0B2342;\n")
          .append("  position: relative;\n")
          .append("  overflow: hidden;\n")
          .append("  display: flex;\n")
          .append("  min-height: 580px;\n")
          .append("}\n")
          .append(".auth-hero-img {\n")
          .append("  width: 100%;\n")
          .append("  height: 100%;\n")
          .append("  object-fit: cover;\n")
          .append("  object-position: left center;\n")
          .append("  display: block;\n")
          .append("}\n")
          .append(".auth-form-pane {\n")
          .append("  flex: 1;\n")
          .append("  padding: 38px 42px;\n")
          .append("  display: flex;\n")
          .append("  flex-direction: column;\n")
          .append("  justify-content: center;\n")
          .append("  background: #FFFFFF;\n")
          .append("  position: relative;\n")
          .append("}\n")
          .append(".auth-top-quote {\n")
          .append("  text-align: right;\n")
          .append("  font-size: 11.5px;\n")
          .append("  color: var(--text-muted);\n")
          .append("  font-style: italic;\n")
          .append("  margin-bottom: 20px;\n")
          .append("  line-height: 1.35;\n")
          .append("}\n")
          .append(".auth-top-quote-bar {\n")
          .append("  width: 24px;\n")
          .append("  height: 2px;\n")
          .append("  background: var(--primary-blue);\n")
          .append("  margin-left: auto;\n")
          .append("  margin-top: 4px;\n")
          .append("  border-radius: 2px;\n")
          .append("}\n")
          .append(".auth-title {\n")
          .append("  font-size: 24px;\n")
          .append("  font-weight: 700;\n")
          .append("  color: var(--primary-navy);\n")
          .append("  letter-spacing: -0.4px;\n")
          .append("  margin-bottom: 6px;\n")
          .append("}\n")
          .append(".auth-subtitle {\n")
          .append("  font-size: 13.5px;\n")
          .append("  color: var(--text-muted);\n")
          .append("  margin-bottom: 22px;\n")
          .append("  line-height: 1.45;\n")
          .append("}\n")
          .append(".auth-toggle-group {\n")
          .append("  display: flex;\n")
          .append("  background: #F1F5F9;\n")
          .append("  padding: 4px;\n")
          .append("  border-radius: 10px;\n")
          .append("  margin-bottom: 22px;\n")
          .append("  border: 1px solid #E2E8F0;\n")
          .append("}\n")
          .append(".auth-toggle-btn {\n")
          .append("  flex: 1;\n")
          .append("  text-align: center;\n")
          .append("  padding: 8px 14px;\n")
          .append("  font-size: 13.5px;\n")
          .append("  font-weight: 600;\n")
          .append("  color: #64748B;\n")
          .append("  text-decoration: none;\n")
          .append("  border-radius: 7px;\n")
          .append("  transition: all 0.15s ease;\n")
          .append("}\n")
          .append(".auth-toggle-btn.active {\n")
          .append("  background: var(--primary-blue);\n")
          .append("  color: #FFFFFF;\n")
          .append("  box-shadow: 0 2px 6px rgba(23, 101, 209, 0.25);\n")
          .append("}\n")
          .append(".auth-toggle-btn:not(.active):hover {\n")
          .append("  color: var(--text-dark);\n")
          .append("  background: rgba(255, 255, 255, 0.6);\n")
          .append("}\n")
          .append(".alert-banner {\n")
          .append("  padding: 11px 14px;\n")
          .append("  border-radius: var(--radius-sm);\n")
          .append("  font-size: 13px;\n")
          .append("  margin-bottom: 18px;\n")
          .append("  display: flex;\n")
          .append("  align-items: center;\n")
          .append("  gap: 8px;\n")
          .append("  line-height: 1.4;\n")
          .append("}\n")
          .append(".alert-error {\n")
          .append("  background-color: #FFF0F3;\n")
          .append("  border: 1px solid #FECDD3;\n")
          .append("  color: #BE123C;\n")
          .append("}\n")
          .append(".alert-success {\n")
          .append("  background-color: #EAF8F0;\n")
          .append("  border: 1px solid #BBF7D0;\n")
          .append("  color: #15803D;\n")
          .append("}\n")
          .append(".form-group {\n")
          .append("  margin-bottom: 16px;\n")
          .append("}\n")
          .append(".form-label-row {\n")
          .append("  display: flex;\n")
          .append("  align-items: center;\n")
          .append("  justify-content: space-between;\n")
          .append("  margin-bottom: 6px;\n")
          .append("}\n")
          .append(".form-label {\n")
          .append("  font-size: 13px;\n")
          .append("  font-weight: 600;\n")
          .append("  color: var(--text-dark);\n")
          .append("}\n")
          .append(".form-link-muted {\n")
          .append("  font-size: 12px;\n")
          .append("  color: var(--primary-blue);\n")
          .append("  text-decoration: none;\n")
          .append("}\n")
          .append(".input-with-icon {\n")
          .append("  position: relative;\n")
          .append("  display: flex;\n")
          .append("  align-items: center;\n")
          .append("}\n")
          .append(".field-icon {\n")
          .append("  position: absolute;\n")
          .append("  left: 13px;\n")
          .append("  width: 17px;\n")
          .append("  height: 17px;\n")
          .append("  stroke: #94A3B8;\n")
          .append("  pointer-events: none;\n")
          .append("}\n")
          .append(".form-input {\n")
          .append("  width: 100%;\n")
          .append("  padding: 10.5px 14px 10.5px 38px;\n")
          .append("  border: 1px solid var(--border-gray);\n")
          .append("  border-radius: var(--radius-sm);\n")
          .append("  font-size: 13.5px;\n")
          .append("  color: var(--text-dark);\n")
          .append("  background-color: #FAFCFE;\n")
          .append("  outline: none;\n")
          .append("  transition: all 0.15s ease;\n")
          .append("  font-family: inherit;\n")
          .append("}\n")
          .append(".form-input:focus {\n")
          .append("  background-color: #FFFFFF;\n")
          .append("  border-color: var(--primary-blue);\n")
          .append("  box-shadow: 0 0 0 3px rgba(23, 101, 209, 0.14);\n")
          .append("}\n")
          .append(".remember-row {\n")
          .append("  display: flex;\n")
          .append("  align-items: center;\n")
          .append("  margin-bottom: 18px;\n")
          .append("  margin-top: 4px;\n")
          .append("}\n")
          .append(".remember-label {\n")
          .append("  display: flex;\n")
          .append("  align-items: center;\n")
          .append("  gap: 8px;\n")
          .append("  font-size: 13px;\n")
          .append("  color: var(--text-dark);\n")
          .append("  cursor: pointer;\n")
          .append("  user-select: none;\n")
          .append("}\n")
          .append(".remember-label input[type='checkbox'] {\n")
          .append("  width: 16px;\n")
          .append("  height: 16px;\n")
          .append("  accent-color: var(--primary-blue);\n")
          .append("  cursor: pointer;\n")
          .append("}\n")
          .append(".btn-submit {\n")
          .append("  width: 100%;\n")
          .append("  padding: 11.5px;\n")
          .append("  background-color: var(--btn-blue);\n")
          .append("  color: #FFFFFF;\n")
          .append("  border: none;\n")
          .append("  border-radius: var(--radius-sm);\n")
          .append("  font-size: 14px;\n")
          .append("  font-weight: 600;\n")
          .append("  cursor: pointer;\n")
          .append("  transition: background-color 0.15s ease, transform 0.05s ease;\n")
          .append("  font-family: inherit;\n")
          .append("  display: inline-flex;\n")
          .append("  align-items: center;\n")
          .append("  justify-content: center;\n")
          .append("  gap: 8px;\n")
          .append("}\n")
          .append(".btn-submit:hover {\n")
          .append("  background-color: var(--btn-blue-hover);\n")
          .append("}\n")
          .append(".btn-submit:active {\n")
          .append("  transform: scale(0.99);\n")
          .append("}\n")
          .append(".auth-divider {\n")
          .append("  display: flex;\n")
          .append("  align-items: center;\n")
          .append("  margin: 20px 0;\n")
          .append("  color: #94A3B8;\n")
          .append("  font-size: 12px;\n")
          .append("}\n")
          .append(".auth-divider::before, .auth-divider::after {\n")
          .append("  content: '';\n")
          .append("  flex: 1;\n")
          .append("  height: 1px;\n")
          .append("  background: #E2E8F0;\n")
          .append("}\n")
          .append(".auth-divider span {\n")
          .append("  padding: 0 10px;\n")
          .append("}\n")
          .append(".btn-create-account {\n")
          .append("  display: inline-flex;\n")
          .append("  align-items: center;\n")
          .append("  justify-content: center;\n")
          .append("  gap: 8px;\n")
          .append("  width: 100%;\n")
          .append("  padding: 10.5px;\n")
          .append("  background: #FFFFFF;\n")
          .append("  color: var(--primary-blue);\n")
          .append("  border: 1px solid #BFDBFE;\n")
          .append("  border-radius: var(--radius-sm);\n")
          .append("  font-size: 13.5px;\n")
          .append("  font-weight: 600;\n")
          .append("  text-decoration: none;\n")
          .append("  transition: all 0.15s ease;\n")
          .append("}\n")
          .append(".btn-create-account:hover {\n")
          .append("  background: #F0F6FD;\n")
          .append("  border-color: #93C5FD;\n")
          .append("}\n")
          .append(".demo-box {\n")
          .append("  background: #F0F6FD;\n")
          .append("  border: 1px solid #BFDBFE;\n")
          .append("  border-radius: var(--radius-sm);\n")
          .append("  padding: 12px 14px;\n")
          .append("  margin-bottom: 18px;\n")
          .append("}\n")
          .append(".demo-box-header {\n")
          .append("  display: flex;\n")
          .append("  align-items: center;\n")
          .append("  justify-content: space-between;\n")
          .append("  margin-bottom: 8px;\n")
          .append("}\n")
          .append(".demo-box-title {\n")
          .append("  display: flex;\n")
          .append("  align-items: center;\n")
          .append("  gap: 6px;\n")
          .append("  font-size: 11.5px;\n")
          .append("  font-weight: 700;\n")
          .append("  color: #1E40AF;\n")
          .append("  text-transform: uppercase;\n")
          .append("  letter-spacing: 0.5px;\n")
          .append("}\n")
          .append(".demo-icon {\n")
          .append("  width: 14px;\n")
          .append("  height: 14px;\n")
          .append("  stroke: #2563EB;\n")
          .append("}\n")
          .append(".demo-file-chip {\n")
          .append("  display: inline-flex;\n")
          .append("  align-items: center;\n")
          .append("  gap: 4px;\n")
          .append("  padding: 2px 8px;\n")
          .append("  background: #FFFFFF;\n")
          .append("  border: 1px solid #93C5FD;\n")
          .append("  border-radius: 4px;\n")
          .append("  color: #1D4ED8;\n")
          .append("  font-size: 11px;\n")
          .append("  font-weight: 600;\n")
          .append("  text-decoration: none;\n")
          .append("  transition: all 0.15s ease;\n")
          .append("}\n")
          .append(".demo-file-chip:hover {\n")
          .append("  background: #DBEAFE;\n")
          .append("  color: #1E40AF;\n")
          .append("}\n")
          .append(".demo-box-creds {\n")
          .append("  display: flex;\n")
          .append("  flex-wrap: wrap;\n")
          .append("  gap: 12px;\n")
          .append("  font-size: 12px;\n")
          .append("  margin-bottom: 10px;\n")
          .append("  color: #334155;\n")
          .append("}\n")
          .append(".demo-cred-row {\n")
          .append("  display: flex;\n")
          .append("  align-items: center;\n")
          .append("  gap: 5px;\n")
          .append("}\n")
          .append(".demo-cred-lbl {\n")
          .append("  color: #64748B;\n")
          .append("  font-size: 11px;\n")
          .append("}\n")
          .append(".demo-cred-val {\n")
          .append("  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;\n")
          .append("  background: #FFFFFF;\n")
          .append("  padding: 1.5px 6px;\n")
          .append("  border-radius: 4px;\n")
          .append("  border: 1px solid #CBD5E1;\n")
          .append("  font-weight: 600;\n")
          .append("  color: #0F172A;\n")
          .append("  font-size: 11.5px;\n")
          .append("}\n")
          .append(".demo-actions {\n")
          .append("  display: flex;\n")
          .append("  gap: 8px;\n")
          .append("}\n")
          .append(".btn-demo-fill {\n")
          .append("  flex: 1;\n")
          .append("  display: inline-flex;\n")
          .append("  align-items: center;\n")
          .append("  justify-content: center;\n")
          .append("  gap: 6px;\n")
          .append("  padding: 6.5px 10px;\n")
          .append("  background: #FFFFFF;\n")
          .append("  color: #1D4ED8;\n")
          .append("  border: 1px solid #93C5FD;\n")
          .append("  border-radius: var(--radius-sm);\n")
          .append("  font-size: 12px;\n")
          .append("  font-weight: 600;\n")
          .append("  cursor: pointer;\n")
          .append("  transition: all 0.15s ease;\n")
          .append("  font-family: inherit;\n")
          .append("}\n")
          .append(".btn-demo-fill:hover {\n")
          .append("  background: #EFF6FF;\n")
          .append("  border-color: #60A5FA;\n")
          .append("}\n")
          .append(".btn-demo-quick-login {\n")
          .append("  flex: 1;\n")
          .append("  display: inline-flex;\n")
          .append("  align-items: center;\n")
          .append("  justify-content: center;\n")
          .append("  gap: 6px;\n")
          .append("  padding: 6.5px 10px;\n")
          .append("  background: #1765D1;\n")
          .append("  color: #FFFFFF;\n")
          .append("  border: 1px solid #1765D1;\n")
          .append("  border-radius: var(--radius-sm);\n")
          .append("  font-size: 12px;\n")
          .append("  font-weight: 600;\n")
          .append("  cursor: pointer;\n")
          .append("  transition: all 0.15s ease;\n")
          .append("  font-family: inherit;\n")
          .append("}\n")
          .append(".btn-demo-quick-login:hover {\n")
          .append("  background: #1352AA;\n")
          .append("}\n")
          .append("@media (max-width: 900px) {\n")
          .append("  .auth-split-card {\n")
          .append("    flex-direction: column;\n")
          .append("    max-width: 480px;\n")
          .append("  }\n")
          .append("  .auth-hero-pane {\n")
          .append("    min-height: 220px;\n")
          .append("    max-height: 250px;\n")
          .append("  }\n")
          .append("  .auth-hero-img {\n")
          .append("    object-position: 22% 40%;\n")
          .append("  }\n")
          .append("  .auth-form-pane {\n")
          .append("    padding: 28px 24px;\n")
          .append("  }\n")
          .append("}\n")
          .append("</style>\n</head>\n<body>\n")
          .append("<div class='auth-split-card'>\n")
          .append("  <div class='auth-hero-pane'>\n")
          .append("    <img src='/assets/aistudio/image_103eb014.png' alt='CareerTrack — Track Your Applications. Build Your Future.' class='auth-hero-img'>\n")
          .append("  </div>\n")
          .append("  <div class='auth-form-pane'>\n")
          .append("    <div class='auth-top-quote'>\n")
          .append("      <div>Small steps today,</div>\n")
          .append("      <div>big opportunities tomorrow.</div>\n")
          .append("      <div class='auth-top-quote-bar'></div>\n")
          .append("    </div>\n")
          .append("    <h2 class='auth-title'>Welcome to CareerTrack</h2>\n")
          .append("    <p class='auth-subtitle'>Sign in to your account or create a new one to start tracking your career journey.</p>\n")
          .append("    <div class='auth-toggle-group'>\n")
          .append("      <a href='/signin' class='auth-toggle-btn active'>Sign In</a>\n")
          .append("      <a href='/signup' class='auth-toggle-btn'>Register</a>\n")
          .append("    </div>\n");

        if (registered) {
            sb.append("    <div class='alert-banner alert-success'>\n")
              .append("      <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M22 11.08V12a10 10 0 1 1-5.93-9.14'></path><polyline points='22 4 12 14.01 9 11.01'></polyline></svg>\n")
              .append("      <span>Account registered successfully! Please sign in below.</span>\n")
              .append("    </div>\n");
        }

        if (error != null && !error.isEmpty()) {
            sb.append("    <div class='alert-banner alert-error'>\n")
              .append("      <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='12' cy='12' r='10'></circle><line x1='12' y1='8' x2='12' y2='12'></line><line x1='12' y1='16' x2='12.01' y2='16'></line></svg>\n")
              .append("      <span>").append(escapeHtml(error)).append("</span>\n")
              .append("    </div>\n");
        }

        sb.append("    <form method='POST' action='/signin' autocomplete='on'>\n")
          .append("      <div class='form-group'>\n")
          .append("        <label class='form-label' for='email'>Email Address</label>\n")
          .append("        <div class='input-with-icon' style='margin-top: 6px;'>\n")
          .append("          <svg class='field-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z'></path><polyline points='22,6 12,13 2,6'></polyline></svg>\n")
          .append("          <input type='email' id='email' name='email' class='form-input' placeholder='Enter your email' required autofocus>\n")
          .append("        </div>\n")
          .append("      </div>\n")
          .append("      <div class='form-group'>\n")
          .append("        <div class='form-label-row'>\n")
          .append("          <label class='form-label' for='password'>Password</label>\n")
          .append("          <span class='form-link-muted' title='Contact administrator if reset is needed'>Forgot password?</span>\n")
          .append("        </div>\n")
          .append("        <div class='input-with-icon'>\n")
          .append("          <svg class='field-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><rect x='3' y='11' width='18' height='11' rx='2' ry='2'></rect><path d='M7 11V7a5 5 0 0 1 10 0v4'></path></svg>\n")
          .append("          <input type='password' id='password' name='password' class='form-input' placeholder='Enter your password' required>\n")
          .append("        </div>\n")
          .append("      </div>\n")
          .append("      <div class='remember-row'>\n")
          .append("        <label class='remember-label'>\n")
          .append("          <input type='checkbox' name='rememberMe' checked>\n")
          .append("          <span>Remember me</span>\n")
          .append("        </label>\n")
          .append("      </div>\n")
          .append("      <button type='submit' class='btn-submit'>\n")
          .append("        <span>Sign In</span>\n")
          .append("        <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5'><line x1='5' y1='12' x2='19' y2='12'></line><polyline points='12 5 19 12 12 19'></polyline></svg>\n")
          .append("      </button>\n")
          .append("    </form>\n")
          .append("    <div class='auth-divider'><span>or</span></div>\n")
          .append("    <a href='/signup' class='btn-create-account'>\n")
          .append("      <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'></path><circle cx='8.5' cy='7.5' r='4'></circle><line x1='20' y1='8' x2='20' y2='14'></line><line x1='23' y1='11' x2='17' y2='11'></line></svg>\n")
          .append("      <span>Create New Account</span>\n")
          .append("    </a>\n")
          .append("  </div>\n")
          .append("</div>\n")
          .append("</body>\n</html>");

        return sb.toString();
    }

    private static String renderSignUpPage(String error) {
        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html>\n<html lang='en'>\n<head>\n")
          .append("<meta charset='UTF-8'>\n")
          .append("<meta name='viewport' content='width=device-width, initial-scale=1.0'>\n")
          .append("<title>Register User — CareerTrack</title>\n")
          .append("<link rel='icon' type='image/png' href='/mascot.png'>\n")
          .append("<style>\n")
          .append("*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }\n")
          .append(":root {\n")
          .append("  --primary-navy: #142D4E;\n")
          .append("  --primary-blue: #1765D1;\n")
          .append("  --btn-blue: #1765D1;\n")
          .append("  --btn-blue-hover: #1352AA;\n")
          .append("  --page-bg: #F3F6FA;\n")
          .append("  --card-white: #FFFFFF;\n")
          .append("  --border-gray: #DCE4EE;\n")
          .append("  --text-dark: #1E293B;\n")
          .append("  --text-muted: #64748B;\n")
          .append("  --radius-sm: 8px;\n")
          .append("  --radius-md: 14px;\n")
          .append("  --radius-lg: 18px;\n")
          .append("  --font-stack: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n")
          .append("}\n")
          .append("body {\n")
          .append("  font-family: var(--font-stack);\n")
          .append("  background-color: var(--page-bg);\n")
          .append("  color: var(--text-dark);\n")
          .append("  min-height: 100vh;\n")
          .append("  display: flex;\n")
          .append("  align-items: center;\n")
          .append("  justify-content: center;\n")
          .append("  padding: 24px;\n")
          .append("}\n")
          .append(".auth-split-card {\n")
          .append("  width: 100%;\n")
          .append("  max-width: 1060px;\n")
          .append("  background: var(--card-white);\n")
          .append("  border: 1px solid var(--border-gray);\n")
          .append("  border-radius: var(--radius-lg);\n")
          .append("  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);\n")
          .append("  display: flex;\n")
          .append("  overflow: hidden;\n")
          .append("}\n")
          .append(".auth-hero-pane {\n")
          .append("  flex: 1.15;\n")
          .append("  background: #0B2342;\n")
          .append("  position: relative;\n")
          .append("  overflow: hidden;\n")
          .append("  display: flex;\n")
          .append("  min-height: 620px;\n")
          .append("}\n")
          .append(".auth-hero-img {\n")
          .append("  width: 100%;\n")
          .append("  height: 100%;\n")
          .append("  object-fit: cover;\n")
          .append("  object-position: left center;\n")
          .append("  display: block;\n")
          .append("}\n")
          .append(".auth-form-pane {\n")
          .append("  flex: 1;\n")
          .append("  padding: 36px 42px;\n")
          .append("  display: flex;\n")
          .append("  flex-direction: column;\n")
          .append("  justify-content: center;\n")
          .append("  background: #FFFFFF;\n")
          .append("  position: relative;\n")
          .append("}\n")
          .append(".auth-top-quote {\n")
          .append("  text-align: right;\n")
          .append("  font-size: 11.5px;\n")
          .append("  color: var(--text-muted);\n")
          .append("  font-style: italic;\n")
          .append("  margin-bottom: 18px;\n")
          .append("  line-height: 1.35;\n")
          .append("}\n")
          .append(".auth-top-quote-bar {\n")
          .append("  width: 24px;\n")
          .append("  height: 2px;\n")
          .append("  background: var(--primary-blue);\n")
          .append("  margin-left: auto;\n")
          .append("  margin-top: 4px;\n")
          .append("  border-radius: 2px;\n")
          .append("}\n")
          .append(".auth-title {\n")
          .append("  font-size: 24px;\n")
          .append("  font-weight: 700;\n")
          .append("  color: var(--primary-navy);\n")
          .append("  letter-spacing: -0.4px;\n")
          .append("  margin-bottom: 6px;\n")
          .append("}\n")
          .append(".auth-subtitle {\n")
          .append("  font-size: 13.5px;\n")
          .append("  color: var(--text-muted);\n")
          .append("  margin-bottom: 20px;\n")
          .append("  line-height: 1.45;\n")
          .append("}\n")
          .append(".auth-toggle-group {\n")
          .append("  display: flex;\n")
          .append("  background: #F1F5F9;\n")
          .append("  padding: 4px;\n")
          .append("  border-radius: 10px;\n")
          .append("  margin-bottom: 20px;\n")
          .append("  border: 1px solid #E2E8F0;\n")
          .append("}\n")
          .append(".auth-toggle-btn {\n")
          .append("  flex: 1;\n")
          .append("  text-align: center;\n")
          .append("  padding: 8px 14px;\n")
          .append("  font-size: 13.5px;\n")
          .append("  font-weight: 600;\n")
          .append("  color: #64748B;\n")
          .append("  text-decoration: none;\n")
          .append("  border-radius: 7px;\n")
          .append("  transition: all 0.15s ease;\n")
          .append("}\n")
          .append(".auth-toggle-btn.active {\n")
          .append("  background: var(--primary-blue);\n")
          .append("  color: #FFFFFF;\n")
          .append("  box-shadow: 0 2px 6px rgba(23, 101, 209, 0.25);\n")
          .append("}\n")
          .append(".auth-toggle-btn:not(.active):hover {\n")
          .append("  color: var(--text-dark);\n")
          .append("  background: rgba(255, 255, 255, 0.6);\n")
          .append("}\n")
          .append(".alert-banner {\n")
          .append("  padding: 11px 14px;\n")
          .append("  border-radius: var(--radius-sm);\n")
          .append("  font-size: 13px;\n")
          .append("  margin-bottom: 16px;\n")
          .append("  display: flex;\n")
          .append("  align-items: center;\n")
          .append("  gap: 8px;\n")
          .append("  line-height: 1.4;\n")
          .append("}\n")
          .append(".alert-error {\n")
          .append("  background-color: #FFF0F3;\n")
          .append("  border: 1px solid #FECDD3;\n")
          .append("  color: #BE123C;\n")
          .append("}\n")
          .append(".form-group {\n")
          .append("  margin-bottom: 13px;\n")
          .append("}\n")
          .append(".form-label {\n")
          .append("  display: block;\n")
          .append("  font-size: 13px;\n")
          .append("  font-weight: 600;\n")
          .append("  color: var(--text-dark);\n")
          .append("  margin-bottom: 5px;\n")
          .append("}\n")
          .append(".input-with-icon {\n")
          .append("  position: relative;\n")
          .append("  display: flex;\n")
          .append("  align-items: center;\n")
          .append("}\n")
          .append(".field-icon {\n")
          .append("  position: absolute;\n")
          .append("  left: 13px;\n")
          .append("  width: 17px;\n")
          .append("  height: 17px;\n")
          .append("  stroke: #94A3B8;\n")
          .append("  pointer-events: none;\n")
          .append("}\n")
          .append(".form-input {\n")
          .append("  width: 100%;\n")
          .append("  padding: 10px 14px 10px 38px;\n")
          .append("  border: 1px solid var(--border-gray);\n")
          .append("  border-radius: var(--radius-sm);\n")
          .append("  font-size: 13.5px;\n")
          .append("  color: var(--text-dark);\n")
          .append("  background-color: #FAFCFE;\n")
          .append("  outline: none;\n")
          .append("  transition: all 0.15s ease;\n")
          .append("  font-family: inherit;\n")
          .append("}\n")
          .append(".form-input:focus {\n")
          .append("  background-color: #FFFFFF;\n")
          .append("  border-color: var(--primary-blue);\n")
          .append("  box-shadow: 0 0 0 3px rgba(23, 101, 209, 0.14);\n")
          .append("}\n")
          .append(".btn-submit {\n")
          .append("  width: 100%;\n")
          .append("  padding: 11.5px;\n")
          .append("  background-color: var(--btn-blue);\n")
          .append("  color: #FFFFFF;\n")
          .append("  border: none;\n")
          .append("  border-radius: var(--radius-sm);\n")
          .append("  font-size: 14px;\n")
          .append("  font-weight: 600;\n")
          .append("  cursor: pointer;\n")
          .append("  transition: background-color 0.15s ease, transform 0.05s ease;\n")
          .append("  font-family: inherit;\n")
          .append("  display: inline-flex;\n")
          .append("  align-items: center;\n")
          .append("  justify-content: center;\n")
          .append("  gap: 8px;\n")
          .append("  margin-top: 6px;\n")
          .append("}\n")
          .append(".btn-submit:hover {\n")
          .append("  background-color: var(--btn-blue-hover);\n")
          .append("}\n")
          .append(".btn-submit:active {\n")
          .append("  transform: scale(0.99);\n")
          .append("}\n")
          .append(".auth-divider {\n")
          .append("  display: flex;\n")
          .append("  align-items: center;\n")
          .append("  margin: 18px 0;\n")
          .append("  color: #94A3B8;\n")
          .append("  font-size: 12px;\n")
          .append("}\n")
          .append(".auth-divider::before, .auth-divider::after {\n")
          .append("  content: '';\n")
          .append("  flex: 1;\n")
          .append("  height: 1px;\n")
          .append("  background: #E2E8F0;\n")
          .append("}\n")
          .append(".auth-divider span {\n")
          .append("  padding: 0 10px;\n")
          .append("}\n")
          .append(".btn-create-account {\n")
          .append("  display: inline-flex;\n")
          .append("  align-items: center;\n")
          .append("  justify-content: center;\n")
          .append("  gap: 8px;\n")
          .append("  width: 100%;\n")
          .append("  padding: 10.5px;\n")
          .append("  background: #FFFFFF;\n")
          .append("  color: var(--primary-blue);\n")
          .append("  border: 1px solid #BFDBFE;\n")
          .append("  border-radius: var(--radius-sm);\n")
          .append("  font-size: 13.5px;\n")
          .append("  font-weight: 600;\n")
          .append("  text-decoration: none;\n")
          .append("  transition: all 0.15s ease;\n")
          .append("}\n")
          .append(".btn-create-account:hover {\n")
          .append("  background: #F0F6FD;\n")
          .append("  border-color: #93C5FD;\n")
          .append("}\n")
          .append(".demo-box {\n")
          .append("  background: #F0F6FD;\n")
          .append("  border: 1px solid #BFDBFE;\n")
          .append("  border-radius: var(--radius-sm);\n")
          .append("  padding: 12px 14px;\n")
          .append("  margin-bottom: 18px;\n")
          .append("}\n")
          .append(".demo-box-header {\n")
          .append("  display: flex;\n")
          .append("  align-items: center;\n")
          .append("  justify-content: space-between;\n")
          .append("  margin-bottom: 8px;\n")
          .append("}\n")
          .append(".demo-box-title {\n")
          .append("  display: flex;\n")
          .append("  align-items: center;\n")
          .append("  gap: 6px;\n")
          .append("  font-size: 11.5px;\n")
          .append("  font-weight: 700;\n")
          .append("  color: #1E40AF;\n")
          .append("  text-transform: uppercase;\n")
          .append("  letter-spacing: 0.5px;\n")
          .append("}\n")
          .append(".demo-icon {\n")
          .append("  width: 14px;\n")
          .append("  height: 14px;\n")
          .append("  stroke: #2563EB;\n")
          .append("}\n")
          .append(".demo-file-chip {\n")
          .append("  display: inline-flex;\n")
          .append("  align-items: center;\n")
          .append("  gap: 4px;\n")
          .append("  padding: 2px 8px;\n")
          .append("  background: #FFFFFF;\n")
          .append("  border: 1px solid #93C5FD;\n")
          .append("  border-radius: 4px;\n")
          .append("  color: #1D4ED8;\n")
          .append("  font-size: 11px;\n")
          .append("  font-weight: 600;\n")
          .append("  text-decoration: none;\n")
          .append("  transition: all 0.15s ease;\n")
          .append("}\n")
          .append(".demo-file-chip:hover {\n")
          .append("  background: #DBEAFE;\n")
          .append("  color: #1E40AF;\n")
          .append("}\n")
          .append(".demo-actions {\n")
          .append("  display: flex;\n")
          .append("  gap: 8px;\n")
          .append("}\n")
          .append(".btn-demo-quick-login {\n")
          .append("  flex: 1;\n")
          .append("  display: inline-flex;\n")
          .append("  align-items: center;\n")
          .append("  justify-content: center;\n")
          .append("  gap: 6px;\n")
          .append("  padding: 6.5px 10px;\n")
          .append("  background: #1765D1;\n")
          .append("  color: #FFFFFF;\n")
          .append("  border: 1px solid #1765D1;\n")
          .append("  border-radius: var(--radius-sm);\n")
          .append("  font-size: 12px;\n")
          .append("  font-weight: 600;\n")
          .append("  cursor: pointer;\n")
          .append("  text-decoration: none;\n")
          .append("  transition: all 0.15s ease;\n")
          .append("  font-family: inherit;\n")
          .append("}\n")
          .append(".btn-demo-quick-login:hover {\n")
          .append("  background: #1352AA;\n")
          .append("}\n")
          .append("@media (max-width: 900px) {\n")
          .append("  .auth-split-card {\n")
          .append("    flex-direction: column;\n")
          .append("    max-width: 480px;\n")
          .append("  }\n")
          .append("  .auth-hero-pane {\n")
          .append("    min-height: 220px;\n")
          .append("    max-height: 250px;\n")
          .append("  }\n")
          .append("  .auth-hero-img {\n")
          .append("    object-position: 22% 40%;\n")
          .append("  }\n")
          .append("  .auth-form-pane {\n")
          .append("    padding: 28px 24px;\n")
          .append("  }\n")
          .append("}\n")
          .append("</style>\n</head>\n<body>\n")
          .append("<div class='auth-split-card'>\n")
          .append("  <div class='auth-hero-pane'>\n")
          .append("    <img src='/assets/aistudio/image_103eb014.png' alt='CareerTrack — Track Your Applications. Build Your Future.' class='auth-hero-img'>\n")
          .append("  </div>\n")
          .append("  <div class='auth-form-pane'>\n")
          .append("    <div class='auth-top-quote'>\n")
          .append("      <div>Small steps today,</div>\n")
          .append("      <div>big opportunities tomorrow.</div>\n")
          .append("      <div class='auth-top-quote-bar'></div>\n")
          .append("    </div>\n")
          .append("    <h2 class='auth-title'>Register User</h2>\n")
          .append("    <p class='auth-subtitle'>Create your personal account to organize and track career applications.</p>\n")
          .append("    <div class='auth-toggle-group'>\n")
          .append("      <a href='/signin' class='auth-toggle-btn'>Sign In</a>\n")
          .append("      <a href='/signup' class='auth-toggle-btn active'>Register</a>\n")
          .append("    </div>\n");

        if (error != null && !error.isEmpty()) {
            sb.append("    <div class='alert-banner alert-error'>\n")
              .append("      <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='12' cy='12' r='10'></circle><line x1='12' y1='8' x2='12' y2='12'></line><line x1='12' y1='16' x2='12.01' y2='16'></line></svg>\n")
              .append("      <span>").append(escapeHtml(error)).append("</span>\n")
              .append("    </div>\n");
        }

        sb.append("    <form method='POST' action='/signup' autocomplete='on'>\n")
          .append("      <div class='form-group'>\n")
          .append("        <label class='form-label' for='fullName'>Full Name</label>\n")
          .append("        <div class='input-with-icon'>\n")
          .append("          <svg class='field-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'></path><circle cx='12' cy='7' r='4'></circle></svg>\n")
          .append("          <input type='text' id='fullName' name='fullName' class='form-input' placeholder='e.g. Ramya Ranjith' required autofocus>\n")
          .append("        </div>\n")
          .append("      </div>\n")
          .append("      <div class='form-group'>\n")
          .append("        <label class='form-label' for='email'>Email Address</label>\n")
          .append("        <div class='input-with-icon'>\n")
          .append("          <svg class='field-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z'></path><polyline points='22,6 12,13 2,6'></polyline></svg>\n")
          .append("          <input type='email' id='email' name='email' class='form-input' placeholder='ramya@college.edu' required>\n")
          .append("        </div>\n")
          .append("      </div>\n")
          .append("      <div class='form-group'>\n")
          .append("        <label class='form-label' for='password'>Password</label>\n")
          .append("        <div class='input-with-icon'>\n")
          .append("          <svg class='field-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><rect x='3' y='11' width='18' height='11' rx='2' ry='2'></rect><path d='M7 11V7a5 5 0 0 1 10 0v4'></path></svg>\n")
          .append("          <input type='password' id='password' name='password' class='form-input' placeholder='Minimum 6 characters' minlength='6' required>\n")
          .append("        </div>\n")
          .append("      </div>\n")
          .append("      <div class='form-group'>\n")
          .append("        <label class='form-label' for='confirmPassword'>Confirm Password</label>\n")
          .append("        <div class='input-with-icon'>\n")
          .append("          <svg class='field-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><rect x='3' y='11' width='18' height='11' rx='2' ry='2'></rect><path d='M7 11V7a5 5 0 0 1 10 0v4'></path></svg>\n")
          .append("          <input type='password' id='confirmPassword' name='confirmPassword' class='form-input' placeholder='Re-enter your password' minlength='6' required>\n")
          .append("        </div>\n")
          .append("      </div>\n")
          .append("      <button type='submit' class='btn-submit'>\n")
          .append("        <span>Register User</span>\n")
          .append("        <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5'><line x1='5' y1='12' x2='19' y2='12'></line><polyline points='12 5 19 12 12 19'></polyline></svg>\n")
          .append("      </button>\n")
          .append("    </form>\n")
          .append("    <div class='auth-divider'><span>or</span></div>\n")
          .append("    <a href='/signin' class='btn-create-account'>\n")
          .append("      <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4'></path><polyline points='10 17 15 12 10 7'></polyline><line x1='15' y1='12' x2='3' y2='12'></line></svg>\n")
          .append("      <span>Already have an account? Sign In</span>\n")
          .append("    </a>\n")
          .append("  </div>\n")
          .append("</div>\n</body>\n</html>");

        return sb.toString();
    }

    // =========================================================================
    // POST HANDLERS FOR FORMS (PROTECTED BY SESSION GUARD)
    // =========================================================================

    static class AddApplicationHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (getAuthenticatedSession(exchange) == null) {
                sendRedirect(exchange, "/signin");
                return;
            }
            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, String> data = parseFormData(exchange);
                try {
                    int companyId = Integer.parseInt(data.getOrDefault("companyId", "0"));
                    String role = data.getOrDefault("role", "");
                    String type = data.getOrDefault("type", "Job");
                    String appliedDateStr = data.getOrDefault("appliedDate", "");
                    LocalDate appliedDate = appliedDateStr.isEmpty() ? LocalDate.now() : LocalDate.parse(appliedDateStr);
                    String status = data.getOrDefault("status", "Applied");
                    String followUpStr = data.getOrDefault("followUpDate", "");
                    LocalDate followUpDate = followUpStr.isEmpty() ? null : LocalDate.parse(followUpStr);

                    Application app;
                    if ("Job".equalsIgnoreCase(type)) {
                        app = new JobApplication(companyId, role, appliedDate, status, followUpDate);
                    } else {
                        app = new InternshipApplication(companyId, role, appliedDate, status, followUpDate);
                    }
                    applicationDAO.addApplication(app);
                } catch (Exception e) {
                    System.err.println("Error adding application: " + e.getMessage());
                }
            }
            sendRedirect(exchange, "/#applications");
        }
    }

    static class UpdateAppStatusHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (getAuthenticatedSession(exchange) == null) {
                sendRedirect(exchange, "/signin");
                return;
            }
            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, String> data = parseFormData(exchange);
                try {
                    int appId = Integer.parseInt(data.getOrDefault("applicationId", "0"));
                    String status = data.getOrDefault("status", "Applied");
                    applicationDAO.updateStatus(appId, status);
                } catch (Exception e) {
                    System.err.println("Error updating application status: " + e.getMessage());
                }
            }
            sendRedirect(exchange, "/#applications");
        }
    }

    static class UpdateApplicationHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (getAuthenticatedSession(exchange) == null) {
                sendRedirect(exchange, "/signin");
                return;
            }
            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, String> data = parseFormData(exchange);
                try {
                    int appId = Integer.parseInt(data.getOrDefault("applicationId", "0"));
                    int companyId = Integer.parseInt(data.getOrDefault("companyId", "0"));
                    String role = data.getOrDefault("role", "");
                    String type = data.getOrDefault("type", "Job");
                    String appliedDateStr = data.getOrDefault("appliedDate", "");
                    LocalDate appliedDate = appliedDateStr.isEmpty() ? LocalDate.now() : LocalDate.parse(appliedDateStr);
                    String status = data.getOrDefault("status", "Applied");
                    String followUpStr = data.getOrDefault("followUpDate", "");
                    LocalDate followUpDate = followUpStr.isEmpty() ? null : LocalDate.parse(followUpStr);

                    Application app;
                    if ("Job".equalsIgnoreCase(type)) {
                        app = new JobApplication(appId, companyId, null, role, appliedDate, status, followUpDate);
                    } else {
                        app = new InternshipApplication(appId, companyId, null, role, appliedDate, status, followUpDate);
                    }
                    applicationDAO.updateApplication(app);
                } catch (Exception e) {
                    System.err.println("Error updating application: " + e.getMessage());
                }
            }
            sendRedirect(exchange, "/#applications");
        }
    }

    static class DeleteApplicationHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (getAuthenticatedSession(exchange) == null) {
                sendRedirect(exchange, "/signin");
                return;
            }
            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, String> data = parseFormData(exchange);
                try {
                    int appId = Integer.parseInt(data.getOrDefault("applicationId", "0"));
                    applicationDAO.deleteApplication(appId);
                } catch (Exception e) {
                    System.err.println("Error deleting application: " + e.getMessage());
                }
            }
            sendRedirect(exchange, "/#applications");
        }
    }

    static class AddInterviewHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (getAuthenticatedSession(exchange) == null) {
                sendRedirect(exchange, "/signin");
                return;
            }
            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, String> data = parseFormData(exchange);
                try {
                    int appId = Integer.parseInt(data.getOrDefault("applicationId", "0"));
                    String dateStr = data.getOrDefault("interviewDate", "");
                    LocalDate ivDate = dateStr.isEmpty() ? LocalDate.now() : LocalDate.parse(dateStr);
                    String round = data.getOrDefault("round", "Technical");
                    String result = data.getOrDefault("result", "Pending");

                    interviewDAO.addInterview(new Interview(appId, ivDate, round, result));
                } catch (Exception e) {
                    System.err.println("Error scheduling interview: " + e.getMessage());
                }
            }
            sendRedirect(exchange, "/#interviews");
        }
    }

    static class UpdateInterviewResultHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (getAuthenticatedSession(exchange) == null) {
                sendRedirect(exchange, "/signin");
                return;
            }
            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, String> data = parseFormData(exchange);
                try {
                    int ivId = Integer.parseInt(data.getOrDefault("interviewId", "0"));
                    String result = data.getOrDefault("result", "Pending");
                    interviewDAO.updateResult(ivId, result);
                } catch (Exception e) {
                    System.err.println("Error updating interview result: " + e.getMessage());
                }
            }
            sendRedirect(exchange, "/#interviews");
        }
    }

    static class DeleteInterviewHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (getAuthenticatedSession(exchange) == null) {
                sendRedirect(exchange, "/signin");
                return;
            }
            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, String> data = parseFormData(exchange);
                try {
                    int ivId = Integer.parseInt(data.getOrDefault("interviewId", "0"));
                    interviewDAO.deleteInterview(ivId);
                } catch (Exception e) {
                    System.err.println("Error deleting interview: " + e.getMessage());
                }
            }
            sendRedirect(exchange, "/#interviews");
        }
    }

    static class AddFollowUpHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (getAuthenticatedSession(exchange) == null) {
                sendRedirect(exchange, "/signin");
                return;
            }
            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, String> data = parseFormData(exchange);
                try {
                    int appId = Integer.parseInt(data.getOrDefault("applicationId", "0"));
                    String fDateStr = data.getOrDefault("followUpDate", "");
                    LocalDate fDate = fDateStr.isEmpty() ? null : LocalDate.parse(fDateStr);
                    applicationDAO.setFollowUpDate(appId, fDate);
                } catch (Exception e) {
                    System.err.println("Error setting follow-up: " + e.getMessage());
                }
            }
            sendRedirect(exchange, "/#followups");
        }
    }

    static class AddOfferHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (getAuthenticatedSession(exchange) == null) {
                sendRedirect(exchange, "/signin");
                return;
            }
            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, String> data = parseFormData(exchange);
                try {
                    int appId = Integer.parseInt(data.getOrDefault("applicationId", "0"));
                    double pkg = Double.parseDouble(data.getOrDefault("packageLpa", "0.0"));
                    String dStr = data.getOrDefault("deadline", "");
                    LocalDate deadline = dStr.isEmpty() ? LocalDate.now().plusWeeks(2) : LocalDate.parse(dStr);
                    String status = data.getOrDefault("offerStatus", "Pending");

                    offerDAO.addOffer(new Offer(appId, pkg, deadline, status));
                } catch (Exception e) {
                    System.err.println("Error recording offer: " + e.getMessage());
                }
            }
            sendRedirect(exchange, "/#offers");
        }
    }

    static class UpdateOfferStatusHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (getAuthenticatedSession(exchange) == null) {
                sendRedirect(exchange, "/signin");
                return;
            }
            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, String> data = parseFormData(exchange);
                try {
                    int offId = Integer.parseInt(data.getOrDefault("offerId", "0"));
                    String status = data.getOrDefault("offerStatus", "Pending");
                    offerDAO.updateOfferStatus(offId, status);
                } catch (Exception e) {
                    System.err.println("Error updating offer decision: " + e.getMessage());
                }
            }
            sendRedirect(exchange, "/#offers");
        }
    }

    static class DeleteOfferHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (getAuthenticatedSession(exchange) == null) {
                sendRedirect(exchange, "/signin");
                return;
            }
            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, String> data = parseFormData(exchange);
                try {
                    int offId = Integer.parseInt(data.getOrDefault("offerId", "0"));
                    offerDAO.deleteOffer(offId);
                } catch (Exception e) {
                    System.err.println("Error deleting offer: " + e.getMessage());
                }
            }
            sendRedirect(exchange, "/#offers");
        }
    }
}
