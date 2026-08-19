import { useRef } from 'react';
import styles from './Dropzone.module.css';

interface DropzoneProps {
  title: string;
  hint: string;
  formats: string;
  browse: string;
  accept: string;
  multiple: boolean;
  disabled?: boolean;
  compact?: boolean;
  primary?: boolean;
  onFiles: (files: File[]) => void;
}

export function Dropzone({
  title,
  hint,
  formats,
  browse,
  accept,
  multiple,
  disabled = false,
  compact = false,
  primary = false,
  onFiles,
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker(): void {
    if (disabled) return;
    inputRef.current?.click();
  }

  function filesFromList(list: FileList | null): File[] {
    if (!list) return [];
    return Array.from(list);
  }

  return (
    <div
      className={`${styles.dropzone}${compact ? ` ${styles.compact}` : ''}${disabled ? ` ${styles.disabled}` : ''}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      data-wizard-primary={primary ? true : undefined}
      aria-disabled={disabled}
      onClick={openPicker}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openPicker();
      }}
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        event.currentTarget.classList.add(styles.active);
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = disabled ? 'none' : 'copy';
        event.currentTarget.classList.add(styles.active);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        event.currentTarget.classList.remove(styles.active);
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.currentTarget.classList.remove(styles.active);
        if (disabled) return;
        if (!event.dataTransfer.types.includes('Files')) return;
        const files = filesFromList(event.dataTransfer.files);
        if (files.length > 0) onFiles(files);
      }}
    >
      <input
        ref={inputRef}
        className={styles.input}
        type="file"
        accept={accept}
        multiple={multiple}
        tabIndex={-1}
        disabled={disabled}
        onChange={(event) => {
          const files = filesFromList(event.target.files);
          event.target.value = '';
          if (files.length > 0) onFiles(files);
        }}
      />
      <p className={styles.title}>{title}</p>
      <p className={styles.hint}>{hint}</p>
      <p className={styles.formats}>{formats}</p>
      <span className={styles.browse}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={(event) => {
            event.stopPropagation();
            openPicker();
          }}
        >
          {browse}
        </button>
      </span>
    </div>
  );
}
