package com.edumate.dashboard;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.edumate.security.CurrentUser;

/** GET /api/dashboard - the home-page cards for the logged-in user. */
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboard;

    public DashboardController(DashboardService dashboard) {
        this.dashboard = dashboard;
    }

    @GetMapping
    public List<DashboardService.Card> cards(CurrentUser me) {
        return dashboard.cardsFor(me);
    }
}
