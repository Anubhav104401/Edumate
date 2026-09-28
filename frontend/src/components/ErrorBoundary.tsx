/*
 * A safety net around every page. If a page crashes while drawing itself, React would normally
 * blank the whole screen; this component catches the crash and shows a friendly message instead,
 * while the menu stays usable so the user can go to another page.
 * (React only supports this with a "class component", which is why this file looks different.)
 */
import { Bug, RotateCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { t } from '../i18n/messages';

interface Props {
  children: ReactNode;
  /** When this value changes (the user opens another page), the error is forgotten. */
  resetKey: string;
}

interface State {
  failed: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page crashed:', error, info.componentStack);
  }

  componentDidUpdate(previous: Props) {
    if (previous.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="card empty" role="alert">
          <div className="empty-icon" style={{ color: 'var(--color-bad)' }}>
            <Bug size={28} />
          </div>
          <h2>{t.errors.pageCrashedTitle}</h2>
          <p className="muted">{t.errors.pageCrashedBody}</p>
          <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>
            <RotateCw size={16} /> {t.errors.reload}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
