import { de } from '../../../i18n/de';
import { useProjectStore } from '../../../store/projectStore';
import type { StyleDirection, StyleTheme } from '../../../types/project';
import { Chip } from '../Field';
import styles from '../fields.module.css';
import { STYLE_DIRECTIONS, STYLE_THEMES } from '../wizardConfig';

const DIRECTION_LABELS: Record<StyleDirection, string> = {
  luxury: 'Luxury',
  minimal: 'Minimal',
  editorial: 'Editorial',
  modern: 'Modern',
  dark: 'Dark',
  elegant: 'Elegant',
  bold: 'Bold',
  creative: 'Creative',
  futuristic: 'Futuristic',
  organic: 'Organic',
  corporate: 'Corporate',
};

export function StyleStep() {
  const style = useProjectStore((state) => state.project?.style);
  const updateProject = useProjectStore((state) => state.updateProject);

  if (!style) return null;

  return (
    <div className={styles.stack}>
      <div className={styles.field}>
        <div className={styles.chips}>
          {STYLE_DIRECTIONS.map((direction, index) => (
            <Chip
              key={direction}
              selected={style.direction === direction}
              primary={index === 0}
              onClick={() => updateProject({ style: { direction } })}
            >
              {DIRECTION_LABELS[direction]}
            </Chip>
          ))}
        </div>
      </div>
      <div className={styles.field}>
        <span className={styles.label}>{de.wizard.steps.style.theme}</span>
        <div className={styles.chips}>
          {STYLE_THEMES.map((theme) => (
            <Chip
              key={theme}
              selected={style.theme === theme}
              onClick={() => updateProject({ style: { theme: theme as StyleTheme } })}
            >
              {de.wizard.themes[theme]}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
