import { de } from '../../../i18n/de';
import { useProjectStore } from '../../../store/projectStore';
import type { CtaIntent } from '../../../types/project';
import { Chip, Field } from '../Field';
import styles from '../fields.module.css';
import { CTA_INTENTS } from '../wizardConfig';

export function CtaStep() {
  const cta = useProjectStore((state) => state.project?.cta);
  const updateProject = useProjectStore((state) => state.updateProject);

  if (!cta) return null;

  return (
    <div className={styles.stack}>
      <div className={styles.field}>
        <div className={styles.chips}>
          {CTA_INTENTS.map((intent) => (
            <Chip
              key={intent}
              selected={cta.intent === intent}
              onClick={() => updateProject({ cta: { intent: intent as CtaIntent } })}
            >
              {de.wizard.ctaIntents[intent]}
            </Chip>
          ))}
        </div>
      </div>
      <Field label={de.wizard.steps.cta.label} htmlFor="cta-label" optional>
        <input
          id="cta-label"
          className={styles.input}
          data-wizard-primary
          value={cta.label}
          onChange={(event) => updateProject({ cta: { label: event.target.value } })}
        />
      </Field>
    </div>
  );
}
