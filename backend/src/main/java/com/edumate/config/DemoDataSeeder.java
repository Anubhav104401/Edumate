package com.edumate.config;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.UUID;

import javax.imageio.ImageIO;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.edumate.academic.Course;
import com.edumate.academic.CourseRepository;
import com.edumate.academic.ExamSession;
import com.edumate.academic.ExamSessionRepository;
import com.edumate.academic.Program;
import com.edumate.academic.ProgramRepository;
import com.edumate.academic.Student;
import com.edumate.academic.StudentRepository;
import com.edumate.admissions.AdmissionApplication;
import com.edumate.admissions.AdmissionApplicationRepository;
import com.edumate.admissions.AdmissionStatus;
import com.edumate.attendance.AttendanceSession;
import com.edumate.attendance.AttendanceSessionRepository;
import com.edumate.attendance.MedicalExemption;
import com.edumate.attendance.MedicalExemptionRepository;
import com.edumate.documents.ApplicationDocument;
import com.edumate.documents.ApplicationDocumentRepository;
import com.edumate.documents.DocumentType;
import com.edumate.documents.FileKind;
import com.edumate.documents.ObjectStore;
import com.edumate.exam.Mark;
import com.edumate.exam.MarkRepository;
import com.edumate.exam.ResultSet;
import com.edumate.exam.ResultSetRepository;
import com.edumate.exam.StudentResult;
import com.edumate.exam.StudentResultRepository;
import com.edumate.fees.FeeDemand;
import com.edumate.fees.FeeDemandRepository;
import com.edumate.fees.FeeLedger;
import com.edumate.fees.Payment;
import com.edumate.fees.PaymentRepository;
import com.edumate.library.Book;
import com.edumate.library.BookLoan;
import com.edumate.library.BookLoanRepository;
import com.edumate.library.BookRepository;
import com.edumate.security.AppUser;
import com.edumate.security.AppUserRepository;
import com.edumate.security.Role;
import com.edumate.timetable.TimetableEntry;
import com.edumate.timetable.TimetableRepository;
import com.edumate.timetable.TimetableSolver;

/**
 * Fills an EMPTY database with demonstration data, so every screen has something to show.
 * Runs only when edumate.demo.seed=true (the dev and docker profiles) and there are no users yet.
 *
 * The data is random but REPEATABLE (new Random(2026) always produces the same sequence), and a few
 * records are placed on purpose so the report's test cases can be shown live:
 *   - student Aarav Sharma (23BTRCS007): exactly 75.00% in Operating Systems (TC-009, DEF-019),
 *     grades S, A, B, B, C over credits 4, 4, 3, 3, 2 (TC-013), fee not yet paid (TC-005, TC-006);
 *   - student 23BTRCS003: internal marks of 18 in DBMS, to amend to 22 (TC-012);
 *   - student Ishaan Verma (23BTRCS012): attendance shortfall, a medical exemption, fees overdue (R2, R4);
 *   - student Kiran Joshi (23BTRCS015): internal assessment missing in SQA (rule R5);
 *   - applicant Rohan Gupta: 17 years old, guardian consent still needed (TC-020).
 * Every demo account uses the password Edumate@2026.
 */
@Component
@Order(2)
@ConditionalOnProperty(prefix = "edumate.demo", name = "seed", havingValue = "true")
public class DemoDataSeeder implements ApplicationRunner {

