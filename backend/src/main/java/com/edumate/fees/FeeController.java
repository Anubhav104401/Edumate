package com.edumate.fees;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.edumate.security.CurrentUser;

/** Fee pages for students/guardians and the accounts office. */
@RestController
@RequestMapping("/api/fees")
public class FeeController {

    private final FeeAccountService accounts;
    private final PaymentOrchestrator orchestrator;

    public FeeController(FeeAccountService accounts, PaymentOrchestrator orchestrator) {
        this.accounts = accounts;
        this.orchestrator = orchestrator;
    }

    @GetMapping("/me")
    public FeeAccountService.FeeAccount mine(CurrentUser me) {
        return accounts.accountOf(me.requireStudentId());
    }

    /** POST /api/fees/payments  body: { "feeDemandId": 12 } */
    @PostMapping("/payments")
    public PaymentOrchestrator.InitiatedPayment initiate(CurrentUser me, @Valid @RequestBody InitiateRequest request) {
        return orchestrator.initiate(me, request.feeDemandId());
    }

    @GetMapping("/payments")
    public List<FeeAccountService.PaymentView> recent() {
        return accounts.recentPayments();
    }

    @GetMapping("/payments/{orderId}")
    public FeeAccountService.PaymentView payment(CurrentUser me, @PathVariable String orderId) {
        return accounts.payment(orderId, me);
    }

    @GetMapping("/ledger")
    public FeeAccountService.FeeAccount ledger(CurrentUser me, @RequestParam String usn) {
        return accounts.accountByUsn(usn, me);
    }

    public record InitiateRequest(@NotNull Long feeDemandId) {
    }
}
