package com.edumate.documents;

import java.util.Optional;

import org.springframework.stereotype.Component;

/**
 * Works out what a file REALLY is by looking at its first bytes ("magic numbers"),
 * instead of trusting the file name or the type the browser claims. A file called
 * "marks.pdf" that is actually a program is therefore refused.
 *
 *   PDF   starts with  25 50 44 46 2D              ("%PDF-")
 *   PNG   starts with  89 50 4E 47 0D 0A 1A 0A     ("\x89PNG\r\n\x1a\n")
 *   JPEG  starts with  FF D8 FF
 */
@Component
public class FileTypeSniffer {

    private static final byte[] PDF = {0x25, 0x50, 0x44, 0x46, 0x2D};
    private static final byte[] PNG = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};

    public Optional<FileKind> detect(byte[] content) {
        if (startsWith(content, PDF)) {
            return Optional.of(FileKind.PDF);
        }
        if (startsWith(content, PNG)) {
            return Optional.of(FileKind.PNG);
        }
        if (startsWith(content, JPEG)) {
            return Optional.of(FileKind.JPEG);
        }
        return Optional.empty();
    }

    private static boolean startsWith(byte[] content, byte[] signature) {
        if (content == null || content.length < signature.length) {
            return false;
        }
        for (int i = 0; i < signature.length; i++) {
            if (content[i] != signature[i]) {
                return false;
            }
        }
        return true;
    }
}
