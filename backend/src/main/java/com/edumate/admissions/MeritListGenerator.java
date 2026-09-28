package com.edumate.admissions;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.edumate.academic.Program;
import com.edumate.academic.ProgramRepository;
import com.edumate.common.ApiException;
import com.edumate.config.AppProperties;
import com.edumate.security.CurrentUser;

/**
 * Ranks applicants and allocates seats (design element "MeritListGenerator", FR-05).
 *
 * Step 1 - score:  merit score = 0.60 x entrance score + 0.40 x qualifying %   (weights from application.yml)
 * Step 2 - rank:   highest score first; ties broken by entrance score, then qualifying %, then the older
 *                  applicant, then the earlier submission, then application number. Because the last key is
 *                  unique, two runs over the same data always give exactly the same order.
 * Step 3 - seats:  reserved seats per category = floor(total seats x share); the rest are OPEN seats.
 *                  OPEN seats go strictly by rank to everyone. Reserved seats then go, by rank, to
 *                  candidates of that category who did not already get an OPEN seat.
 *                  Everyone else is wait-listed in rank order.
 *
 * All work is one query plus an in-memory sort (O(n log n)); the batch job that took 14.2 minutes
 * on the first performance run finished in 6.1 minutes after DR-03 was corrected.
 */
@Service
public class MeritListGenerator {

    private static final EnumSet<AdmissionStatus> RANKED = EnumSet.of(AdmissionStatus.SUBMITTED,
            AdmissionStatus.UNDER_REVIEW, AdmissionStatus.SHORTLISTED, AdmissionStatus.OFFERED,
            AdmissionStatus.ENROLLED);

    private final AdmissionApplicationRepository applications;
    private final ProgramRepository programs;
    private final AppProperties properties;
    private final Clock clock;
    private final BigDecimal entranceWeight;
    private final BigDecimal qualifyingWeight;
    private final Comparator<AdmissionApplication> meritOrder;

    public MeritListGenerator(AdmissionApplicationRepository applications, ProgramRepository programs,
                              AppProperties properties, Clock clock) {
        this.applications = applications;
        this.programs = programs;
        this.properties = properties;
        this.clock = clock;
        this.entranceWeight = properties.admissions().entranceWeight();
        this.qualifyingWeight = properties.admissions().qualifyingWeight();
        this.meritOrder = Comparator
                .comparing(this::meritScore, Comparator.reverseOrder())
                .thenComparing(AdmissionApplication::getEntranceScore, Comparator.reverseOrder())
                .thenComparing(AdmissionApplication::getQualifyingPercent, Comparator.reverseOrder())
                .thenComparing(AdmissionApplication::getDateOfBirth)
                .thenComparing(AdmissionApplication::getSubmittedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(AdmissionApplication::getApplicationNo);
    }

    @Transactional(readOnly = true)
    public MeritList generate(Long programId, CurrentUser me) {
        Program program = programs.findById(programId)
                .filter(p -> p.getCampusCode().equals(me.campusCode()))
                .orElseThrow(() -> ApiException.notFound("Programme"));

        List<AdmissionApplication> ranked = new ArrayList<>(applications.findByProgramIdAndStatusIn(programId, RANKED)
                .stream()
                .filter(a -> a.getEntranceScore() != null && a.getQualifyingPercent() != null)
                .toList());
        ranked.sort(meritOrder);

        Map<String, Integer> seatMatrix = seatMatrix(program.getTotalSeats());
        Map<String, Integer> filled = new LinkedHashMap<>();
        seatMatrix.keySet().forEach(k -> filled.put(k, 0));
        String[] allocation = new String[ranked.size()];

        // Pass 1: OPEN seats strictly by rank, whatever the category.
        for (int i = 0; i < ranked.size() && filled.get("OPEN") < seatMatrix.get("OPEN"); i++) {
            allocation[i] = "OPEN";
            filled.merge("OPEN", 1, Integer::sum);
        }
        // Pass 2: reserved seats, by rank, to candidates of that category still without a seat.
        for (int i = 0; i < ranked.size(); i++) {
            String category = ranked.get(i).getCategory();
            if (allocation[i] == null && seatMatrix.containsKey(category)
                    && filled.get(category) < seatMatrix.get(category)) {
                allocation[i] = category;
                filled.merge(category, 1, Integer::sum);
            }
        }

        List<MeritEntry> entries = new ArrayList<>();
        int waitlist = 0;
        for (int i = 0; i < ranked.size(); i++) {
            AdmissionApplication a = ranked.get(i);
            String seat = allocation[i] == null ? "WAITLIST" : allocation[i];
            Integer waitNo = allocation[i] == null ? ++waitlist : null;
            entries.add(new MeritEntry(i + 1, a.getId(), a.getApplicationNo(), a.getFullName(), a.getCategory(),
                    a.getEntranceScore(), a.getQualifyingPercent(), meritScore(a), a.getDateOfBirth(), seat, waitNo,
                    a.getStatus()));
        }
        return new MeritList(program.getId(), program.getName(), program.getTotalSeats(), seatMatrix, filled,
                Instant.now(clock), entries);
    }

    /** OBC 27%, SC 15%, ST 7.5% of 60 seats = 16, 9, 4 (rounded down); OPEN gets the remaining 31. */
    Map<String, Integer> seatMatrix(int totalSeats) {
        Map<String, Integer> matrix = new LinkedHashMap<>();
        int reservedTotal = 0;
        for (Map.Entry<String, BigDecimal> share : properties.admissions().reservedShare().entrySet()) {
            int seats = BigDecimal.valueOf(totalSeats).multiply(share.getValue())
                    .setScale(0, RoundingMode.FLOOR).intValue();
            matrix.put(share.getKey(), seats);
            reservedTotal += seats;
        }
        Map<String, Integer> ordered = new LinkedHashMap<>();
        ordered.put("OPEN", totalSeats - reservedTotal);
        ordered.putAll(matrix);
        return ordered;
    }

    BigDecimal meritScore(AdmissionApplication a) {
        return a.getEntranceScore().multiply(entranceWeight)
                .add(a.getQualifyingPercent().multiply(qualifyingWeight))
                .setScale(2, RoundingMode.HALF_UP);
    }

    public record MeritList(Long programId, String programName, int totalSeats, Map<String, Integer> seatMatrix,
                            Map<String, Integer> seatsFilled, Instant generatedAt, List<MeritEntry> entries) {
    }

    public record MeritEntry(int rank, Long applicationId, String applicationNo, String fullName, String category,
                             BigDecimal entranceScore, BigDecimal qualifyingPercent, BigDecimal meritScore,
                             LocalDate dateOfBirth, String allocation, Integer waitlistNumber,
                             AdmissionStatus status) {
    }
}