    public static final String DEMO_PASSWORD = "Edumate@2026";

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);
    private static final String JGC = "JGC";
    private static final String CCC = "CCC";
    private static final int WEEKS_TAUGHT = 8;

    private static final String[] FIRST = {"Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Krishna",
            "Shaurya", "Ananya", "Diya", "Aadhya", "Saanvi", "Myra", "Kiara", "Anika", "Navya", "Pari", "Riya",
            "Kavya", "Meera", "Nisha", "Pooja", "Sneha", "Rahul", "Rohit", "Karthik", "Nikhil", "Varun", "Tanvi",
            "Harsha", "Deepa", "Manoj", "Lakshmi", "Pranav", "Sanjana", "Tejas"};
    private static final String[] LAST = {"Reddy", "Nair", "Iyer", "Rao", "Gowda", "Kulkarni", "Menon", "Das",
            "Shetty", "Hegde", "Pillai", "Bhat", "Kumar", "Singh", "Mishra", "Naidu", "Chopra", "Banerjee",
            "Mukherjee", "Desai", "Kapoor", "Saxena"};

    private final Random random = new Random(2026);

    private final AppUserRepository users;
    private final ProgramRepository programs;
    private final CourseRepository courses;
    private final StudentRepository students;
    private final ExamSessionRepository examSessions;
    private final AttendanceSessionRepository attendanceSessions;
    private final MedicalExemptionRepository exemptions;
    private final MarkRepository marks;
    private final ResultSetRepository resultSets;
    private final StudentResultRepository studentResults;
    private final FeeDemandRepository feeDemands;
    private final PaymentRepository payments;
    private final FeeLedger feeLedger;
    private final BookRepository books;
    private final BookLoanRepository loans;
    private final AdmissionApplicationRepository applications;
    private final ApplicationDocumentRepository documents;
    private final ObjectStore objectStore;
    private final TimetableRepository timetable;
    private final TimetableSolver solver;
    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties properties;
    private final Clock clock;

    private LocalDate today;
    private Instant now;
    private String passwordHash;

    public DemoDataSeeder(AppUserRepository users, ProgramRepository programs, CourseRepository courses,
                          StudentRepository students, ExamSessionRepository examSessions,
                          AttendanceSessionRepository attendanceSessions, MedicalExemptionRepository exemptions,
                          MarkRepository marks, ResultSetRepository resultSets, StudentResultRepository studentResults,
                          FeeDemandRepository feeDemands, PaymentRepository payments, FeeLedger feeLedger,
                          BookRepository books, BookLoanRepository loans, AdmissionApplicationRepository applications,
                          ApplicationDocumentRepository documents, ObjectStore objectStore,
                          TimetableRepository timetable, TimetableSolver solver, JdbcTemplate jdbc,
                          PasswordEncoder passwordEncoder, AppProperties properties, Clock clock) {
        this.users = users;
        this.programs = programs;
        this.courses = courses;
        this.students = students;
        this.examSessions = examSessions;
        this.attendanceSessions = attendanceSessions;
        this.exemptions = exemptions;
        this.marks = marks;
        this.resultSets = resultSets;
        this.studentResults = studentResults;
        this.feeDemands = feeDemands;
        this.payments = payments;
        this.feeLedger = feeLedger;
        this.books = books;
        this.loans = loans;
        this.applications = applications;
        this.documents = documents;
        this.objectStore = objectStore;
        this.timetable = timetable;
        this.solver = solver;
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
        this.properties = properties;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (users.count() > 0) {
            return;
        }
        long started = System.currentTimeMillis();
        today = LocalDate.now(clock);
        now = Instant.now(clock);
        passwordHash = passwordEncoder.encode(DEMO_PASSWORD);   // hashed once, reused: bcrypt is slow on purpose
        clearOldDemoUploads();

        Program btech = programs.save(new Program("BTCSE", "B.Tech Computer Science and Engineering", "UG", 60, JGC));
        Program mtech = programs.save(new Program("MTCSE", "M.Tech Computer Science and Engineering", "PG", 18, JGC));
        programs.save(new Program("MBA", "Master of Business Administration", "PG", 30, JGC));

        user("admin", "Ravi Prakash", Role.ADMIN, JGC, null);
        user("examsup", "Dr. Lakshmi Menon", Role.EXAM_SUPERINTENDENT, JGC, null);
        user("examsup2", "Prof. Suresh Iyer", Role.EXAM_SUPERINTENDENT, JGC, null);
        user("admissions", "Nandini Rao", Role.ADMISSIONS_OFFICER, JGC, null);
        user("accounts", "Harish Gowda", Role.ACCOUNTS_OFFICER, JGC, null);
        user("librarian", "Farah Siddiqui", Role.LIBRARIAN, JGC, null);
        AppUser kavya = user("kavya.rao", "Dr. Kavya Rao", Role.FACULTY, JGC, null);
        AppUser arjun = user("arjun.shetty", "Prof. Arjun Shetty", Role.FACULTY, JGC, null);
        AppUser meera = user("meera.nair", "Dr. Meera Nair", Role.FACULTY, JGC, null);
        AppUser vikram = user("vikram.das", "Prof. Vikram Das", Role.FACULTY, JGC, null);
        AppUser sneha = user("sneha.kulkarni", "Dr. Sneha Kulkarni", Role.FACULTY, JGC, null);

        List<Course> sem5 = List.of(
                courses.save(new Course("23CS501", "Design and Analysis of Algorithms", 4, 4, btech.getId(), 5, kavya.getId())),
                courses.save(new Course("23CS502", "Database Management Systems", 4, 4, btech.getId(), 5, arjun.getId())),
                courses.save(new Course("23CS503", "Operating Systems", 3, 3, btech.getId(), 5, meera.getId())),
                courses.save(new Course("23CS504", "Computer Networks", 3, 3, btech.getId(), 5, vikram.getId())),
                courses.save(new Course("23CS505", "Software Quality Assurance", 2, 2, btech.getId(), 5, sneha.getId())));

        List<ExamSession> history = List.of(
                examSessions.save(new ExamSession("2024-ODD", "Odd semester examinations 2024", today.minusMonths(21), JGC)),
                examSessions.save(new ExamSession("2025-EVEN", "Even semester examinations 2025", today.minusMonths(15), JGC)),
                examSessions.save(new ExamSession("2025-ODD", "Odd semester examinations 2025", today.minusMonths(9), JGC)),
                examSessions.save(new ExamSession("2026-EVEN", "Even semester examinations 2026", today.minusMonths(3), JGC)));
        ExamSession current = examSessions.save(
                new ExamSession("2026-ODD", "Odd semester examinations 2026", today.plusDays(20), JGC));

        List<Student> cohort = createCohort(btech);
        Map<String, Student> byUsn = new HashMap<>();
        cohort.forEach(s -> byUsn.put(s.getUsn(), s));
        Student aarav = byUsn.get("23BTRCS007");
        Student ishaan = byUsn.get("23BTRCS012");
        user("student", aarav.getFullName(), Role.STUDENT, JGC, aarav.getId());
        user("guardian", aarav.getGuardianName(), Role.GUARDIAN, JGC, aarav.getId());
        user("student2", ishaan.getFullName(), Role.STUDENT, JGC, ishaan.getId());

        Map<Long, Double> diligence = new HashMap<>();
        Map<Long, Double> ability = new HashMap<>();
        for (Student s : cohort) {
            diligence.put(s.getId(), 0.66 + random.nextDouble() * 0.32);
            ability.put(s.getId(), 48 + random.nextDouble() * 46);
        }
        seedAttendance(sem5, cohort, diligence, List.of(kavya, arjun, meera, vikram, sneha));
        exemptions.save(new MedicalExemption(ishaan.getId(), sem5.get(2).getId(),
                "Hospitalised for 9 days (certificate verified)", true, "examsup", now));
        seedMarks(sem5, cohort, ability, current);
        seedHistory(btech, cohort, ability, history);
        seedFees(cohort);
        seedLibrary(cohort, aarav);
        seedTimetables(btech, sem5);
        seedAdmissions(btech, mtech);
        seedSecondCampus();

        log.info("Demo data ready in {} ms. Log in with any demo account, password {}",
                System.currentTimeMillis() - started, DEMO_PASSWORD);
    }

    // ------------------------------------------------------------------ people

    private AppUser user(String username, String fullName, Role role, String campus, Long studentId) {
        String email = username.replace(' ', '.') + "@edumate.test";
        return users.save(new AppUser(username, passwordHash, fullName, email, role, campus, studentId, now));
    }

    /** 60 fifth-semester B.Tech CSE students: section A = 001-030, section B = 031-060. */
    private List<Student> createCohort(Program btech) {
        Map<Integer, String[]> fixed = Map.of(
                7, new String[]{"Aarav", "Sharma"},
                12, new String[]{"Ishaan", "Verma"},
                15, new String[]{"Kiran", "Joshi"});
        Set<String> used = new HashSet<>();
        List<Student> cohort = new ArrayList<>();
        for (int n = 1; n <= 60; n++) {
            String[] name = fixed.get(n);
            if (name == null) {
                do {
                    name = new String[]{FIRST[random.nextInt(FIRST.length)], LAST[random.nextInt(LAST.length)]};
                } while (!used.add(name[0] + name[1]));
            }
            String usn = String.format("23BTRCS%03d", n);
            LocalDate dob = LocalDate.of(2004, 1, 1).plusDays(random.nextInt(600));
            Student s = new Student(usn, name[0] + " " + name[1], dob,
                    name[0].toLowerCase() + "." + name[1].toLowerCase() + n + "@students.edumate.test",
                    "98450" + String.format("%05d", 10000 + n), btech.getId(), 5, n <= 30 ? "A" : "B", JGC);
            String guardianFirst = n == 7 ? "Rajesh" : FIRST[random.nextInt(FIRST.length)];
            s.setGuardian(guardianFirst + " " + name[1], "guardian." + usn.toLowerCase() + "@parents.edumate.test",
                    "99000" + String.format("%05d", 10000 + n));
            cohort.add(students.save(s));
        }
        return cohort;
    }

    // ------------------------------------------------------------------ attendance

    /**
     * 8 weeks of classes. Course i meets on the first `weeklyHours` weekdays, section A in period i+1 and
     * section B in a different period, so no teacher is ever in two rooms at once.
     */
    private void seedAttendance(List<Course> sem5, List<Student> cohort, Map<Long, Double> diligence,
                                List<AppUser> teachers) {
        Map<String, int[]> exact = Map.of(
                "23BTRCS007", new int[]{30, 28, 18, 21, 15},   // Aarav: OS = 18/24 = exactly 75.00%
                "23BTRCS012", new int[]{26, 22, 17, 19, 13});  // Ishaan: DBMS 68.75%, OS 70.83%
        LocalDate monday = today.minusWeeks(WEEKS_TAUGHT).with(DayOfWeek.MONDAY);
        List<Object[]> rows = new ArrayList<>();

        for (int c = 0; c < sem5.size(); c++) {
            Course course = sem5.get(c);
            for (String section : List.of("A", "B")) {
                int period = section.equals("A") ? c + 1 : (c + 5) % 6 + 1;
                List<Student> roster = cohort.stream().filter(s -> s.getSection().equals(section)).toList();
                List<Long> sessionIds = new ArrayList<>();
                for (int week = 0; week < WEEKS_TAUGHT; week++) {
                    for (int day = 0; day < course.getWeeklyHours(); day++) {
                        LocalDate date = monday.plusWeeks(week).plusDays(day);
                        AttendanceSession session = attendanceSessions.save(new AttendanceSession(course.getId(),
                                section, date, period, teachers.get(c).getId(), date.atTime(10, 0)
                                .atZone(clock.getZone()).toInstant()));
                        sessionIds.add(session.getId());
                    }
                }
                for (Student student : roster) {
                    boolean[] present = presence(sessionIds.size(), exact.get(student.getUsn()), c,
                            diligence.get(student.getId()));
                    for (int k = 0; k < sessionIds.size(); k++) {
                        rows.add(new Object[]{sessionIds.get(k), student.getId(), present[k]});
                    }
                }
            }
        }
        // Thousands of rows: one batched JDBC statement is far faster than saving entities one by one.
        jdbc.batchUpdate("INSERT INTO attendance_record (session_id, student_id, present) VALUES (?, ?, ?)", rows);
    }

    private boolean[] presence(int held, int[] exactCounts, int courseIndex, double diligence) {
        boolean[] present = new boolean[held];
        if (exactCounts != null) {
            int attended = exactCounts[courseIndex];
            List<Integer> order = new ArrayList<>();
            for (int k = 0; k < held; k++) {
                order.add(k);
            }
            Collections.shuffle(order, random);
            for (int k = 0; k < attended; k++) {
                present[order.get(k)] = true;
            }
            return present;
        }
        for (int k = 0; k < held; k++) {
            present[k] = random.nextDouble() < diligence;
        }
        return present;
    }

    // ------------------------------------------------------------------ marks and results

    private void seedMarks(List<Course> sem5, List<Student> cohort, Map<Long, Double> ability, ExamSession current) {
        int[][] aaravMarks = {{36, 56}, {34, 50}, {30, 45}, {29, 43}, {27, 38}};   // totals 92, 84, 75, 72, 65
        List<Mark> batch = new ArrayList<>();
        for (Student s : cohort) {
            for (int c = 0; c < sem5.size(); c++) {
                BigDecimal internal;
                BigDecimal external;
                if (s.getUsn().equals("23BTRCS007")) {
                    internal = BigDecimal.valueOf(aaravMarks[c][0]);
                    external = BigDecimal.valueOf(aaravMarks[c][1]);
                } else {
                    double total = Math.max(28, Math.min(98, ability.get(s.getId()) + random.nextGaussian() * 7));
                    int in = (int) Math.round(Math.min(40, total * 0.4 + random.nextGaussian() * 2));
                    int ex = (int) Math.round(Math.min(60, total - in));
                    internal = BigDecimal.valueOf(Math.max(0, in));
                    external = BigDecimal.valueOf(Math.max(0, ex));
                }
                if (s.getUsn().equals("23BTRCS003") && c == 1) {
                    internal = BigDecimal.valueOf(18);                                  // TC-012
                }
                if (s.getUsn().equals("23BTRCS015") && c == 4) {
                    internal = null;                                                    // rule R5
                }
                batch.add(new Mark(s.getId(), sem5.get(c).getId(), current.getId(), scale(internal), scale(external),
                        "seed", now));
            }
        }
        marks.saveAll(batch);
    }

    private void seedHistory(Program btech, List<Student> cohort, Map<Long, Double> ability, List<ExamSession> history) {
        double[] aaravSgpa = {8.40, 8.75, 8.52, 8.90};
        int[] credits = {20, 20, 22, 22};
        Map<Long, BigDecimal> points = new HashMap<>();     // running sum of SGPA x credits, per student
        int creditsSoFar = 0;
        for (int sem = 1; sem <= 4; sem++) {
            ResultSet set = new ResultSet(history.get(sem - 1).getId(), btech.getId(), sem);
            set.markPublishedForHistory("examsup", "examsup2", now.minus(120L * (5 - sem), ChronoUnit.DAYS));
            set = resultSets.save(set);
            creditsSoFar += credits[sem - 1];
            List<StudentResult> rows = new ArrayList<>();
            for (Student s : cohort) {
                double base = s.getUsn().equals("23BTRCS007") ? aaravSgpa[sem - 1]
                        : Math.max(5.2, Math.min(9.8, ability.get(s.getId()) / 10 + random.nextGaussian() * 0.35));
                BigDecimal sgpa = BigDecimal.valueOf(base).setScale(2, RoundingMode.HALF_UP);
                BigDecimal total = points.getOrDefault(s.getId(), BigDecimal.ZERO)
                        .add(sgpa.multiply(BigDecimal.valueOf(credits[sem - 1])));
                points.put(s.getId(), total);
                BigDecimal cgpa = total.divide(BigDecimal.valueOf(creditsSoFar), 2, RoundingMode.HALF_UP);
                rows.add(new StudentResult(set.getId(), s.getId(), sgpa, cgpa, credits[sem - 1], credits[sem - 1],
                        StudentResult.PASS));
            }
            studentResults.saveAll(rows);
        }
    }

    // ------------------------------------------------------------------ fees

    private void seedFees(List<Student> cohort) {
        int n = 0;
        for (Student s : cohort) {
            boolean ishaan = s.getUsn().equals("23BTRCS012");
            LocalDate due = ishaan ? today.minusDays(5) : today.plusDays(15);
            FeeDemand demand = feeDemands.save(new FeeDemand(s.getId(), "Semester 5 tuition fee",
                    new BigDecimal("62500.00"), due, now));
            feeLedger.debit(s.getId(), demand.getAmount(), demand.getDescription(), "DEMAND-" + demand.getId());
            boolean unpaid = s.getUsn().equals("23BTRCS007") || ishaan || random.nextDouble() < 0.12;
            if (!unpaid) {
                n++;
                Payment p = payments.save(new Payment(s.getId(), demand.getId(), demand.getAmount(),
                        "ORD-SEED" + String.format("%05d", n), now.minus(10, ChronoUnit.DAYS)));
                String txn = "TXNSEED" + String.format("%07d", n);
                p.markSuccess(txn, "RCPT-SEED-" + String.format("%06d", p.getId()), now.minus(10, ChronoUnit.DAYS));
                feeLedger.credit(s.getId(), demand.getAmount(), "Fee payment, receipt " + p.getReceiptNo(), txn);
            }
        }
    }

    // ------------------------------------------------------------------ library

    private void seedLibrary(List<Student> cohort, Student aarav) {
        String[][] titles = {
                {"9789300000011", "Introduction to Algorithms", "Cormen, Leiserson, Rivest, Stein"},
                {"9789300000028", "Database System Concepts", "Silberschatz, Korth, Sudarshan"},
                {"9789300000035", "Operating System Concepts", "Silberschatz, Galvin, Gagne"},
                {"9789300000042", "Computer Networking: A Top-Down Approach", "Kurose, Ross"},
                {"9789300000059", "Software Engineering: A Practitioner's Approach", "Pressman, Maxim"},
                {"9789300000066", "The Art of Software Testing", "Myers, Sandler, Badgett"},
                {"9789300000073", "Software Quality: Concepts and Practice", "Daniel Galin"},
                {"9789300000080", "Clean Code", "Robert C. Martin"},
                {"9789300000097", "Design Patterns", "Gamma, Helm, Johnson, Vlissides"},
                {"9789300000103", "Computer Organization and Design", "Patterson, Hennessy"},
                {"9789300000110", "Discrete Mathematics and Its Applications", "Kenneth Rosen"},
                {"9789300000127", "Artificial Intelligence: A Modern Approach", "Russell, Norvig"}};
        List<Book> catalogue = new ArrayList<>();
        for (String[] t : titles) {
            catalogue.add(books.save(new Book(t[0], t[1], t[2], 2 + random.nextInt(4), JGC)));
        }
        lend(catalogue.get(0), aarav, today.minusDays(20));          // overdue by 6 days
        lend(catalogue.get(5), aarav, today.minusDays(3));
        for (int i = 0; i < 12; i++) {
            Student s = cohort.get(random.nextInt(cohort.size()));
            if (s.getId().equals(aarav.getId())) {
                continue;
            }
            Book b = catalogue.get(random.nextInt(catalogue.size()));
            if (b.getCopiesAvailable() > 0) {
                lend(b, s, today.minusDays(random.nextInt(25)));
            }
        }
    }

    private void lend(Book book, Student student, LocalDate issued) {
        book.takeCopy();
        loans.save(new BookLoan(book.getId(), student.getId(), issued,
                issued.plusDays(properties.library().loanDays())));
    }

    // ------------------------------------------------------------------ timetables

    /** Publishes a clash-free week for sections B and then A, using the real solver. */
    private void seedTimetables(Program btech, List<Course> sem5) {
        Set<String> busy = new HashSet<>();
        for (String section : List.of("B", "A")) {
            List<TimetableSolver.Lecture> lectures = new ArrayList<>();
            sem5.stream().sorted(Comparator.comparingInt(Course::getWeeklyHours).reversed()).forEach(c -> {
                for (int h = 0; h < c.getWeeklyHours(); h++) {
                    lectures.add(new TimetableSolver.Lecture(c.getId(), c.getFacultyId()));
                }
            });
            List<TimetableSolver.Slot> slots = solver.solve(lectures, busy);
            for (int i = 0; i < lectures.size(); i++) {
                TimetableSolver.Lecture l = lectures.get(i);
                TimetableSolver.Slot slot = slots.get(i);
                TimetableEntry entry = new TimetableEntry(btech.getId(), 5, section, slot.day(), slot.period(),
                        l.courseId(), l.facultyId(), btech.getCode() + "-5" + section);
                entry.publish();
                timetable.save(entry);
                busy.add(TimetableSolver.facultyKey(l.facultyId(), slot.day(), slot.period()));
            }
        }
    }

    // ------------------------------------------------------------------ admissions

    private void seedAdmissions(Program btech, Program mtech) {
        AppUser priya = user("applicant", "Priya Nair", Role.APPLICANT, JGC, null);
        newApplication(priya.getId(), "Priya Nair", LocalDate.of(2002, 3, 14), "priya.nair@applicants.edumate.test",
                mtech, "GEN", new BigDecimal("78.50"), new BigDecimal("81.20"), AdmissionStatus.DRAFT);

        AppUser rohan = user("applicant.minor", "Rohan Gupta", Role.APPLICANT, JGC, null);
        AdmissionApplication rohanApp = newApplication(rohan.getId(), "Rohan Gupta",
                today.minusYears(17).minusMonths(3), "rohan.gupta@applicants.edumate.test", btech, "OBC",
                new BigDecimal("88.00"), new BigDecimal("91.40"), AdmissionStatus.DRAFT);
        rohanApp.fill(rohanApp.getFullName(), rohanApp.getDateOfBirth(), rohanApp.getEmail(), "9876500002",
                btech.getId(), "OBC", rohanApp.getEntranceScore(), rohanApp.getQualifyingPercent(), "Anita Gupta",
                "anita.gupta@parents.edumate.test", "9876500003", now);

        String[] categories = {"GEN", "GEN", "GEN", "GEN", "GEN", "OBC", "OBC", "OBC", "SC", "SC", "ST"};
        AdmissionStatus[] statuses = {AdmissionStatus.SUBMITTED, AdmissionStatus.SUBMITTED,
                AdmissionStatus.UNDER_REVIEW, AdmissionStatus.SHORTLISTED};
        for (int i = 0; i < 30; i++) {
            String name = FIRST[random.nextInt(FIRST.length)] + " " + LAST[random.nextInt(LAST.length)];
            AdmissionApplication app = newApplication(null, name,
                    LocalDate.of(1999, 1, 1).plusDays(random.nextInt(1500)),
                    "applicant" + (i + 1) + "@applicants.edumate.test", mtech,
                    categories[random.nextInt(categories.length)],
                    BigDecimal.valueOf(45 + random.nextInt(5400) / 100.0).setScale(2, RoundingMode.HALF_UP),
                    BigDecimal.valueOf(60 + random.nextInt(3800) / 100.0).setScale(2, RoundingMode.HALF_UP),
                    statuses[random.nextInt(statuses.length)]);
            attachPlaceholderDocuments(app);
        }
    }

    private AdmissionApplication newApplication(Long userId, String name, LocalDate dob, String email, Program program,
                                                String category, BigDecimal entrance, BigDecimal qualifying,
                                                AdmissionStatus status) {
        AdmissionApplication app = new AdmissionApplication(AdmissionApplication.placeholderNumber(), userId, now);
        app.fill(name, dob, email, null, program.getId(), category, entrance, qualifying, null, null, null, now);
        app = applications.save(app);
        app.assignNumber(String.format("APP-%d-%06d", today.getYear(), app.getId()));
        if (status != AdmissionStatus.DRAFT) {
            app.moveTo(AdmissionStatus.SUBMITTED, null, now.minus(random.nextInt(20) + 1, ChronoUnit.DAYS));
            if (status != AdmissionStatus.SUBMITTED) {
                app.moveTo(status, null, now);
            }
        }
        return app;
    }

    /** Small generated files standing in for scanned documents, stored exactly like real uploads. */
    private void attachPlaceholderDocuments(AdmissionApplication app) {
        for (DocumentType type : DocumentType.requiredTypes()) {
            FileKind kind = type == DocumentType.PHOTO ? FileKind.PNG : FileKind.PDF;
            byte[] bytes = kind == FileKind.PNG ? placeholderPng(app.getFullName())
                    : placeholderPdf(type.label() + " - " + app.getFullName());
            String key = "applications/" + app.getId() + "/" + UUID.randomUUID() + "." + kind.extension();
            try {
                objectStore.put(key, bytes);
            } catch (IOException ex) {
                throw new UncheckedIOException(ex);
            }
            documents.save(new ApplicationDocument(app.getId(), type,
                    type.name().toLowerCase() + "." + kind.extension(), key, kind.mimeType(), bytes.length,
                    sha256Hex(bytes), now));
        }
    }

    // ------------------------------------------------------------------ second campus (tenancy demo)

    private void seedSecondCampus() {
        Program bca = programs.save(new Program("BCA", "Bachelor of Computer Applications", "UG", 60, CCC));
        examSessions.save(new ExamSession("CCC-2026-ODD", "City Campus odd semester examinations 2026",
                today.plusDays(25), CCC));
        for (int n = 1; n <= 5; n++) {
            Student s = new Student(String.format("25BCACC%03d", n),
                    FIRST[random.nextInt(FIRST.length)] + " " + LAST[random.nextInt(LAST.length)],
                    LocalDate.of(2007, 6, 1).plusDays(random.nextInt(300)), null, null, bca.getId(), 1, "A", CCC);
            students.save(s);
        }
        user("ccc.admin", "Anil Varadaraj", Role.ADMIN, CCC, null);
    }

    // ------------------------------------------------------------------ helpers

    private static BigDecimal scale(BigDecimal value) {
        return value == null ? null : value.setScale(2, RoundingMode.HALF_UP);
    }

    private void clearOldDemoUploads() {
        Path folder = Paths.get(properties.storage().root(), "applications").toAbsolutePath().normalize();
        if (!Files.exists(folder)) {
            return;
        }
        try (var paths = Files.walk(folder)) {
            paths.sorted(Comparator.reverseOrder()).forEach(p -> p.toFile().delete());
        } catch (IOException ex) {
            log.warn("Could not clear old demo uploads: {}", ex.getMessage());
        }
    }

    /** A valid one-page PDF containing one line of text, built by hand (byte offsets included). */
    static byte[] placeholderPdf(String text) {
        String safe = text.replaceAll("[()\\\\]", "");
        String stream = "BT /F1 16 Tf 72 720 Td (EduMate demo document) Tj 0 -28 Td /F1 12 Tf (" + safe + ") Tj ET";
        String[] objects = {
                "<< /Type /Catalog /Pages 2 0 R >>",
                "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
                        + "/Resources << /Font << /F1 5 0 R >> >> >>",
                "<< /Length " + stream.length() + " >>\nstream\n" + stream + "\nendstream",
                "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"};
        StringBuilder pdf = new StringBuilder("%PDF-1.4\n");
        int[] offsets = new int[objects.length];
        for (int i = 0; i < objects.length; i++) {
            offsets[i] = pdf.length();
            pdf.append(i + 1).append(" 0 obj\n").append(objects[i]).append("\nendobj\n");
        }
        int xref = pdf.length();
        pdf.append("xref\n0 ").append(objects.length + 1).append("\n0000000000 65535 f \n");
        for (int offset : offsets) {
            pdf.append(String.format("%010d 00000 n \n", offset));
        }
        pdf.append("trailer\n<< /Size ").append(objects.length + 1).append(" /Root 1 0 R >>\nstartxref\n")
                .append(xref).append("\n%%EOF\n");
        return pdf.toString().getBytes(StandardCharsets.ISO_8859_1);
    }

    /** A small coloured square with the person's initials, standing in for a passport photograph. */
    static byte[] placeholderPng(String name) {
        BufferedImage image = new BufferedImage(120, 150, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setColor(new Color(0x1F4E79));
        g.fillRect(0, 0, 120, 150);
        g.setColor(Color.WHITE);
        String initials = name.chars().filter(Character::isUpperCase)
                .collect(StringBuilder::new, StringBuilder::appendCodePoint, StringBuilder::append).toString();
        g.drawString(initials, 48, 80);
        g.dispose();
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ImageIO.write(image, "png", out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    private static String sha256Hex(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
