/*
 * One box on the "Documents" step of the application: shows whether a document is uploaded,
 * lets the applicant drag a file onto it (or click to choose one), checks the file in the browser,
 * uploads it with a progress bar, and offers View / Remove.
 *
 * Journey of a file:
 *   pick / drop  ->  checkFile() in the browser (size, extension, real first bytes)
 *                ->  FormData { type, file }  ->  POST /api/admissions/applications/{id}/documents
 *                ->  backend checks everything again, stores the file, answers with its details
 */
import { AnimatePresence, motion } from 'motion/react';
import { CloudUpload, Eye, FileCheck2, FileImage, FileText, Trash } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';
import { api } from '../api/endpoints';
import { errorMessage } from '../api/http';
import type { DocumentType, DocumentView } from '../api/types';
import { t } from '../i18n/messages';
import { ACCEPTED_KINDS, REQUIRED_DOCUMENTS, acceptAttribute, checkFile, describeKinds } from '../utils/fileChecks';
import { formatBytes, formatDateTime } from '../utils/format';
import { useConfirm } from './ConfirmDialog';
import { useToast } from './Toast';
import { Badge, IconTile } from './ui';

interface Props {
  applicationId: number;
  type: DocumentType;
  document?: DocumentView;
  editable: boolean;
  onChanged: () => void;
}

export function DocumentUpload({ applicationId, type, document, editable, onChanged }: Props) {
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const confirm = useConfirm();

  const label = t.documentTypes[type];
  const kinds = ACCEPTED_KINDS[type];
  const required = REQUIRED_DOCUMENTS.includes(type);
  const onlyImages = !kinds.includes('PDF');

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const problem = await checkFile(file, kinds);
    if (problem) {
      toast.error(problem);
      return;
    }
    setProgress(0);
    try {
      await api.admissions.uploadDocument(applicationId, type, file, setProgress);
      toast.success(t.upload.uploadedToast(label));
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = ''; // allow choosing the same file again
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); // stop the browser from opening the dropped file itself
    setDragging(false);
    if (editable && progress === null) {
      void handleFile(event.dataTransfer.files[0]);
    }
  }

  async function view() {
    if (!document) return;
    try {
      const blob = await api.admissions.downloadDocument(document.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function remove() {
    if (!document || !(await confirm(t.upload.confirmDelete(label), t.common.remove, 'danger'))) return;
    try {
      await api.admissions.deleteDocument(document.id);
      toast.success(t.upload.deletedToast(label));
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="card doc-card">
      <div className="doc-card-head">
        <IconTile icon={document ? FileCheck2 : onlyImages ? FileImage : FileText} tone={document ? 'good' : 'info'} size="sm" />
        <strong>{label}</strong>
        <Badge tone={required ? 'warn' : 'info'}>{required ? t.upload.required : t.upload.optional}</Badge>
      </div>

      {document ? (
        <motion.div className="doc-file" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="doc-file-name" title={document.originalFilename}>
              {document.originalFilename}
            </div>
            <div className="small muted">
              {formatBytes(document.sizeBytes)} · {formatDateTime(document.uploadedAt)}
            </div>
            <div className="small faint mono" title={document.sha256}>
              {t.upload.fingerprint}: {document.sha256.slice(0, 16)}…
            </div>
          </div>
          <Badge tone="good">{t.upload.uploaded}</Badge>
        </motion.div>
      ) : (
        <div className="small muted">{t.upload.notUploaded}</div>
      )}

      {editable && (
        <div
          className={`dropzone${dragging ? ' dragging' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <CloudUpload size={26} className="dropzone-icon" />
          <div>{document ? t.upload.replace : t.upload.dropHere}</div>
          <div className="small muted">{t.upload.accepted(describeKinds(kinds))}</div>
          <AnimatePresence>
            {progress !== null && (
              <motion.div
                style={{ width: '100%' }}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="small">{t.upload.uploading(progress)}</div>
                <div className="progress">
                  <div style={{ width: `${progress}%` }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <input
            ref={inputRef}
            type="file"
            hidden
            accept={acceptAttribute(kinds)}
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
        </div>
      )}

      {document && (
        <div className="btn-row">
          <button type="button" className="btn btn-secondary btn-small" onClick={view}>
            <Eye size={14} /> {t.common.view}
          </button>
          {editable && (
            <button type="button" className="btn btn-ghost btn-small" onClick={remove}>
              <Trash size={14} /> {t.common.remove}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
