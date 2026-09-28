package com.edumate.attendance;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.edumate.academic.Course;
import com.edumate.academic.CourseAccess;
import com.edumate.security.CurrentUser;

/** Every attendance URL. Which role may call which one is decided in RoleMatrix. */
@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceCaptureService captureService;
    private final AttendanceSummaryService summaryService;
    private final ShortfallNotifier shortfallNotifier;
    private final CourseAccess courseAccess;

    public AttendanceController(AttendanceCaptureService captureService, AttendanceSummaryService summaryService,
                                ShortfallNotifier shortfallNotifier,
                                CourseAccess courseAccess) {
        this.captureService = captureService;
        this.summaryService = summaryService;
        this.shortfallNotifier = shortfallNotifier;
        this.courseAccess = courseAccess;
    }

    /** GET /api/attendance/sessions?courseId=1&section=A&date=2026-09-28&period=2 */
    @GetMapping("/sessions")
    public AttendanceCaptureService.AttendanceSheet loadSheet(
            CurrentUser me,
            @RequestParam Long courseId,
            @RequestParam(defaultValue = "A") String section,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam int period) {
        return captureService.loadSheet(me, courseId, section, date, period);
    }

    /** PUT /api/attendance/sessions with the whole register in the body. */
    @PutMapping("/sessions")
    public AttendanceCaptureService.AttendanceSheet saveSheet(
            CurrentUser me, @Valid @RequestBody AttendanceCaptureService.SaveSheetRequest request) {
        return captureService.saveSheet(me, request);
    }

    /** A student's own attendance, or a guardian's view of their child. */
    @GetMapping("/me")
    public List<AttendanceSummaryService.CourseAttendance> mine(CurrentUser me) {
        return summaryService.forStudent(me.requireStudentId());
    }

    @GetMapping("/courses/{courseId}/summary")
    public List<AttendanceSummaryService.StudentAttendance> courseSummary(
            CurrentUser me, @PathVariable Long courseId, @RequestParam(defaultValue = "A") String section) {
        courseAccess.requireViewable(courseId, me);
        return summaryService.forCourse(courseId, section);
    }

    @GetMapping("/courses/{courseId}/shortfall")
    public List<AttendanceSummaryService.StudentAttendance> shortfall(
            CurrentUser me, @PathVariable Long courseId, @RequestParam(defaultValue = "A") String section,
            @RequestParam(required = false) Integer threshold) {
        courseAccess.requireViewable(courseId, me);
        return summaryService.shortfall(courseId, section, threshold);
    }

    @PostMapping("/courses/{courseId}/notify-guardians")
    public ShortfallNotifier.NotifyResult notifyGuardians(
            CurrentUser me, @PathVariable Long courseId, @RequestParam(defaultValue = "A") String section) {
        Course course = courseAccess.requireViewable(courseId, me);
        return shortfallNotifier.notifySection(course, section);
    }
}
