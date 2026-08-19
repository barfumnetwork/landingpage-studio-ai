import { de } from '../../../i18n/de';
import { useProjectStore } from '../../../store/projectStore';
import { Field } from '../Field';
import styles from '../fields.module.css';

export function AboutStep() {
  const about = useProjectStore((state) => state.project?.about);
  const updateProject = useProjectStore((state) => state.updateProject);

  if (!about) return null;

  const descriptionError =
    about.description.length > 0 && about.description.trim().length < 20
      ? de.wizard.errors.description
      : undefined;

  return (
    <div className={styles.stack}>
      <Field
        label={de.wizard.steps.about.description}
        htmlFor="about-description"
        hint={de.wizard.steps.about.helper}
        error={descriptionError}
      >
        <textarea
          id="about-description"
          className={styles.textarea}
          data-wizard-primary
          value={about.description}
          onChange={(event) =>
            updateProject({ about: { description: event.target.value } })
          }
        />
      </Field>
      <Field label={de.wizard.steps.about.story} htmlFor="about-story" optional>
        <textarea
          id="about-story"
          className={styles.textarea}
          value={about.story}
          onChange={(event) => updateProject({ about: { story: event.target.value } })}
        />
      </Field>
      <Field label={de.wizard.steps.about.mission} htmlFor="about-mission" optional>
        <textarea
          id="about-mission"
          className={styles.textarea}
          value={about.mission}
          onChange={(event) => updateProject({ about: { mission: event.target.value } })}
        />
      </Field>
      <Field label={de.wizard.steps.about.vision} htmlFor="about-vision" optional>
        <textarea
          id="about-vision"
          className={styles.textarea}
          value={about.vision}
          onChange={(event) => updateProject({ about: { vision: event.target.value } })}
        />
      </Field>
      <Field label={de.wizard.steps.about.aboutText} htmlFor="about-text" optional>
        <textarea
          id="about-text"
          className={styles.textarea}
          value={about.aboutText}
          onChange={(event) =>
            updateProject({ about: { aboutText: event.target.value } })
          }
        />
      </Field>
    </div>
  );
}
