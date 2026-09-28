package com.edumate.documents;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * The database "index card" for one uploaded document. The file's bytes are NOT in the database;
 * they live in the object store under storageKey. The SHA-256 fingerprint lets anyone later prove
 * the stored file is exactly the one that was uploaded.
 */
@Entity
@Table(name = "application_document")
public class ApplicationDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "doc_type", nullable = false)
    private DocumentType docType;

    @Column(name = "original_filename", nullable = false)
    private String originalFilename;

    @Column(name = "storage_key", nullable = false, unique = true)
    private String storageKey;

    @Column(name = "content_type", nullable = false)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(nullable = false)
    private String sha256;

    @Column(name = "uploaded_at", nullable = false)
    private Instant uploadedAt;

    protected ApplicationDocument() {
        // required by JPA
    }

    public ApplicationDocument(Long applicationId, DocumentType docType, String originalFilename, String storageKey,
                               String contentType, long sizeBytes, String sha256, Instant uploadedAt) {
        this.applicationId = applicationId;
        this.docType = docType;
        this.originalFilename = originalFilename;
        this.storageKey = storageKey;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
        this.sha256 = sha256;
        this.uploadedAt = uploadedAt;
    }

    public Long getId() {
        return id;
    }

    public Long getApplicationId() {
        return applicationId;
    }

    public DocumentType getDocType() {
        return docType;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public String getStorageKey() {
        return storageKey;
    }

    public String getContentType() {
        return contentType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public String getSha256() {
        return sha256;
    }

    public Instant getUploadedAt() {
        return uploadedAt;
    }
}
