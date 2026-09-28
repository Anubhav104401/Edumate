package com.edumate.timetable;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.edumate.academic.Course;
import com.edumate.academic.CourseRepository;
import com.edumate.academic.Program;
import com.edumate.academic.ProgramRepository;
import com.edumate.academic.Student;
import com.edumate.academic.StudentRepository;
import com.edumate.common.ApiException;
import com.edumate.common.audit.AuditLogger;
import com.edumate.security.AppUser;
import com.edumate.security.AppUserRepository;
import com.edumate.security.CurrentUser;
import com.edumate.security.Role;

/**
 * Timetable workflow: generate a DRAFT, adjust it by hand, check for clashes, then PUBLISH.
 * Publishing is refused while any clash exists (expected result of test case TC-011).
 */
@Service
public class TimetableService {

    private final TimetableRepository entries;
    private final CourseRepository courses;
    private final ProgramRepository programs;
    private final StudentRepository students;
    private final AppUserRepository users;
    private final TimetableSolver solver;
    private final AuditLogger auditLogger;

    public TimetableService(TimetableRepository entries, CourseRepository courses, ProgramRepository programs,
                            StudentRepository students, AppUserRepository users, TimetableSolver solver,
                            AuditLogger auditLogger) {
        this.entries = entries;
        this.courses = courses;
        this.programs = programs;
        this.students = students;
        this.users = users;
        this.solver = solver;
        this.auditLogger = auditLogger;
    }

    @Transactional
    public TimetableView generate(CurrentUser me, Long programId, int semester, String section) {
        Program program = programOfCampus(programId, me);
        List<Course> semesterCourses = courses.findByProgramIdAndSemesterOrderByCode(programId, semester);
        if (semesterCourses.isEmpty()) {
            throw ApiException.notFound("Courses for semester " + semester);
        }
        if (semesterCourses.stream().anyMatch(c -> c.getFacultyId() == null)) {
            throw ApiException.badRequest("NO_FACULTY", "Every course needs a teacher before a timetable can be made.");
        }
        if (students.findByProgramIdAndSemesterAndSectionOrderByUsn(programId, semester, section).isEmpty()) {
            throw ApiException.notFound("Section " + section);
        }

        String room = roomFor(program, semester, section);
        entries.deleteSection(programId, semester, section, TimetableEntry.DRAFT);
        Set<Long> facultyIds = semesterCourses.stream().map(Course::getFacultyId).collect(Collectors.toSet());
        Set<String> busy = new HashSet<>();
        for (TimetableEntry e : entries.findCommitmentsElsewhere(programId, semester, section, facultyIds,
                List.of(room))) {
            busy.add(TimetableSolver.facultyKey(e.getFacultyId(), e.getDayOfWeek(), e.getPeriod()));
        }

        List<TimetableSolver.Lecture> lectures = new ArrayList<>();
        semesterCourses.stream()
                .sorted(Comparator.comparingInt(Course::getWeeklyHours).reversed().thenComparing(Course::getCode))
                .forEach(c -> {
                    for (int hour = 0; hour < c.getWeeklyHours(); hour++) {
                        lectures.add(new TimetableSolver.Lecture(c.getId(), c.getFacultyId()));
                    }
                });

        List<TimetableSolver.Slot> slots = solver.solve(lectures, busy);
        if (slots == null) {
            throw ApiException.conflict("NO_TIMETABLE",
                    "No clash-free timetable exists with the teachers' current commitments.");
        }
        for (int i = 0; i < lectures.size(); i++) {
            TimetableSolver.Lecture lecture = lectures.get(i);
            TimetableSolver.Slot slot = slots.get(i);
            entries.save(new TimetableEntry(programId, semester, section, slot.day(), slot.period(),
                    lecture.courseId(), lecture.facultyId(), room));
        }
        auditLogger.record(me.username(), "TIMETABLE_GENERATED", "Timetable",
                program.getCode() + "/" + semester + "/" + section, null, lectures.size() + " lectures");
        return view(me, programId, semester, section);
    }

