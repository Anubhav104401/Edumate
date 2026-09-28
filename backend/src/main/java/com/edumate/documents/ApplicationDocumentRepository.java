package com.edumate.documents;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

/** Database access for uploaded-document records. */
public interface ApplicationDocumentRepository extends JpaRepository<ApplicationDocument, Long> {

    List<ApplicationDocument> findByApplicationIdOrderByDocType(Long applicationId);

    Optional<ApplicationDocument> findByApplicationIdAndDocType(Long applicationId, DocumentType docType);
}
