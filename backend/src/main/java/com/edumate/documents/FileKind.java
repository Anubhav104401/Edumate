package com.edumate.documents;

/** The only three kinds of file EduMate accepts for scanned documents. */
public enum FileKind {
    PDF("application/pdf", "pdf"),
    JPEG("image/jpeg", "jpg"),
    PNG("image/png", "png");

    private final String mimeType;
    private final String extension;

    FileKind(String mimeType, String extension) {
        this.mimeType = mimeType;
        this.extension = extension;
    }

    public String mimeType() {
        return mimeType;
    }

    public String extension() {
        return extension;
    }
}
