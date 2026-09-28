package com.edumate.documents;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import com.edumate.config.AppProperties;

/**
 * ObjectStore kept in a folder on disk (edumate.storage.root, "./storage" by default).
 * A key such as "applications/7/3f2c...e1.pdf" becomes the file ./storage/applications/7/3f2c...e1.pdf.
 */
@Component
public class LocalFileObjectStore implements ObjectStore {

    private final Path root;

    public LocalFileObjectStore(AppProperties properties) {
        this.root = Paths.get(properties.storage().root()).toAbsolutePath().normalize();
    }

    /** Writes to a temporary file first, then renames it: readers never see half a file. */
    @Override
    public void put(String key, byte[] content) throws IOException {
        Path target = resolve(key);
        Files.createDirectories(target.getParent());
        Path temp = Files.createTempFile(target.getParent(), "upload-", ".part");
        Files.write(temp, content);
        Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
    }

    @Override
    public Resource get(String key) throws IOException {
        Path path = resolve(key);
        if (!Files.exists(path)) {
            throw new IOException("Stored file is missing: " + key);
        }
        return new PathResource(path);
    }

    @Override
    public void delete(String key) throws IOException {
        Files.deleteIfExists(resolve(key));
    }

    /** Refuses keys like "../../etc/passwd" that would escape the storage folder (path traversal). */
    private Path resolve(String key) {
        Path path = root.resolve(key).normalize();
        if (!path.startsWith(root)) {
            throw new IllegalArgumentException("Invalid storage key");
        }
        return path;
    }
}
