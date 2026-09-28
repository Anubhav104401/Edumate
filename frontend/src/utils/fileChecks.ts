/*
 * Checks a file IN THE BROWSER before it is uploaded, so the user gets an instant, clear
 * message instead of waiting for the upload to finish and fail.
 *
 * These checks are a convenience only. The backend repeats every one of them
 * (DocumentService + FileTypeSniffer), because a browser can always be bypassed.
 */
import { MAX_UPLOAD_BYTES } from '../config';
import { t } from '../i18n/messages';
import type { DocumentType } from '../api/types';

export type FileKind = 'PDF' | 'JPEG' | 'PNG';

/** Which kinds each document accepts; must match DocumentType.java in the backend. */
export const ACCEPTED_KINDS: Record<DocumentType, FileKind[]> = {
  PHOTO: ['JPEG', 'PNG'],
  ID_PROOF: ['PDF', 'JPEG', 'PNG'],
  MARKSHEET_10: ['PDF', 'JPEG', 'PNG'],
  MARKSHEET_12: ['PDF', 'JPEG', 'PNG'],
  CATEGORY_CERTIFICATE: ['PDF', 'JPEG', 'PNG'],
};

export const REQUIRED_DOCUMENTS: DocumentType[] = ['PHOTO', 'ID_PROOF', 'MARKSHEET_12'];

const EXTENSIONS: Record<FileKind, string[]> = {
  PDF: ['.pdf'],
  JPEG: ['.jpg', '.jpeg'],
  PNG: ['.png'],
};

/** The value for <input type="file" accept="...">, e.g. ".pdf,.jpg,.jpeg,.png". */
export function acceptAttribute(kinds: FileKind[]): string {
  return kinds.flatMap((k) => EXTENSIONS[k]).join(',');
}

/** "PDF, JPEG or PNG" */
export function describeKinds(kinds: FileKind[]): string {
  return kinds.length === 1 ? kinds[0] : `${kinds.slice(0, -1).join(', ')} or ${kinds[kinds.length - 1]}`;
}

/** Reads the first bytes of a file and recognises PDF, PNG and JPEG by their "magic numbers". */
export function sniffKind(head: Uint8Array): FileKind | null {
  const starts = (sig: number[]) => sig.every((byte, i) => head[i] === byte);
  if (starts([0x25, 0x50, 0x44, 0x46, 0x2d])) return 'PDF';
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'PNG';
  if (starts([0xff, 0xd8, 0xff])) return 'JPEG';
  return null;
}

/**
 * Returns null when the file looks fine, otherwise the message to show.
 * Order of checks: empty -> too big -> wrong extension -> content is not really that kind.
 */
export async function checkFile(file: File, accepted: FileKind[]): Promise<string | null> {
  if (file.size === 0) {
    return t.upload.empty(file.name);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return t.upload.tooLarge(file.name);
  }
  const lower = file.name.toLowerCase();
  const extensionOk = accepted.some((kind) => EXTENSIONS[kind].some((ext) => lower.endsWith(ext)));
  if (!extensionOk) {
    return t.upload.wrongExtension(file.name, describeKinds(accepted));
  }
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const kind = sniffKind(head);
  if (!kind || !accepted.includes(kind)) {
    return t.upload.notRealFile(file.name);
  }
  return null;
}
