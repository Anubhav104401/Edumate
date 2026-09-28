package com.edumate.fees;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.edumate.academic.Student;
import com.edumate.academic.StudentRepository;
import com.edumate.common.ApiException;
import com.edumate.security.CurrentUser;
import com.edumate.security.Role;

/** Builds the "My fees" page and the accounts office views (read-only). */
@Service
@Transactional(readOnly = true)
public class FeeAccountService {

    private final FeeDemandRepository demands;
    private final PaymentRepository payments;
    private final StudentRepository students;
    private final FeeLedger ledger;
    private final Clock clock;

    public FeeAccountService(FeeDemandRepository demands, PaymentRepository payments, StudentRepository students,
                             FeeLedger ledger, Clock clock) {
        this.demands = demands;
        this.payments = payments;
        this.students = students;
        this.ledger = ledger;
        this.clock = clock;
    }

    public FeeAccount accountOf(Long studentId) {
        Student student = students.findById(studentId).orElseThrow(() -> ApiException.notFound("Student"));
        LocalDate today = LocalDate.now(clock);
        List<DemandView> demandViews = demands.findByStudentIdOrderByDueDate(studentId).stream()
                .map(d -> {
                    BigDecimal paid = payments.sumPaidForDemand(d.getId());
                    BigDecimal due = d.getAmount().subtract(paid).max(BigDecimal.ZERO);
                    String status = due.signum() == 0 ? "PAID" : d.getDueDate().isBefore(today) ? "OVERDUE" : "DUE";
                    return new DemandView(d.getId(), d.getDescription(), d.getAmount(), paid, due, d.getDueDate(),
                            status);
                })
                .toList();
        List<PaymentView> paymentViews = payments.findByStudentIdOrderByCreatedAtDesc(studentId).stream()
                .map(PaymentView::of).toList();
        List<LedgerLine> lines = ledger.statement(studentId).stream()
                .map(e -> new LedgerLine(e.getCreatedAt(), e.getEntryType(), e.getAmount(), e.getDescription(),
                        e.getReference()))
                .toList();
        return new FeeAccount(student.getId(), student.getUsn(), student.getFullName(),
                ledger.outstanding(studentId), demandViews, paymentViews, lines);
    }

    /** Accounts officer: look a student up by USN, only within their own campus. */
    public FeeAccount accountByUsn(String usn, CurrentUser me) {
        Student student = students.findByUsn(usn.trim().toUpperCase())
                .filter(s -> s.getCampusCode().equals(me.campusCode()))
                .orElseThrow(() -> ApiException.notFound("Student " + usn));
        return accountOf(student.getId());
    }

    public List<PaymentView> recentPayments() {
        return payments.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 200)).stream().map(PaymentView::of).toList();
    }

    /** Owner or accounts staff may look at a payment by its order id. */
    public PaymentView payment(String orderId, CurrentUser me) {
        Payment payment = payments.findByGatewayOrderId(orderId)
                .orElseThrow(() -> ApiException.notFound("Payment order"));
        boolean staff = me.is(Role.ACCOUNTS_OFFICER) || me.is(Role.ADMIN);
        if (!staff && !payment.getStudentId().equals(me.studentId())) {
            throw ApiException.notFound("Payment order");
        }
        return PaymentView.of(payment);
    }

    public record FeeAccount(Long studentId, String usn, String fullName, BigDecimal outstanding,
                             List<DemandView> demands, List<PaymentView> payments, List<LedgerLine> ledger) {
    }

    public record DemandView(Long id, String description, BigDecimal amount, BigDecimal paid, BigDecimal due,
                             LocalDate dueDate, String status) {
    }

    public record PaymentView(Long id, String orderId, Long studentId, BigDecimal amount, String status,
                              String txnRef, String receiptNo, String failureReason, Instant createdAt,
                              Instant updatedAt) {
        static PaymentView of(Payment p) {
            return new PaymentView(p.getId(), p.getGatewayOrderId(), p.getStudentId(), p.getAmount(), p.getStatus(),
                    p.getGatewayTxnRef(), p.getReceiptNo(), p.getFailureReason(), p.getCreatedAt(), p.getUpdatedAt());
        }
    }

    public record LedgerLine(Instant at, String type, BigDecimal amount, String description, String reference) {
    }
}
