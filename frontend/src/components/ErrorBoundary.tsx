/*
 * A safety net around every page. If a page crashes while drawing itself, React would normally
 * blank the whole screen; this component catches the crash and shows a friendly message instead,
 * while the menu stays usable so the user can go to another page.
 * (React only supports this with a "class component", which is why this file looks different.)
 */
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
        <div className="alert alert-bad" role="alert">
          <strong>{t.errors.pageCrashedTitle}</strong>
          {t.errors.pageCrashedBody}
        </div>
      );
    }
    return this.props.children;
  }
}
