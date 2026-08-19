import { de } from '../../../i18n/de';
import { useProjectStore } from '../../../store/projectStore';
import { Chip, Field } from '../Field';
import styles from '../fields.module.css';
import { CATEGORIES } from '../wizardConfig';

export function BrandStep() {
  const brand = useProjectStore((state) => state.project?.brand);
  const updateProject = useProjectStore((state) => state.updateProject);

  if (!brand) return null;

  const nameError =
    brand.name.length > 0 && brand.name.trim().length < 2
      ? de.wizard.errors.brandName
      : undefined;

  return (
    <div className={styles.stack}>
      <Field label={de.wizard.steps.brand.name} htmlFor="brand-name" error={nameError}>
        <input
          id="brand-name"
          className={`${styles.input} ${styles.inputLarge}`}
          data-wizard-primary
          value={brand.name}
          autoComplete="organization"
          onChange={(event) => updateProject({ brand: { name: event.target.value } })}
        />
      </Field>
      <Field label={de.wizard.steps.brand.claim} htmlFor="brand-claim" optional>
        <input
          id="brand-claim"
          className={styles.input}
          value={brand.claim}
          onChange={(event) => updateProject({ brand: { claim: event.target.value } })}
        />
      </Field>
      <div className={styles.field}>
        <span className={styles.label}>{de.wizard.steps.brand.category}</span>
        <div className={styles.chips}>
          {CATEGORIES.map((category) => (
            <Chip
              key={category}
              selected={brand.category === category}
              onClick={() =>
                updateProject({
                  brand: { category: brand.category === category ? '' : category },
                })
              }
            >
              {category}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
