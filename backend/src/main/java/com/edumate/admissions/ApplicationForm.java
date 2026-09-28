package com.edumate.admissions;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * The JSON the application form sends. Each annotation is a rule the backend checks again,
 * even though the browser already checked it: a browser can be bypassed, the server cannot.
 */
public record ApplicationForm(
        @NotBlank(message = "Enter your full name.") @Size(max = 120) String fullName,
        @NotNull(message = "Enter your date of birth.") @Past(message = "Date of birth must be in the past.")
        LocalDate dateOfBirth,
        @NotBlank(message = "Enter your e-mail address.") @Email(message = "Enter a valid e-mail address.")
        @Size(max = 160) String email,
        @Pattern(regexp = "^$|[0-9+ -]{7,20}", message = "Enter a valid phone number.") String phone,
        @NotNull(message = "Choose a programme.") Long programId,
        @NotBlank @Pattern(regexp = "GEN|OBC|SC|ST", message = "Choose a category.") String category,
        @DecimalMin(value = "0", message = "Score cannot be negative.")
        @DecimalMax(value = "100", message = "Score cannot exceed 100.") BigDecimal entranceScore,
        @DecimalMin(value = "0", message = "Percentage cannot be negative.")
        @DecimalMax(value = "100", message = "Percentage cannot exceed 100.") BigDecimal qualifyingPercent,
        @Size(max = 120) String guardianName,
        @Email(message = "Enter a valid guardian e-mail address.") @Size(max = 160) String guardianEmail,
        @Pattern(regexp = "^$|[0-9+ -]{7,20}", message = "Enter a valid guardian phone number.")
        String guardianPhone) {
}
