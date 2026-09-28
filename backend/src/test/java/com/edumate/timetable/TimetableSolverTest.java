package com.edumate.timetable;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

/** Timetable generation and clash detection (FR-14, test case TC-011). */
class TimetableSolverTest {

    private final TimetableSolver solver = new TimetableSolver();

    private static List<TimetableSolver.Lecture> week() {
        List<TimetableSolver.Lecture> lectures = new ArrayList<>();
        long[][] courses = {{1, 101, 4}, {2, 102, 4}, {3, 103, 3}, {4, 104, 3}, {5, 105, 2}};
        for (long[] c : courses) {
            for (int h = 0; h < c[2]; h++) {
                lectures.add(new TimetableSolver.Lecture(c[0], c[1]));
            }
        }
        return lectures;
    }

    @Test
    @DisplayName("A generated week has no section clash, no teacher clash and no course twice a day")
    void generatedTimetableIsClashFree() {
        List<TimetableSolver.Lecture> lectures = week();
        Set<String> busy = Set.of(TimetableSolver.facultyKey(101L, 1, 1), TimetableSolver.facultyKey(101L, 2, 1));
        List<TimetableSolver.Slot> slots = solver.solve(lectures, busy);

        assertThat(slots).hasSize(lectures.size());
        assertThat(new HashSet<>(slots)).hasSize(slots.size());
        Set<String> courseDays = new HashSet<>();
        for (int i = 0; i < slots.size(); i++) {
            TimetableSolver.Slot slot = slots.get(i);
            TimetableSolver.Lecture lecture = lectures.get(i);
            assertThat(busy).doesNotContain(TimetableSolver.facultyKey(lecture.facultyId(), slot.day(), slot.period()));
            assertThat(courseDays.add(lecture.courseId() + "@" + slot.day())).isTrue();
        }
    }

    @Test
    void impossibleWeeksReturnNull() {
        List<TimetableSolver.Lecture> tooMany = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            tooMany.add(new TimetableSolver.Lecture(1L, 101L));   // one course cannot meet 6 times in 5 days
        }
        assertThat(solver.solve(tooMany, Set.of())).isNull();
    }

    @Test
    @DisplayName("TC-011: one teacher in two classes at the same time is reported as a clash")
    void teacherDoubleBookingIsAClash() {
        TimetableEntry a = entry(1L, "A", 1, 1, 101L, "R-5A");
        TimetableEntry b = entry(2L, "B", 1, 1, 101L, "R-5B");
        List<TimetableSolver.Clash> clashes = solver.findClashes(List.of(a, b));
        assertThat(clashes).extracting(TimetableSolver.Clash::type).containsExactly("FACULTY");
        assertThat(clashes.get(0).entryIds()).containsExactlyInAnyOrder(1L, 2L);
    }

    @Test
    void differentSlotsDoNotClash() {
        assertThat(solver.findClashes(List.of(entry(1L, "A", 1, 1, 101L, "R-5A"),
                entry(2L, "B", 1, 2, 101L, "R-5B")))).isEmpty();
    }

    private static TimetableEntry entry(Long id, String section, int day, int period, Long faculty, String room) {
        TimetableEntry e = new TimetableEntry(1L, 5, section, day, period, 10L, faculty, room);
        ReflectionTestUtils.setField(e, "id", id);
        return e;
    }
}
