/*
 * The librarian's desk: search the catalogue, issue a book to a student by USN, take books back.
 */
import { useState, type FormEvent } from 'react';
import { api } from '../../api/endpoints';
import { errorMessage } from '../../api/http';
import type { Book, LoanView } from '../../api/types';
import { useConfirm } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { Badge, ErrorBanner, Field, Loading, PageHeader } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { formatDate, formatMoney } from '../../utils/format';

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

      <div className="card">
        <h2>{t.library.issueTitle}</h2>
        <form className="toolbar" onSubmit={search}>
          <Field id="usn" label={t.common.usn}>
            <input id="usn" value={usn} placeholder={t.library.usnPlaceholder} onChange={(e) => setUsn(e.target.value)} />
          </Field>
          <Field id="q" label={t.common.search}>
            <input id="q" value={typed} placeholder={t.library.searchPlaceholder} onChange={(e) => setTyped(e.target.value)} />
          </Field>
          <button type="submit" className="btn btn-secondary">
            {t.common.search}
          </button>
        </form>
        {books.loading && <Loading />}
        {books.error && <ErrorBanner message={books.error} />}
        {books.data && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t.library.columns.title}</th>
                  <th>{t.library.columns.author}</th>
                  <th className="num">{t.library.columns.available}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {books.data.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.title}</strong>
                      <div className="small muted mono">{b.isbn}</div>
                    </td>
                    <td>{b.author}</td>
                    <td className="num">
                      {b.copiesAvailable} / {b.copiesTotal}
                    </td>
                    <td>
                      <button type="button" className="btn btn-small" disabled={b.copiesAvailable === 0} onClick={() => issue(b)}>
                        {t.library.issue}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card table-wrap">
        <h2>{t.library.loansTitle}</h2>
        {loans.error && <ErrorBanner message={loans.error} />}
        {loans.data && (
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
                  <td>{loan.title}</td>
                  <td>
                    <span className="mono">{loan.usn}</span> {loan.studentName}
                  </td>
                  <td>
                    {formatDate(loan.dueOn)} {loan.daysLate > 0 && <Badge tone="bad">{t.library.overdue}</Badge>}
                  </td>
                  <td className="num">{loan.daysLate}</td>
                  <td className="num">{formatMoney(loan.fine)}</td>
                  <td>
                    <button type="button" className="btn btn-secondary btn-small" onClick={() => giveBack(loan)}>
                      {t.library.return}
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
