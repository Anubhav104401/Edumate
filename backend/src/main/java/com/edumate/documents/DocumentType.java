package com.edumate.documents;

import java.util.List;
import java.util.Set;

/** The scanned documents an applicant can upload, and which file kinds each one accepts. */
public enum DocumentType {
    PHOTO("Passport-size photograph", Set.of(FileKind.JPEG, FileKind.PNG), true),
    ID_PROOF("Identity proof (Aadhaar card or passport)", Set.of(FileKind.PDF, FileKind.JPEG, FileKind.PNG), true),
    MARKSHEET_10("Class 10 marks card", Set.of(FileKind.PDF, FileKind.JPEG, FileKind.PNG), false),
    MARKSHEET_12("Class 12 / qualifying examination marks card", Set.of(FileKind.PDF, FileKind.JPEG, FileKind.PNG), true),
    CATEGORY_CERTIFICATE("Category certificate (OBC / SC / ST)", Set.of(FileKind.PDF, FileKind.JPEG, FileKind.PNG), false);

    private final String label;
    private final Set<FileKind> accepted;
    private final boolean required;

    DocumentType(String label, Set<FileKind> accepted, boolean required) {
        this.label = label;
        this.accepted = accepted;
        this.required = required;
    }

    public boolean accepts(FileKind kind) {
        return accepted.contains(kind);
    }

    /** The documents that must be present before an application can be submitted. */
    public static List<DocumentType> requiredTypes() {
        return List.of(values()).stream().filter(DocumentType::isRequired).toList();
    }

    public String label() {
        return label;
    }

    public Set<FileKind> accepted() {
        return accepted;
    }

    public boolean isRequired() {
        return required;
    }
}
