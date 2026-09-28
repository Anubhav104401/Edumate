package com.edumate.documents;

import java.nio.charset.StandardCharsets;
import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.edumate.security.CurrentUser;

/**
 * Scanned-document URLs.
 *  POST   /api/admissions/applications/{id}/documents   multipart/form-data with fields "type" and "file"
 *  GET    /api/admissions/applications/{id}/documents   the list
 *  GET    /api/admissions/documents/{docId}/content     the file itself
 *  DELETE /api/admissions/documents/{docId}
 */
@RestController
@RequestMapping("/api/admissions")
public class DocumentController {

    private final DocumentService documents;

    public DocumentController(DocumentService documents) {
        this.documents = documents;
    }

    @PostMapping(path = "/applications/{applicationId}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public DocumentService.DocumentView upload(CurrentUser me, @PathVariable Long applicationId,
                                               @RequestParam("type") DocumentType type,
                                               @RequestParam("file") MultipartFile file) {
        return documents.upload(me, applicationId, type, file);
    }

    @GetMapping("/applications/{applicationId}/documents")
    public List<DocumentService.DocumentView> list(CurrentUser me, @PathVariable Long applicationId) {
        return documents.list(me, applicationId);
    }

    /**
     * Sends the file back. "Content-Security-Policy: sandbox" makes the browser treat it as untrusted
     * content: even a crafted PDF cannot run scripts in the EduMate site.
     */
    @GetMapping("/documents/{documentId}/content")
    public ResponseEntity<Resource> content(CurrentUser me, @PathVariable Long documentId) {
        DocumentService.DocumentContent content = documents.download(me, documentId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(content.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(content.filename(), StandardCharsets.UTF_8).build()
                                .toString())
                .header("Content-Security-Policy", "sandbox")
                .body(content.resource());
    }

    @DeleteMapping("/documents/{documentId}")
    public ResponseEntity<Void> delete(CurrentUser me, @PathVariable Long documentId) {
        documents.delete(me, documentId);
        return ResponseEntity.noContent().build();
    }
}
