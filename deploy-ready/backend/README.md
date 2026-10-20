# CareerTrack — Job & Internship Application Tracker
## Complete Java + JDBC + MySQL Student Course Project

CareerTrack is a complete, college-level job and internship application tracker designed to align directly with your **Java** and **DBMS** course syllabus.

---

## 📁 Project Structure

```text
back-end/
├── schema.sql                     (Table definitions, keys, constraints & views)
├── sample_data.sql                 (Realistic sample records for all tables)
├── queries.sql                    (Aggregate, group by, set operations & nested subqueries)
├── plsql.sql                      (Trigger, stored procedure, function & ER mapping)
├── lib/
│   └── mysql-connector-j.jar      (MySQL JDBC Driver)
└── src/
    ├── model/                     (OOP Data Models)
    │   ├── Company.java           (Encapsulated company entity)
    │   ├── Application.java       (Abstract parent class)
    │   ├── JobApplication.java    (Child class overriding showDetails)
    │   ├── InternshipApplication.java (Child class overriding showDetails)
    │   ├── Interview.java         (Overloaded constructors)
    │   └── Offer.java             (Offer metrics & status)
    ├── dao/                       (Data Access Layer & Interfaces)
    │   ├── CompanyDAO.java        (Interface contract)
    │   ├── CompanyDAOImpl.java    (PreparedStatement & JDBC implementation)
    │   ├── ApplicationDAO.java    (Interface contract)
    │   ├── ApplicationDAOImpl.java
    │   ├── InterviewDAO.java      (Interface contract)
    │   ├── InterviewDAOImpl.java
    │   ├── OfferDAO.java          (Interface contract)
    │   └── OfferDAOImpl.java
    ├── util/                      (Utilities & Syllabus Demonstrations)
    │   ├── DBConnection.java      (Connection factory & safe cleanup)
    │   ├── InvalidStatusException.java (Custom checked exception)
    │   ├── ReportUtil.java        (Streams API, Lambdas, groupingBy, mapToDouble)
    │   ├── JsonUtil.java          (Zero-dependency JSON serializer)
    │   └── WebServer.java         (Built-in HttpServer REST bridge)
    └── main/
        └── Main.java              (Single JVM entry point & Scanner console menu)
```

---

## 🚀 Setup & Execution Guide

### 1. Database Setup in MySQL
Open your MySQL Workbench, command prompt, or terminal and execute:
```sql
SOURCE back-end/schema.sql;
SOURCE back-end/sample_data.sql;
```
This initializes the `job_tracker` database with the 4 tables (`companies`, `applications`, `interviews`, `offers`) and 3 SQL views.

### 2. Configure Database Credentials
Open `back-end/src/util/DBConnection.java` and adjust your password if needed:
```java
private static final String URL = "jdbc:mysql://localhost:3306/job_tracker";
private static final String USER = "root";
private static final String PASSWORD = "your_mysql_password";
```

### 3. Add MySQL JDBC Driver JAR
Download `mysql-connector-j-8.x.x.jar` (or `mysql-connector-java.jar`) and place it inside:
`back-end/lib/mysql-connector-j.jar`

- In **VS Code**: Press `Ctrl+Shift+P` (or `Cmd+Shift+P`), select **Java: Configure Classpath**, scroll to **Referenced Libraries**, and click **Add Jar**. Select `lib/mysql-connector-j.jar`.

### 4. Compile the Backend
Open a terminal in the `back-end` directory and run:

**On Windows:**
```cmd
javac -cp "lib/*" -d out src/model/*.java src/dao/*.java src/util/*.java src/main/*.java
```

**On Linux / macOS:**
```bash
javac -cp "lib/*" -d out src/model/*.java src/dao/*.java src/util/*.java src/main/*.java
```

### 5. Run the Console Dashboard
Run the compiled `main.Main` class:

**On Windows:**
```cmd
java -cp "out;lib/*" main.Main
```

**On Linux / macOS:**
```bash
java -cp "out:lib/*" main.Main
```

---

## 🎯 Viva Q&A Cheat Sheet (Organized by Syllabus Units)

### Java Portions

#### UNIT I: Java Architecture & Fundamentals
- **Q: What is the entry point of your program, and how does it execute on the JVM?**
  - **A:** `public static void main(String[] args)` in `Main.java` serves as the single entry point. The Java compiler (`javac`) transforms source code into bytecode (`.class` files in `out/`), which the Java Virtual Machine (JVM) interprets and executes with its JIT (Just-In-Time) compiler.
