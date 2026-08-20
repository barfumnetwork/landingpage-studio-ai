import { de } from '../../i18n/de';
import styles from './SkipLink.module.css';

export function SkipLink() {
  return (
    <a className={styles.skip} href="#main">
      {de.a11y.skip}
    </a>
  );
}
