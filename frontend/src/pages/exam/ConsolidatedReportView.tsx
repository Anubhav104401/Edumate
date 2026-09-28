/*
 * The consolidated marks table of one result set, with a "Download CSV" button.
 * Only examination superintendents and administrators can load it (fix for DEF-031).
 */
import { Download } from 'lucide-react';
import type { CSSProperties } from 'react';
import { api } from '../../api/endpoints';
import { errorMessage } from '../../api/http';
import { useToast } from '../../components/Toast';
import { Badge, ErrorBanner, Loading } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n/messages';
import { gradeHue } from '../../utils/visuals';

export function ConsolidatedReportView({ resultSetId }: { resultSetId: number }) {
  const toast = useToast();
  const { data, error, loading } = useLoad(() => api.reports.consolidated(resultSetId), [resultSetId]);

  async function downloadCsv() {
    try {
      const blob = await api.reports.consolidatedCsv(resultSetId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `consolidated-marks-${resultSetId}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;

  return (
    <div className="card table-wrap">
      <div className="card-header">
        <h2>{t.resultsManage.reportTitle(data.resultSet.programName, data.resultSet.semester)}</h2>
        <button type="button" className="btn btn-secondary btn-small" onClick={downloadCsv}>
          <Download size={14} /> {t.resultsManage.downloadCsv}
        </button>
      </div>
      <table>
        <thead>
          <tr>
            <th>{t.common.usn}</th>
            <th>{t.common.name}</th>
            {data.courseCodes.map((code) => (
              <th key={code}>{code}</th>
            ))}
            <th className="num">{t.results.sgpa}</th>
            <th className="num">{t.results.cgpa}</th>
            <th>{t.common.status}</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.usn}>
              <td className="mono">{row.usn}</td>
              <td>{row.fullName}</td>
              {data.courseCodes.map((code) => (
                <td key={code} className="nowrap">
                  {row.grades[code] ? (
                    <span className="grade" style={{ '--hue': gradeHue(row.grades[code]) } as CSSProperties}>
                      {row.grades[code]}
                    </span>
                  ) : (
                    t.common.none
                  )}
                </td>
              ))}
              <td className="num">
                <strong>{row.sgpa.toFixed(2)}</strong>
              </td>
              <td className="num">{row.cgpa.toFixed(2)}</td>
              <td>
                <Badge tone={row.outcome === 'PASS' ? 'good' : 'bad'}>{row.outcome}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