- **Q: Where did you use standard I/O streams?**
  - **A:** In `Main.java`, console input is read via `System.in` (an `InputStream` byte stream) wrapped by `java.util.Scanner` for convenient character-level parsing, and output is displayed via `System.out` (a `PrintStream` character/byte stream).

#### UNIT II: Classes, Inheritance & Abstract Classes
- **Q: Why is `Application.java` an abstract class?**
  - **A:** An application in real life is either a full-time position or an internship. `Application` defines common state (`applicationId`, `companyId`, `role`, `status`) and an abstract method `public abstract String showDetails();`.
- **Q: Where is method overriding demonstrated?**
  - **A:** Both `JobApplication` and `InternshipApplication` extend `Application` and override `showDetails()` and `toString()`. When calling `a.showDetails()`, dynamic method dispatch invokes the child class's specific implementation at runtime.

#### UNIT III: Packages, Interfaces & Exception Handling
- **Q: How are packages and access protection organized?**
  - **A:** Four packages (`model`, `dao`, `util`, `main`). Fields in `model` are `private` or `protected`, exposed via public getters/setters. DAO implementations implement DAO interfaces.
- **Q: Explain your custom exception.**
  - **A:** `InvalidStatusException` extends `Exception` (checked exception). In `ReportUtil.validateStatus()`, if the status is not in the allowed set, it is thrown with `throw new InvalidStatusException(...)`. In `Main.java`, it is caught with `try-catch` to inform the user gracefully.
- **Q: Why use `finally` in database operations?**
  - **A:** Even if an SQL query throws an exception, the `finally` block is guaranteed to execute, ensuring `ps.close()` and `con.close()` are called to prevent connection leaks.

#### UNIT IV: Collections & Iterator
- **Q: Which collections did you use?**
  - **A:** `ArrayList` for storing retrieved records from MySQL, `HashMap` for storing grouping results (e.g. applications per company), and `HashSet` for validation sets.
- **Q: Where is `Iterator` used?**
  - **A:** In `ReportUtil.printSummaryReportWithIterator()`, an `Iterator<Map.Entry<String, Long>>` traverses the status breakdown entries using `hasNext()` and `next()`.

#### UNIT V: Streams API, Lambdas & JDBC
- **Q: Where did you use Lambda expressions and Predicate?**
  - **A:** In `ReportUtil.filterApplications()`, which takes `Predicate<Application> condition` and uses `app -> app.getStatus().equalsIgnoreCase(status)`.
- **Q: How does `groupingBy` work in your report?**
  - **A:** `applications.stream().collect(Collectors.groupingBy(Application::getStatus, Collectors.counting()))` performs map-reduce reduction, counting records in each category.
- **Q: How did you find the highest package?**
  - **A:** Using `offers.stream().mapToDouble(Offer::getPackageLpa).max()`, which returns an `OptionalDouble` handled safely without `NullPointerException`.
- **Q: What is a `PreparedStatement` and why use it over `Statement`?**
  - **A:** A `PreparedStatement` is precompiled by the database engine, executes faster for repeated queries, and uses placeholder parameters (`?`) to prevent SQL Injection attacks.

---

### DBMS Portions

#### UNIT I: Keys, Constraints & Views
- **Q: What constraints did you enforce?**
  - **A:** Primary Key (`AUTO_INCREMENT`), Foreign Key (`ON DELETE CASCADE`), Unique constraint on `contact_email` and `offers.application_id` (enforcing 1-to-1 relationship), `CHECK (package > 0)`, and `ENUM` domain constraints.
- **Q: What is the purpose of your SQL views?**
  - **A:** `view_application_details` provides a pre-joined abstraction over applications, companies, and offers; `view_status_summary` provides quick grouped metrics; and `view_upcoming_followups` calculates date ranges using `CURDATE()`.
- **Q: What set operations and nested subqueries are included in `queries.sql`?**
  - **A:** `UNION` combines companies with offers and interviews; nested subqueries find companies with no applications (`NOT IN`) and packages above average (`> (SELECT AVG(package) FROM offers)`).

#### UNIT II: PL/SQL & ER Mapping
- **Q: Explain the trigger in `plsql.sql`.**
  - **A:** `trg_after_offer_insert` fires `AFTER INSERT ON offers` to automatically execute `UPDATE applications SET status = 'Offered' WHERE application_id = NEW.application_id;`.
- **Q: Explain the relationships in your ER model.**
  - **A:**
    - `Company (1) — (N) Application`
    - `Application (1) — (N) Interview`
    - `Application (1) — (1) Offer` (enforced by `UNIQUE(application_id)` on `offers`).
