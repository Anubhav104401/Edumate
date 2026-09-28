package com.edumate.timetable;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;

import org.springframework.stereotype.Component;

/**
 * Builds a clash-free weekly timetable and finds clashes in any timetable (design element
 * "TimetableSolver", FR-14). Pure Java: no database, no Spring, so it is easy to test.
 *
 * GENERATION is a small constraint-satisfaction search, like solving a Sudoku:
 *  - every lecture that must happen this week is a "blank square";
 *  - the 30 weekly slots (5 days x 6 periods) are the "digits" it can take;
 *  - rules: a section attends one lecture per slot; a teacher gives one lecture per slot (including
 *    lectures already published for other sections); a course meets at most once a day.
 * At each step it fills the lecture with the FEWEST legal slots left (the "most constrained first",
 * or minimum-remaining-values, heuristic - the same idea as DSATUR graph colouring). If a lecture has no
 * legal slot left, it undoes the previous choice and tries the next one (backtracking).
 *
 * CLASH DETECTION groups lectures by (teacher, slot), (section, slot) and (room, slot);
 * any group with two or more lectures is a clash.
 */
@Component
public class TimetableSolver {

    public static final int DAYS = 5;
    public static final int PERIODS = 6;
    private static final int MAX_STEPS = 200_000;

    /** One lecture that needs a slot. */
    public record Lecture(Long courseId, Long facultyId) {
    }

    /** A day (1-5) and period (1-6). */
    public record Slot(int day, int period) {
    }

    /** A clash found in a timetable. */
    public record Clash(String type, int day, int period, List<Long> entryIds, String description) {
    }

    /**
     * Places every lecture. busyFaculty holds "teacher x slot" pairs already taken elsewhere.
     * Returns one slot per lecture (same order as the input), or null if no clash-free timetable exists.
     */
    public List<Slot> solve(List<Lecture> lectures, Set<String> busyFaculty) {
        Slot[] assignment = new Slot[lectures.size()];
        Set<Slot> sectionTaken = new HashSet<>();
        Set<String> facultyTaken = new HashSet<>(busyFaculty);
        Set<String> courseDay = new HashSet<>();
        int[] steps = {0};
        boolean solved = backtrack(lectures, assignment, sectionTaken, facultyTaken, courseDay, steps);
        return solved ? List.of(assignment) : null;
    }

    private boolean backtrack(List<Lecture> lectures, Slot[] assignment, Set<Slot> sectionTaken,
                              Set<String> facultyTaken, Set<String> courseDay, int[] steps) {
        if (++steps[0] > MAX_STEPS) {
            return false;
        }
        int next = -1;
        List<Slot> bestOptions = null;
        for (int i = 0; i < lectures.size(); i++) {
            if (assignment[i] != null) {
                continue;
            }
            List<Slot> options = legalSlots(lectures.get(i), sectionTaken, facultyTaken, courseDay);
            if (bestOptions == null || options.size() < bestOptions.size()) {
                next = i;
                bestOptions = options;
            }
        }
        if (next == -1) {
            return true;   // every lecture has a slot
        }
        Lecture lecture = lectures.get(next);
        for (Slot slot : bestOptions) {
            place(lecture, slot, sectionTaken, facultyTaken, courseDay, true);
            assignment[next] = slot;
            if (backtrack(lectures, assignment, sectionTaken, facultyTaken, courseDay, steps)) {
                return true;
            }
            assignment[next] = null;
            place(lecture, slot, sectionTaken, facultyTaken, courseDay, false);
        }
        return false;
    }

    /** Legal slots, earliest periods first and days spread out, so the result looks like a normal timetable. */
    private List<Slot> legalSlots(Lecture lecture, Set<Slot> sectionTaken, Set<String> facultyTaken,
                                  Set<String> courseDay) {
        List<Slot> options = new ArrayList<>();
        for (int period = 1; period <= PERIODS; period++) {
            for (int day = 1; day <= DAYS; day++) {
                Slot slot = new Slot(day, period);
                if (!sectionTaken.contains(slot)
                        && !facultyTaken.contains(facultyKey(lecture.facultyId(), day, period))
                        && !courseDay.contains(lecture.courseId() + "@" + day)) {
                    options.add(slot);
                }
            }
        }
        return options;
    }

    private static void place(Lecture lecture, Slot slot, Set<Slot> sectionTaken, Set<String> facultyTaken,
                              Set<String> courseDay, boolean add) {
        String faculty = facultyKey(lecture.facultyId(), slot.day(), slot.period());
        String course = lecture.courseId() + "@" + slot.day();
        if (add) {
            sectionTaken.add(slot);
            facultyTaken.add(faculty);
            courseDay.add(course);
        } else {
            sectionTaken.remove(slot);
            facultyTaken.remove(faculty);
            courseDay.remove(course);
        }
    }

    public static String facultyKey(Long facultyId, int day, int period) {
        return facultyId + "@" + day + "-" + period;
    }

    /** Finds every clash in a list of timetable entries (any sections, any statuses). */
    public List<Clash> findClashes(List<TimetableEntry> entries) {
        List<Clash> clashes = new ArrayList<>();
        clashes.addAll(group(entries, "FACULTY", e -> "f" + e.getFacultyId(),
                "Teacher is scheduled for two lectures at the same time"));
        clashes.addAll(group(entries, "SECTION", e -> "s" + e.getProgramId() + "/" + e.getSemester() + "/" + e.getSection(),
                "Section has two lectures at the same time"));
        clashes.addAll(group(entries, "ROOM", e -> "r" + e.getRoom(),
                "Room is booked for two lectures at the same time"));
        clashes.sort(Comparator.comparingInt(Clash::day).thenComparingInt(Clash::period));
        return clashes;
    }

    private static List<Clash> group(List<TimetableEntry> entries, String type,
                                     Function<TimetableEntry, String> resource, String text) {
        Map<String, List<TimetableEntry>> byKey = new HashMap<>();
        for (TimetableEntry e : entries) {
            String key = resource.apply(e) + "@" + e.getDayOfWeek() + "-" + e.getPeriod();
            byKey.computeIfAbsent(key, k -> new ArrayList<>()).add(e);
        }
        List<Clash> result = new ArrayList<>();
        for (List<TimetableEntry> group : byKey.values()) {
            if (group.size() > 1) {
                TimetableEntry first = group.get(0);
                result.add(new Clash(type, first.getDayOfWeek(), first.getPeriod(),
                        group.stream().map(TimetableEntry::getId).filter(Objects::nonNull).toList(), text));
            }
        }
        return result;
    }
}