    @Transactional(readOnly = true)
    public TimetableView view(CurrentUser me, Long programId, int semester, String section) {
        Program program = programOfCampus(programId, me);
        List<TimetableEntry> draft = sectionEntries(programId, semester, section, TimetableEntry.DRAFT);
        List<TimetableEntry> published = sectionEntries(programId, semester, section, TimetableEntry.PUBLISHED);
        Names names = names(Stream.concat(draft.stream(), published.stream()).toList());
        return new TimetableView(programId, program.getName(), semester, section,
                draft.stream().map(names::view).toList(), published.stream().map(names::view).toList(),
                clashesFor(draft, programId, semester, section));
    }

    /** Moves a draft lecture by hand. No check here: clashes are reported by the clash list and block publishing. */
    @Transactional
    public EntryView move(CurrentUser me, Long entryId, int day, int period, String room) {
        TimetableEntry entry = entries.findById(entryId).orElseThrow(() -> ApiException.notFound("Timetable entry"));
        programOfCampus(entry.getProgramId(), me);
        if (!TimetableEntry.DRAFT.equals(entry.getStatus())) {
            throw ApiException.conflict("PUBLISHED_ENTRY", "Published lectures cannot be moved; generate a new draft.");
        }
        String before = "day " + entry.getDayOfWeek() + " period " + entry.getPeriod() + " " + entry.getRoom();
        entry.moveTo(day, period, room.trim());
        auditLogger.record(me.username(), "TIMETABLE_ENTRY_MOVED", "TimetableEntry", entry.getId(), before,
                "day " + day + " period " + period + " " + room.trim());
        return names(List.of(entry)).view(entry);
    }

    @Transactional(readOnly = true)
    public List<TimetableSolver.Clash> clashes(CurrentUser me, Long programId, int semester, String section) {
        programOfCampus(programId, me);
        return clashesFor(sectionEntries(programId, semester, section, TimetableEntry.DRAFT), programId, semester,
                section);
    }

    @Transactional
    public TimetableView publish(CurrentUser me, Long programId, int semester, String section) {
        programOfCampus(programId, me);
        List<TimetableEntry> draft = sectionEntries(programId, semester, section, TimetableEntry.DRAFT);
        if (draft.isEmpty()) {
            throw ApiException.badRequest("NOTHING_TO_PUBLISH", "Generate a draft timetable first.");
        }
        List<TimetableSolver.Clash> clashes = clashesFor(draft, programId, semester, section);
        if (!clashes.isEmpty()) {
            throw ApiException.conflict("CLASHES_FOUND",
                    clashes.size() + " clash(es) must be fixed before this timetable can be published.");
        }
        entries.deleteSection(programId, semester, section, TimetableEntry.PUBLISHED);
        sectionEntries(programId, semester, section, TimetableEntry.DRAFT).forEach(TimetableEntry::publish);
        auditLogger.record(me.username(), "TIMETABLE_PUBLISHED", "Timetable", programId + "/" + semester + "/" + section,
                null, draft.size() + " lectures");
        return view(me, programId, semester, section);
    }

    /** A student's (or guardian's child's) published week, or a teacher's own published lectures. */
    @Transactional(readOnly = true)
    public List<EntryView> mine(CurrentUser me) {
        List<TimetableEntry> mine;
        if (me.is(Role.FACULTY)) {
            mine = entries.findByFacultyIdAndStatusOrderByDayOfWeekAscPeriodAsc(me.id(), TimetableEntry.PUBLISHED);
        } else {
            Student student = students.findById(me.requireStudentId())
                    .orElseThrow(() -> ApiException.notFound("Student"));
            mine = sectionEntries(student.getProgramId(), student.getSemester(), student.getSection(),
                    TimetableEntry.PUBLISHED);
        }
        Names names = names(mine);
        return mine.stream().map(names::view).toList();
    }

