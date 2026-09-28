package com.edumate.academic;

import org.springframework.stereotype.Component;

import com.edumate.common.ApiException;
import com.edumate.security.CurrentUser;
import com.edumate.security.Role;

/**
 * Object-level access checks for courses ("may THIS person touch THIS course?").
 * The RoleMatrix only knows roles; this class stops a teacher from opening
 * another teacher's course by typing a different id into the URL
 * (horizontal privilege escalation, OWASP A01).
 */
@Component
public class CourseAccess {

    private final CourseRepository courses;
    private final ProgramRepository programs;

    public CourseAccess(CourseRepository courses, ProgramRepository programs) {
        this.courses = courses;
        this.programs = programs;
    }

    /** The course must exist and be taught by the calling faculty member. */
    public Course requireTaughtBy(Long courseId, CurrentUser me) {
        Course course = courses.findById(courseId).orElseThrow(() -> ApiException.notFound("Course"));
        if (!me.is(Role.FACULTY) || !me.id().equals(course.getFacultyId())) {
            throw ApiException.forbidden("You can only work with courses you teach.");
        }
        return course;
    }

    /** Faculty: only their own courses. Administrators and exam staff: any course of their campus. */
    public Course requireViewable(Long courseId, CurrentUser me) {
        Course course = courses.findById(courseId).orElseThrow(() -> ApiException.notFound("Course"));
        if (me.is(Role.FACULTY)) {
            return requireTaughtBy(courseId, me);
        }
        Program program = programs.findById(course.getProgramId())
                .orElseThrow(() -> ApiException.notFound("Programme"));
        if (!program.getCampusCode().equals(me.campusCode())) {
            throw ApiException.forbidden("This course belongs to another campus.");
        }
        return course;
    }
}
