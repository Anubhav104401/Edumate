package com.edumate.exam;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.edumate.security.CurrentUser;

/** Marks entry, hall tickets, "my results" and the result publication workflow. */
@RestController
@RequestMapping("/api/exams")
public class ExamController {

    private final MarksEntryService marksEntry;
    private final HallTicketService hallTickets;
    private final ResultQueryService resultQuery;
    private final ResultComputationService computation;
    private final ResultPublicationService publication;

    public ExamController(MarksEntryService marksEntry, HallTicketService hallTickets, ResultQueryService resultQuery,
                          ResultComputationService computation, ResultPublicationService publication) {
        this.marksEntry = marksEntry;
        this.hallTickets = hallTickets;
        this.resultQuery = resultQuery;
        this.computation = computation;
        this.publication = publication;
    }

    @GetMapping("/marks")
    public MarksEntryService.MarksSheet marks(CurrentUser me, @RequestParam Long courseId,
                                              @RequestParam Long examSessionId) {
        return marksEntry.sheet(me, courseId, examSessionId);
    }

    @PutMapping("/marks/{markId}")
    public MarksEntryService.MarkLine amend(CurrentUser me, @PathVariable Long markId,
                                            @Valid @RequestBody MarksEntryService.AmendRequest request) {
        return marksEntry.amendInternal(me, markId, request);
    }

    @GetMapping("/hall-ticket/me")
    public HallTicketService.HallTicket hallTicket(CurrentUser me) {
        return hallTickets.forStudent(me.requireStudentId());
    }

    @GetMapping("/results/me")
    public List<ResultQueryService.SemesterResult> myResults(CurrentUser me) {
        return resultQuery.publishedFor(me.requireStudentId());
    }

    @GetMapping("/result-sets")
    public List<ResultSetView> resultSets() {
        return publication.list();
    }

    /** POST /api/exams/result-sets/compute  body: { "examSessionId": 2, "programId": 1, "semester": 5 } */
    @PostMapping("/result-sets/compute")
    public ResultComputationService.ComputeSummary compute(CurrentUser me, @Valid @RequestBody ComputeRequest request) {
        return computation.compute(request.examSessionId(), request.programId(), request.semester(), me);
    }

    @PostMapping("/result-sets/{id}/approve")
    public ResultSetView approve(CurrentUser me, @PathVariable Long id) {
        return publication.approve(id, me);
    }

    @PostMapping("/result-sets/{id}/publish")
    public ResultSetView publish(CurrentUser me, @PathVariable Long id) {
        return publication.publish(id, me);
    }

    public record ComputeRequest(@NotNull Long examSessionId, @NotNull Long programId,
                                 @Min(1) @Max(10) int semester) {
    }
}
