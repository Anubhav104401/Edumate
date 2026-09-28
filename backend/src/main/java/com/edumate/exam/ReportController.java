package com.edumate.exam;

import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.edumate.security.CurrentUser;

/**
 * GET /api/reports/consolidated-marks?resultSetId=1            (JSON)
 * GET /api/reports/consolidated-marks?resultSetId=1&format=csv (download for Excel)
 * GET /api/reports/attendance-shortfall?programId=1&semester=5&section=A
 */
@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reports;

    public ReportController(ReportService reports) {
        this.reports = reports;
    }

    @GetMapping("/consolidated-marks")
    public ResponseEntity<?> consolidatedMarks(CurrentUser me, @RequestParam Long resultSetId,
                                               @RequestParam(defaultValue = "json") String format) {
        ReportService.ConsolidatedReport report = reports.consolidatedMarks(resultSetId, me);
        if (!"csv".equalsIgnoreCase(format)) {
            return ResponseEntity.ok(report);
        }
        String filename = "consolidated-marks-" + resultSetId + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(new MediaType("text", "csv"))
                .body(reports.toCsv(report));
    }

    @GetMapping("/attendance-shortfall")
    public List<ReportService.CourseShortfall> attendanceShortfall(CurrentUser me, @RequestParam Long programId,
                                                                   @RequestParam int semester,
                                                                   @RequestParam(defaultValue = "A") String section) {
        return reports.attendanceShortfall(programId, semester, section, me);
    }
}
