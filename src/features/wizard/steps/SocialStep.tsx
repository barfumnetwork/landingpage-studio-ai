import { de } from '../../../i18n/de';
import { useProjectStore } from '../../../store/projectStore';
import type { SocialLink } from '../../../types/project';
import { Field } from '../Field';
import styles from '../fields.module.css';
import { isValidUrl, nextEntityId } from '../wizardConfig';

const NETWORKS = [
  'instagram',
  'tiktok',
  'facebook',
  'linkedin',
  'youtube',
  'whatsapp',
] as const;

export function SocialStep() {
  const social = useProjectStore((state) => state.project?.social);
  const updateProject = useProjectStore((state) => state.updateProject);

  if (!social) return null;

  function urlError(value: string): string | undefined {
    return value.length > 0 && !isValidUrl(value) ? de.wizard.errors.url : undefined;
  }

  function addExtra() {
    if (!social) return;
    const extra: SocialLink[] = [
      ...social.extra,
      {
        id: nextEntityId(
          'LINK',
          social.extra.map((item) => item.id),
        ),
        label: '',
        url: '',
      },
    ];
    updateProject({ social: { extra } });
  }

  function updateExtra(id: string, patch: Partial<SocialLink>) {
    if (!social) return;
    updateProject({
      social: {
        extra: social.extra.map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        ),
      },
    });
  }

  function removeExtra(id: string) {
    if (!social) return;
    updateProject({
      social: { extra: social.extra.filter((item) => item.id !== id) },
    });
  }

  return (
    <div className={styles.stack}>
      {NETWORKS.map((network, index) => (
        <Field
          key={network}
          label={de.wizard.social[network]}
          htmlFor={`social-${network}`}
          optional
          error={network === 'whatsapp' ? undefined : urlError(social[network])}
        >
          <input
            id={`social-${network}`}
            className={styles.input}
            data-wizard-primary={index === 0 ? true : undefined}
            value={social[network]}
            onChange={(event) =>
              updateProject({ social: { [network]: event.target.value } })
            }
          />
        </Field>
      ))}
      {social.extra.map((item) => (
        <article key={item.id} className={styles.card}>
          <div className={styles.cardHead}>
            <p className={styles.cardTitle}>{item.id}</p>
            <button
              type="button"
              className="btn btn-tertiary"
              onClick={() => removeExtra(item.id)}
            >
              {de.wizard.remove}
            </button>
          </div>
          <Field
            label={de.wizard.steps.social.extraLabel}
            htmlFor={`${item.id}-label`}
            optional
          >
            <input
              id={`${item.id}-label`}
              className={styles.input}
              value={item.label}
              onChange={(event) => updateExtra(item.id, { label: event.target.value })}
            />
          </Field>
          <Field
            label={de.wizard.steps.social.extraUrl}
            htmlFor={`${item.id}-url`}
            optional
            error={urlError(item.url)}
          >
            <input
              id={`${item.id}-url`}
              className={styles.input}
              value={item.url}
              onChange={(event) => updateExtra(item.id, { url: event.target.value })}
            />
          </Field>
        </article>
      ))}
      <button type="button" className="btn btn-secondary" onClick={addExtra}>
        {de.wizard.steps.social.add}
      </button>
    </div>
  );
}
