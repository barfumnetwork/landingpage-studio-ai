import type { ReactNode } from 'react';
import { de } from '../../i18n/de';
import styles from './fields.module.css';

interface FieldProps {
  label: string;
  htmlFor: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, optional, hint, error, children }: FieldProps) {
  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label className={styles.label} htmlFor={htmlFor}>
          {label}
        </label>
        {optional ? <span className={styles.optional}>{de.wizard.optional}</span> : null}
      </div>
      {children}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className={styles.hint}>{hint}</p>
      ) : null}
    </div>
  );
}

interface ChipProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  primary?: boolean;
}

export function Chip({ selected, onClick, children, primary }: ChipProps) {
  return (
    <button
      type="button"
      className={`${styles.chip}${selected ? ` ${styles.chipActive}` : ''}`}
      aria-pressed={selected}
      data-wizard-primary={primary ? true : undefined}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
