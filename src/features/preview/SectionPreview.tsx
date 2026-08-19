import { de } from '../../i18n/de';
import styles from './SectionPreview.module.css';

interface SectionPreviewProps {
  sections: string[];
}

export function SectionPreview({ sections }: SectionPreviewProps) {
  if (sections.length === 0) return null;
  return (
    <div className={styles.wrap}>
      <p className={styles.heading}>{de.gallery.sections}</p>
      <ul className={styles.list}>
        {sections.map((section) => (
          <li key={section} className={styles.item}>
            {de.gallery.sectionLabels[section] ?? section.toUpperCase()}
          </li>
        ))}
      </ul>
    </div>
  );
}
