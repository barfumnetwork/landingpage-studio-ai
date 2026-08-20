import { de } from '../i18n/de';
import { AssetSourceProvider } from '../export/AssetSourceContext';
import type { SitePayload } from '../export/types';
import { ConceptRenderer } from '../renderers/ConceptRenderer';
import { SkipLink } from '../app/shell/SkipLink';
import styles from './SiteApp.module.css';

function readPayload(): SitePayload | null {
  const payload = window.__LPS_SITE__;
  if (!payload?.project || !payload.conceptId) return null;
  return payload;
}

export function SiteApp() {
  const payload = readPayload();
  const concept = payload?.project.generatedConcepts.find(
    (item) => item.id === payload.conceptId,
  );

  if (!payload || !concept) {
    return (
      <div className={styles.missing} role="alert">
        <p className={styles.title}>{de.export.siteMissing}</p>
      </div>
    );
  }

  return (
    <AssetSourceProvider value={{ mode: 'static', urls: payload.media }}>
      <SkipLink />
      <main id="main" className={styles.main}>
        <ConceptRenderer
          project={payload.project}
          concept={concept}
          selectedConceptId={payload.conceptId}
          previewMode="site"
        />
      </main>
    </AssetSourceProvider>
  );
}
