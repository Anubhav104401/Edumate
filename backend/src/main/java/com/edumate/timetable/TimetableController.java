package com.edumate.timetable;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.edumate.security.CurrentUser;

/** Timetable URLs: generate, view, move, check clashes, publish, "my timetable" and workload. */
@RestController
@RequestMapping("/api/timetable")
public class TimetableController {

    private final TimetableService timetable;

    public TimetableController(TimetableService timetable) {
        this.timetable = timetable;
    }

    @PostMapping("/generate")
    public TimetableService.TimetableView generate(CurrentUser me, @Valid @RequestBody SectionRef ref) {
        return timetable.generate(me, ref.programId(), ref.semester(), ref.section());
    }

    @GetMapping
    public TimetableService.TimetableView view(CurrentUser me, @RequestParam Long programId,
                                               @RequestParam int semester, @RequestParam String section) {
        return timetable.view(me, programId, semester, section);
    }

    @PutMapping("/entries/{entryId}")
    public TimetableService.EntryView move(CurrentUser me, @PathVariable Long entryId,
                                           @Valid @RequestBody MoveRequest request) {
        return timetable.move(me, entryId, request.day(), request.period(), request.room());
    }

    @GetMapping("/clashes")
    public List<TimetableSolver.Clash> clashes(CurrentUser me, @RequestParam Long programId,
                                               @RequestParam int semester, @RequestParam String section) {
        return timetable.clashes(me, programId, semester, section);
    }

    @PostMapping("/publish")
    public TimetableService.TimetableView publish(CurrentUser me, @Valid @RequestBody SectionRef ref) {
        return timetable.publish(me, ref.programId(), ref.semester(), ref.section());
    }

    @GetMapping("/me")
    public List<TimetableService.EntryView> mine(CurrentUser me) {
        return timetable.mine(me);
    }

    @GetMapping("/workload")
    public List<TimetableService.FacultyLoad> workload(CurrentUser me) {
        return timetable.workload(me);
    }

    public record SectionRef(@NotNull Long programId, @Min(1) @Max(10) int semester,
                             @NotBlank @Size(max = 10) String section) {
    }

    public record MoveRequest(@Min(1) @Max(5) int day, @Min(1) @Max(6) int period,
                              @NotBlank @Size(max = 20) String room) {
    }
}
