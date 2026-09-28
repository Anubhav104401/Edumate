package com.edumate.documents;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import com.edumate.admissions.AdmissionApplication;
import com.edumate.admissions.AdmissionService;
import com.edumate.common.ApiException;
import com.edumate.common.audit.AuditLogger;
import com.edumate.security.CurrentUser;
import com.edumate.security.Role;

/**
 * Upload, list, download and delete scanned admission documents.
 *
 * The upload pipeline, step by step:
 *  1. the applicant must own the application and it must still be a DRAFT;
 *  2. the file must not be empty or bigger than 5 MB;
 *  3. the first bytes decide the real file kind (FileTypeSniffer) - the name and browser type are ignored;
 *  4. that kind must be allowed for the document type (a photo must be JPEG or PNG, for example);
 *  5. a SHA-256 fingerprint of the bytes is calculated;
 *  6. the bytes are stored in the object store under a random, unguessable key;
 *  7. a database row records the key, size, kind, fingerprint and a cleaned-up file name;
 *  8. an audit record is written.
 * If the database part fails, the stored file is deleted again, so disk and database never disagree.
 */
@Service
public class DocumentService {

    private static final Logger log = LoggerFactory.getLogger(DocumentService.class);
    public static final long MAX_BYTES = 5L * 1024 * 1024;

    private final ApplicationDocumentRepository documents;
    private final AdmissionService admissions;
    private final FileTypeSniffer sniffer;
    private final ObjectStore objectStore;
    private final AuditLogger auditLogger;
    private final Clock clock;

    public DocumentService(ApplicationDocumentRepository documents, AdmissionService admissions,
                           FileTypeSniffer sniffer, ObjectStore objectStore, AuditLogger auditLogger, Clock clock) {
        this.documents = documents;
        this.admissions = admissions;
        this.sniffer = sniffer;
        this.objectStore = objectStore;
        this.auditLogger = auditLogger;
        this.clock = clock;
    }

    @Transactional
    public DocumentView upload(CurrentUser me, Long applicationId, DocumentType type, MultipartFile file) {
        AdmissionApplication application = admissions.requireOwnDraft(me, applicationId);
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("EMPTY_FILE", "The selected file is empty.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw ApiException.badRequest("FILE_TOO_LARGE", "The file is larger than the 5 MB limit.");
        }
        byte[] bytes = readBytes(file);
        FileKind kind = sniffer.detect(bytes).orElseThrow(() -> ApiException.badRequest("UNSUPPORTED_FILE",
                "Only PDF, JPEG and PNG files are accepted. This file is none of them."));
        if (!type.accepts(kind)) {
            throw ApiException.badRequest("WRONG_FILE_TYPE",
                    type.label() + " must be uploaded as " + type.accepted() + ", not " + kind + ".");
        }

        String key = "applications/" + application.getId() + "/" + UUID.randomUUID() + "." + kind.extension();
        store(key, bytes);
        deleteObjectIfRolledBack(key);

        documents.findByApplicationIdAndDocType(application.getId(), type).ifPresent(old -> {
            documents.delete(old);
            deleteObjectAfterCommit(old.getStorageKey());
        });
        ApplicationDocument saved = documents.save(new ApplicationDocument(application.getId(), type,
                safeFilename(file.getOriginalFilename(), type, kind), key, kind.mimeType(), bytes.length,
                sha256(bytes), Instant.now(clock)));
        auditLogger.record(me.username(), "DOCUMENT_UPLOADED", "AdmissionApplication", application.getId(), null,
                type + " " + saved.getOriginalFilename() + " sha256=" + saved.getSha256());
        return DocumentView.of(saved);
    }

    @Transactional(readOnly = true)
    public List<DocumentView> list(CurrentUser me, Long applicationId) {
        admissions.requireVisible(me, applicationId);
        return documents.findByApplicationIdOrderByDocType(applicationId).stream().map(DocumentView::of).toList();
    }

    /** Staff viewing an applicant's documents is audited: these can be a minor's personal data. */
    @Transactional
    public DocumentContent download(CurrentUser me, Long documentId) {
        ApplicationDocument doc = documents.findById(documentId).orElseThrow(() -> ApiException.notFound("Document"));
        admissions.requireVisible(me, doc.getApplicationId());
        if (!me.is(Role.APPLICANT)) {
            auditLogger.record(me.username(), "DOCUMENT_VIEWED", "AdmissionApplication", doc.getApplicationId(),
                    null, doc.getDocType().name());
        }
        try {
            return new DocumentContent(objectStore.get(doc.getStorageKey()), doc.getContentType(),
                    doc.getOriginalFilename());
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    @Transactional
    public void delete(CurrentUser me, Long documentId) {
        ApplicationDocument doc = documents.findById(documentId).orElseThrow(() -> ApiException.notFound("Document"));
        admissions.requireOwnDraft(me, doc.getApplicationId());
        documents.delete(doc);
        deleteObjectAfterCommit(doc.getStorageKey());
        auditLogger.record(me.username(), "DOCUMENT_DELETED", "AdmissionApplication", doc.getApplicationId(),
                doc.getDocType().name(), null);
    }

    /**
     * Keeps only the last part of the name (no folders), only safe characters, at most 100 characters,
     * and always the extension of the REAL file kind. "..\\..\\evil<script>.exe" becomes "evilscript.pdf".
     */
    static String safeFilename(String original, DocumentType type, FileKind kind) {
        String name = original == null ? "" : original;
        name = name.substring(Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\')) + 1);
        int dot = name.lastIndexOf('.');
        String base = (dot > 0 ? name.substring(0, dot) : name).replaceAll("[^A-Za-z0-9 ._()-]", "").trim();
        if (base.isEmpty()) {
            base = type.name().toLowerCase();
        }
        if (base.length() > 90) {
            base = base.substring(0, 90);
        }
        return base + "." + kind.extension();
    }

    static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }

    private static byte[] readBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException ex) {
            throw ApiException.badRequest("UPLOAD_FAILED", "The file could not be read. Please try again.");
        }
    }

    private void store(String key, byte[] bytes) {
        try {
            objectStore.put(key, bytes);
        } catch (IOException ex) {
            throw new UncheckedIOException("Could not store uploaded file", ex);
        }
    }

    private void deleteObjectIfRolledBack(String key) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    quietlyDelete(key);
                }
            }
        });
    }

    private void deleteObjectAfterCommit(String key) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                quietlyDelete(key);
            }
        });
    }

    private void quietlyDelete(String key) {
        try {
            objectStore.delete(key);
        } catch (IOException | RuntimeException ex) {
            log.warn("Could not delete stored object {}: {}", key, ex.getMessage());
        }
    }

    /** What the documents list shows for one uploaded file. */
    public record DocumentView(Long id, DocumentType type, String label, String originalFilename,
                               String contentType, long sizeBytes, String sha256, Instant uploadedAt) {
        static DocumentView of(ApplicationDocument d) {
            return new DocumentView(d.getId(), d.getDocType(), d.getDocType().label(), d.getOriginalFilename(),
                    d.getContentType(), d.getSizeBytes(), d.getSha256(), d.getUploadedAt());
        }
    }

    /** The bytes and headers needed to send a stored file back to the browser. */
    public record DocumentContent(Resource resource, String contentType, String filename) {
    }
}
