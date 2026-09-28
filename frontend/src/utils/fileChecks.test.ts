import { describe, expect, it } from 'vitest';
import { acceptAttribute, checkFile, describeKinds, sniffKind } from './fileChecks';

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const EXE = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);

describe('sniffKind', () => {
  it('recognises real PDF and PNG files by their first bytes', () => {
    expect(sniffKind(PDF)).toBe('PDF');
    expect(sniffKind(PNG)).toBe('PNG');
    expect(sniffKind(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('JPEG');
  });

  it('does not recognise a program', () => {
    expect(sniffKind(EXE)).toBeNull();
  });
});

describe('checkFile', () => {
  it('accepts a genuine PDF', async () => {
    expect(await checkFile(new File([PDF], 'marks.pdf'), ['PDF'])).toBeNull();
  });

  it('rejects an empty file', async () => {
    expect(await checkFile(new File([], 'marks.pdf'), ['PDF'])).toContain('is empty');
  });

  it('rejects the wrong extension', async () => {
    expect(await checkFile(new File([PDF], 'marks.docx'), ['PDF'])).toContain('not an accepted file');
  });

  it('rejects a program renamed to .pdf', async () => {
    expect(await checkFile(new File([EXE], 'marks.pdf'), ['PDF'])).toContain('does not look like');
  });

  it('rejects a PDF where only images are allowed', async () => {
    expect(await checkFile(new File([PDF], 'photo.png'), ['PNG', 'JPEG'])).toContain('does not look like');
  });
});

describe('helpers', () => {
  it('builds the accept attribute and a readable list', () => {
    expect(acceptAttribute(['PDF', 'JPEG'])).toBe('.pdf,.jpg,.jpeg');
    expect(describeKinds(['PDF', 'JPEG', 'PNG'])).toBe('PDF, JPEG or PNG');
  });
});