    /** Lecture hours per week for every teacher, from the published timetables of this campus. */
    @Transactional(readOnly = true)
    public List<FacultyLoad> workload(CurrentUser me) {
        Set<Long> campusPrograms = programs.findByCampusCodeOrderByName(me.campusCode()).stream()
                .map(Program::getId).collect(Collectors.toSet());
        List<TimetableEntry> published = entries.findByStatus(TimetableEntry.PUBLISHED).stream()
                .filter(e -> campusPrograms.contains(e.getProgramId())).toList();
        Names names = names(published);
        Map<Long, List<TimetableEntry>> byFaculty = published.stream()
                .collect(Collectors.groupingBy(TimetableEntry::getFacultyId, LinkedHashMap::new, Collectors.toList()));
        return users.findByRoleAndCampusCodeOrderByFullName(Role.FACULTY, me.campusCode()).stream()
                .map(f -> {
                    List<TimetableEntry> lectures = byFaculty.getOrDefault(f.getId(), List.of());
                    List<String> taught = lectures.stream()
                            .map(e -> names.courseCode(e.getCourseId()) + " (" + e.getSection() + ")")
                            .distinct().sorted().toList();
                    return new FacultyLoad(f.getId(), f.getFullName(), lectures.size(), taught);
                })
                .toList();
    }

    private List<TimetableSolver.Clash> clashesFor(List<TimetableEntry> draft, Long programId, int semester,
                                                   String section) {
        if (draft.isEmpty()) {
            return List.of();
        }
        Set<Long> facultyIds = draft.stream().map(TimetableEntry::getFacultyId).collect(Collectors.toSet());
        Set<String> rooms = draft.stream().map(TimetableEntry::getRoom).collect(Collectors.toSet());
        List<TimetableEntry> all = new ArrayList<>(draft);
        all.addAll(entries.findCommitmentsElsewhere(programId, semester, section, facultyIds, rooms));
        Set<Long> draftIds = draft.stream().map(TimetableEntry::getId).collect(Collectors.toSet());
        return solver.findClashes(all).stream()
                .filter(c -> c.entryIds().stream().anyMatch(draftIds::contains))
                .toList();
    }

    private List<TimetableEntry> sectionEntries(Long programId, int semester, String section, String status) {
        return entries.findByProgramIdAndSemesterAndSectionAndStatusOrderByDayOfWeekAscPeriodAsc(programId, semester,
                section, status);
    }

    private Program programOfCampus(Long programId, CurrentUser me) {
        return programs.findById(programId)
                .filter(p -> p.getCampusCode().equals(me.campusCode()))
                .orElseThrow(() -> ApiException.notFound("Programme"));
    }

    /** Each section has a home lecture hall, e.g. BTCSE-5A. */
    static String roomFor(Program program, int semester, String section) {
        return program.getCode() + "-" + semester + section;
    }

    /** Looks up course and teacher names for a batch of entries with two queries in total. */
    private Names names(List<TimetableEntry> list) {
        Map<Long, Course> courseById = courses.findAllById(list.stream().map(TimetableEntry::getCourseId)
                .distinct().toList()).stream().collect(Collectors.toMap(Course::getId, Function.identity()));
        Map<Long, String> facultyById = users.findAllById(list.stream().map(TimetableEntry::getFacultyId)
                .distinct().toList()).stream().collect(Collectors.toMap(AppUser::getId, AppUser::getFullName));
        return new Names(courseById, facultyById);
    }

    private record Names(Map<Long, Course> courseById, Map<Long, String> facultyById) {
        EntryView view(TimetableEntry e) {
            Course c = courseById.get(e.getCourseId());
            return new EntryView(e.getId(), e.getDayOfWeek(), e.getPeriod(), e.getCourseId(),
                    c == null ? "?" : c.getCode(), c == null ? "?" : c.getName(), e.getFacultyId(),
                    facultyById.getOrDefault(e.getFacultyId(), "?"), e.getSection(), e.getRoom(), e.getStatus());
        }

        String courseCode(Long courseId) {
            Course c = courseById.get(courseId);
            return c == null ? "?" : c.getCode();
        }
    }

    public record TimetableView(Long programId, String programName, int semester, String section,
                                List<EntryView> draft, List<EntryView> published,
                                List<TimetableSolver.Clash> clashes) {
    }

    public record EntryView(Long id, int day, int period, Long courseId, String courseCode, String courseName,
                            Long facultyId, String facultyName, String section, String room, String status) {
    }

    public record FacultyLoad(Long facultyId, String fullName, int hoursPerWeek, List<String> teaching) {
    }
}
