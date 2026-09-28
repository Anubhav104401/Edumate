/*
 * The librarian's desk: search the catalogue, issue a book to a student by USN, take books back.
 * Each book shows a small bar of how many copies are still on the shelf.
 */
import { BookDown, BookUp, IdCard, Library, Search } from 'lucide-react';
import { useState, type CSSProperties, type FormEvent } from 'react';
import { api } from '../../api/endpoints';
import { errorMessage } from '../../api/http';
import type { Book, LoanView } from '../../api/types';
import { useConfirm } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { Avatar, Badge, EmptyState, ErrorBanner, Field, Loading, PageHeader, PercentBar } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { formatDate, formatMoney } from '../../utils/format';
import { hueFor } from '../../utils/visuals';

export function LibraryDeskPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [typed, setTyped] = useState('');
  const [query, setQuery] = useState('');
  const [usn, setUsn] = useState('');
  const books = useLoad(() => api.library.books(query), [query]);
  const loans = useLoad(() => api.library.openLoans(), []);

  async function issue(book: Book) {
    if (!usn.trim()) {
      toast.error(t.library.usnPlaceholder);
      return;
    }
    try {
      const loan = await api.library.issue(book.id, usn.trim());
      toast.success(t.library.issuedToast(loan.title, formatDate(loan.dueOn)));
      books.reload();
      loans.reload();
    } catch (err) {
      toast.error(errorMessage(err)); // e.g. "All copies of this book are currently issued."
    }
  }

  async function giveBack(loan: LoanView) {
    if (!(await confirm(t.library.confirmReturn(loan.title, formatMoney(loan.fine)), t.library.return))) return;
    try {
      const closed = await api.library.returnLoan(loan.id);
      toast.success(t.library.returnedToast(formatMoney(closed.fine)));
      books.reload();
      loans.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const search = (event: FormEvent) => {
    event.preventDefault();
    setQuery(typed.trim());
  };

  return (
    <>
      <PageHeader title={t.library.deskTitle} subtitle={t.library.finePolicy} />

      <div className="card table-wrap">
        <h2 className="card-title">
          <BookUp size={18} /> {t.library.issueTitle}
        </h2>
        <form className="toolbar" onSubmit={search}>
          <Field id="usn" label={t.common.usn}>
            <div className="input-icon">
              <IdCard size={16} />
              <input id="usn" value={usn} placeholder={t.library.usnPlaceholder} onChange={(e) => setUsn(e.target.value)} />
            </div>
          </Field>
          <Field id="q" label={t.common.search}>
            <div className="input-icon">
              <Search size={16} />
              <input id="q" value={typed} placeholder={t.library.searchPlaceholder} onChange={(e) => setTyped(e.target.value)} />
            </div>
          </Field>
          <button type="submit" className="btn btn-secondary">
            <Search size={16} /> {t.common.search}
          </button>
        </form>
        {books.loading && <Loading inline />}
        {books.error && <ErrorBanner message={books.error} />}
        {books.data && books.data.length === 0 && <EmptyState icon={Library} />}
        {books.data && books.data.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>{t.library.columns.title}</th>
                <th>{t.library.columns.author}</th>
                <th>{t.library.columns.available}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {books.data.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div className="btn-row" style={{ flexWrap: 'nowrap' }}>
                      <span
                        className="book-cover book-cover-sm"
                        style={{ '--hue': hueFor(b.title) } as CSSProperties}
                        aria-hidden="true"
                      >
                        {b.title.charAt(0)}
                      </span>
                      <div>
                        <strong>{b.title}</strong>
                        <div className="small muted mono">{b.isbn}</div>
                      </div>
                    </div>
                  </td>
                  <td>{b.author}</td>
                  <td style={{ minWidth: 150 }}>
                    <span className="small">
                      {b.copiesAvailable} / {b.copiesTotal}
                    </span>
                    <PercentBar
                      percent={b.copiesTotal === 0 ? 0 : (b.copiesAvailable * 100) / b.copiesTotal}
                      low={b.copiesAvailable === 0}
                      warn={b.copiesAvailable === 1}
                    />
                  </td>
                  <td className="right">
                    <button type="button" className="btn btn-small" disabled={b.copiesAvailable === 0} onClick={() => issue(b)}>
                      <BookUp size={14} /> {t.library.issue}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card table-wrap">
        <h2 className="card-title">
          <BookDown size={18} /> {t.library.loansTitle}
        </h2>
        {loans.error && <ErrorBanner message={loans.error} />}
        {loans.data && loans.data.length === 0 && <EmptyState icon={BookDown} />}
        {loans.data && loans.data.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>{t.library.columns.title}</th>
                <th>{t.library.columns.student}</th>
                <th>{t.library.columns.due}</th>
                <th className="num">{t.library.columns.late}</th>
                <th className="num">{t.library.columns.fine}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loans.data.map((loan) => (
                <tr key={loan.id}>
                  <td>
                    <strong>{loan.title}</strong>
                  </td>
                  <td>
                    <div className="btn-row" style={{ flexWrap: 'nowrap' }}>
                      <Avatar name={loan.studentName} size="sm" />
                      <div>
                        {loan.studentName}
                        <div className="small muted mono">{loan.usn}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {formatDate(loan.dueOn)} {loan.daysLate > 0 && <Badge tone="bad">{t.library.overdue}</Badge>}
                  </td>
                  <td className="num">{loan.daysLate}</td>
                  <td className="num">{formatMoney(loan.fine)}</td>
                  <td className="right">
                    <button type="button" className="btn btn-secondary btn-small" onClick={() => giveBack(loan)}>
                      <BookDown size={14} /> {t.library.return}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
