import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react';
import { de } from '../i18n/de';
import { FINAL_RENDERER_LOADERS, hasFinalRenderer } from './rendererRegistry';
import type { ConceptRendererProps } from './types';
import styles from './ConceptRenderer.module.css';

const chamberLoader = FINAL_RENDERER_LOADERS.chamber;
const ChamberLazy = chamberLoader ? lazy(chamberLoader) : null;

class RendererErrorBoundary extends Component<
  { onClose?: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    this.setState({ failed: true });
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <div className={styles.fallback} role="alert">
          <p className={styles.fallbackTitle}>{de.renderer.failed}</p>
          {this.props.onClose ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={this.props.onClose}
            >
              {de.renderer.backToGallery}
            </button>
          ) : null}
        </div>
      );
    }
    return this.props.children;
  }
}

function Unimplemented({ id }: { id: string }) {
  return (
    <div className={styles.fallback} role="status">
      <p className={styles.fallbackTitle}>{de.renderer.unimplemented}</p>
      <p className={styles.fallbackBody}>{id}</p>
    </div>
  );
}

export function ConceptRenderer(props: ConceptRendererProps) {
  if (!ChamberLazy || !hasFinalRenderer(props.concept.id)) {
    return <Unimplemented id={props.concept.id} />;
  }

  return (
    <RendererErrorBoundary key={props.concept.id} onClose={props.onClose}>
      <Suspense
        fallback={
          <div className={styles.fallback} role="status">
            <p className={styles.fallbackTitle}>{de.renderer.loading}</p>
          </div>
        }
      >
        <ChamberLazy {...props} />
      </Suspense>
    </RendererErrorBoundary>
  );
}
