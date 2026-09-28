package com.edumate.documents;

import java.io.IOException;

import org.springframework.core.io.Resource;

/**
 * A place to keep file contents by name ("key"), like a giant labelled cupboard.
 * The report's architecture uses an object store for scanned documents; in production that would
 * be an S3-compatible service. LocalFileObjectStore implements the same three operations on a folder,
 * so switching to S3 later means writing one new class, not changing the services that use it.
 */
public interface ObjectStore {

    void put(String key, byte[] content) throws IOException;

    Resource get(String key) throws IOException;

    void delete(String key) throws IOException;
}
