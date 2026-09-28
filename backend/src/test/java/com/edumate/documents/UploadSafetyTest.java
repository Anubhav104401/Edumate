package com.edumate.documents;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** The safety checks of the document upload pipeline. */
class UploadSafetyTest {

    private final FileTypeSniffer sniffer = new FileTypeSniffer();

    @Test
    void realFileKindsAreRecognisedByTheirFirstBytes() {
        assertThat(sniffer.detect("%PDF-1.7 ...".getBytes(StandardCharsets.ISO_8859_1))).contains(FileKind.PDF);
        assertThat(sniffer.detect(new byte[]{(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0})).contains(FileKind.PNG);
        assertThat(sniffer.detect(new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0})).contains(FileKind.JPEG);
    }

    @Test
    @DisplayName("A Windows program renamed to .pdf is not accepted")
    void disguisedFilesAreRejected() {
        assertThat(sniffer.detect(new byte[]{'M', 'Z', (byte) 0x90, 0})).isEmpty();
        assertThat(sniffer.detect(new byte[0])).isEmpty();
        assertThat(sniffer.detect(null)).isEmpty();
    }

    @Test
    @DisplayName("File names lose folders and odd characters and always get the real extension")
    void filenamesAreSanitised() {
        assertThat(DocumentService.safeFilename("..\\..\\evil<script>.exe", DocumentType.ID_PROOF, FileKind.PDF))
                .isEqualTo("evilscript.pdf");
        assertThat(DocumentService.safeFilename("/etc/passwd", DocumentType.ID_PROOF, FileKind.PDF))
                .isEqualTo("passwd.pdf");
        assertThat(DocumentService.safeFilename("", DocumentType.PHOTO, FileKind.PNG)).isEqualTo("photo.png");
        assertThat(DocumentService.safeFilename(null, DocumentType.PHOTO, FileKind.JPEG)).isEqualTo("photo.jpg");
    }

    @Test
    void photoAcceptsOnlyImages() {
        assertThat(DocumentType.PHOTO.accepts(FileKind.PDF)).isFalse();
        assertThat(DocumentType.PHOTO.accepts(FileKind.PNG)).isTrue();
        assertThat(DocumentType.requiredTypes())
                .containsExactly(DocumentType.PHOTO, DocumentType.ID_PROOF, DocumentType.MARKSHEET_12);
    }

    @Test
    void fingerprintIsTheStandardSha256() {
        assertThat(DocumentService.sha256("abc".getBytes(StandardCharsets.UTF_8)))
                .isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }
}
