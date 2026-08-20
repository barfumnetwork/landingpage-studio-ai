import styles from './KineticText.module.css';

interface KineticTextProps {
  text: string;
  className?: string;
}

export function KineticText({ text, className }: KineticTextProps) {
  const chars = Array.from(text);

  return (
    <span className={`${styles.line} ${className ?? ''}`} aria-label={text}>
      {chars.map((char, index) => (
        <span
          key={`${char}-${String(index)}`}
          className={styles.char}
          data-kinetic-char=""
          aria-hidden="true"
          style={{ animationDelay: `${index * 28}ms` }}
        >
          {char === ' ' ? '\u00a0' : char}
        </span>
      ))}
    </span>
  );
}
