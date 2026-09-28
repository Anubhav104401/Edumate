package com.edumate.academic;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.edumate.common.ApiException;
import com.edumate.security.AppUser;
import com.edumate.security.AppUserRepository;
import com.edumate.security.CurrentUser;
import com.edumate.security.Role;

/** Look-up lists the screens need: programmes, courses, rosters, exam sessions, student search. */
@RestController
@RequestMapping("/api/academic")
@Transactional(readOnly = true)
public class AcademicController {

    private final ProgramRepository programs;
    private final CourseRepository courses;
    private final StudentRepository students;
    private final ExamSessionRepository examSessions;
    private final AppUserRepository users;
    private final CourseAccess courseAccess;

    public AcademicController(ProgramRepository programs, CourseRepository courses, StudentRepository students,
                              ExamSessionRepository examSessions, AppUserRepository users,
                              CourseAccess courseAccess) {
        this.programs = programs;
        this.courses = courses;
        this.students = students;
        this.examSessions = examSessions;
        this.users = users;
        this.courseAccess = courseAccess;
    }

    @GetMapping("/programs")
    public List<Program> programs(CurrentUser me) {
        return programs.findByCampusCodeOrderByName(me.campusCode());
    }

    /** Faculty: the courses they teach. Student / guardian: the courses of the student's semester. */
    @GetMapping("/courses/mine")
    public List<CourseView> myCourses(CurrentUser me) {
        if (me.is(Role.FACULTY)) {
            return views(courses.findByFacultyIdOrderByCode(me.id()));
        }
        Student student = students.findById(me.requireStudentId()).orElseThrow(() -> ApiException.notFound("Student"));
        return views(courses.findByProgramIdAndSemesterOrderByCode(student.getProgramId(), student.getSemester()));
    }

    @GetMapping("/courses")
    public List<CourseView> campusCourses(CurrentUser me) {
        List<Long> programIds = programs.findByCampusCodeOrderByName(me.campusCode()).stream()
                .map(Program::getId).toList();
        return views(courses.findByProgramIdInOrderByCode(programIds));
    }

    @GetMapping("/courses/{courseId}/students")
    public List<StudentSummary> roster(CurrentUser me, @PathVariable Long courseId,
                                       @RequestParam(defaultValue = "A") String section) {
        Course course = courseAccess.requireViewable(courseId, me);
        return students.findByProgramIdAndSemesterAndSectionOrderByUsn(course.getProgramId(), course.getSemester(),
                section).stream().map(StudentSummary::of).toList();
    }

    @GetMapping("/exam-sessions")
    public List<ExamSession> examSessions(CurrentUser me) {
        return examSessions.findByCampusCodeOrderByStartsOnDesc(me.campusCode());
    }

    /** Search by name or USN. At least 2 characters, at most 50 results. */
    @GetMapping("/students")
    public List<StudentSummary> search(CurrentUser me, @RequestParam String q) {
        String query = q.trim();
        if (query.length() < 2) {
            throw ApiException.badRequest("QUERY_TOO_SHORT", "Type at least 2 characters to search.");
        }
        return students.search(me.campusCode(), query).stream().limit(50).map(StudentSummary::of).toList();
    }

    private List<CourseView> views(List<Course> list) {
        Map<Long, String> programNames = programs.findAllById(list.stream().map(Course::getProgramId).distinct()
                .toList()).stream().collect(Collectors.toMap(Program::getId, Program::getName));
        Map<Long, String> facultyNames = users.findAllById(list.stream().map(Course::getFacultyId)
                .filter(Objects::nonNull).distinct().toList()).stream()
                .collect(Collectors.toMap(AppUser::getId, AppUser::getFullName));
        Map<String, List<String>> sectionsByCohort = new HashMap<>();
        return list.stream()
                .map(c -> new CourseView(c.getId(), c.getCode(), c.getName(), c.getCredits(), c.getWeeklyHours(),
                        c.getProgramId(), programNames.get(c.getProgramId()), c.getSemester(), c.getFacultyId(),
                        facultyNames.get(c.getFacultyId()),
                        sectionsByCohort.computeIfAbsent(c.getProgramId() + "/" + c.getSemester(),
                                key -> students.findSections(c.getProgramId(), c.getSemester()))))
                .toList();
    }

    public record CourseView(Long id, String code, String name, int credits, int weeklyHours, Long programId,
                             String programName, int semester, Long facultyId, String facultyName,
                             List<String> sections) {
    }

    /** The public facts about a student that staff lists need; guardian contact details are left out. */
    public record StudentSummary(Long id, String usn, String fullName, int semester, String section) {
        static StudentSummary of(Student s) {
            return new StudentSummary(s.getId(), s.getUsn(), s.getFullName(), s.getSemester(), s.getSection());
        }
    }
}
