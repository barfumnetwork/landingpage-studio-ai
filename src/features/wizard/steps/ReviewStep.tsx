import { de } from '../../../i18n/de';
import { useProjectStore } from '../../../store/projectStore';
import type { Project } from '../../../types/project';
import styles from '../ReviewStep.module.css';

interface ReviewStepProps {
  onJump: (stepIndex: number) => void;
}

function mark(value: boolean): string {
  return value ? '✓' : '—';
}

function filledContact(project: Project): string[] {
  const entries: [string, string][] = [
    [de.wizard.contact.email, project.contact.email],
    [de.wizard.contact.phone, project.contact.phone],
    [de.wizard.contact.whatsapp, project.contact.whatsapp],
    [de.wizard.contact.address, project.contact.address],
    [de.wizard.contact.city, project.contact.city],
    [de.wizard.contact.country, project.contact.country],
    [de.wizard.contact.website, project.contact.website],
    [de.wizard.contact.hours, project.contact.hours],
  ];
  return entries.filter(([, value]) => value.trim().length > 0).map(([label]) => label);
}

function filledSocial(project: Project): number {
  const named = [
    project.social.instagram,
    project.social.tiktok,
    project.social.facebook,
    project.social.linkedin,
    project.social.youtube,
    project.social.whatsapp,
  ].filter((value) => value.trim().length > 0).length;
  const extra = project.social.extra.filter((item) => item.url.trim().length > 0).length;
  return named + extra;
}

const DIRECTION_LABELS: Record<string, string> = {
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

export function ReviewStep({ onJump }: ReviewStepProps) {
  const project = useProjectStore((state) => state.project);
  if (!project) return null;

  const contacts = filledContact(project);
  const socialCount = filledSocial(project);
  const hasAbout = [
    project.about.story,
    project.about.mission,
    project.about.vision,
    project.about.aboutText,
    project.person?.name,
  ].some((value) => Boolean(value && value.trim()));

  return (
    <div className={styles.review}>
      <section className={styles.group}>
        <div className={styles.groupHead}>
          <h2 className={styles.groupTitle}>{de.wizard.steps.review.brand}</h2>
          <button type="button" className={styles.edit} onClick={() => onJump(0)}>
            {de.wizard.editStep}
          </button>
        </div>
        <div className={styles.rows}>
          <div className={styles.row}>
            <span className={styles.key}>{de.wizard.steps.brand.name}</span>
            <span className={styles.value}>{project.brand.name || '—'}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.key}>{de.wizard.steps.brand.claim}</span>
            <span className={styles.value}>{project.brand.claim || '—'}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.key}>{de.wizard.steps.brand.category}</span>
            <span className={styles.value}>{project.brand.category || '—'}</span>
          </div>
        </div>
      </section>

      <section className={styles.group}>
        <div className={styles.groupHead}>
          <h2 className={styles.groupTitle}>{de.wizard.steps.review.media}</h2>
          <button type="button" className={styles.edit} onClick={() => onJump(1)}>
            {de.wizard.editStep}
          </button>
        </div>
        <div className={styles.rows}>
          <div className={styles.row}>
            <span className={styles.key}>{de.wizard.review.logoCount}</span>
            <span className={styles.value}>{project.logo.original ? '1' : '0'}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.key}>{de.wizard.review.imageCount}</span>
            <span className={styles.value}>{String(project.media.images.length)}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.key}>{de.wizard.review.videoCount}</span>
            <span className={styles.value}>{String(project.media.videos.length)}</span>
          </div>
        </div>
      </section>

      <section className={styles.group}>
        <div className={styles.groupHead}>
          <h2 className={styles.groupTitle}>{de.wizard.steps.review.content}</h2>
          <button type="button" className={styles.edit} onClick={() => onJump(4)}>
            {de.wizard.editStep}
          </button>
        </div>
        <div className={styles.rows}>
          <div className={styles.row}>
            <span className={styles.key}>{de.wizard.review.description}</span>
            <span
              className={`${styles.value} ${project.about.description.trim().length >= 20 ? styles.ok : ''}`}
            >
              {mark(project.about.description.trim().length >= 20)}
            </span>
          </div>
          <div className={styles.row}>
            <span className={styles.key}>{de.wizard.review.serviceCount}</span>
            <span className={styles.value}>{String(project.services.length)}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.key}>{de.wizard.review.about}</span>
            <span className={styles.value}>{mark(hasAbout)}</span>
          </div>
        </div>
      </section>

      <section className={styles.group}>
        <div className={styles.groupHead}>
          <h2 className={styles.groupTitle}>{de.wizard.steps.review.contact}</h2>
          <button type="button" className={styles.edit} onClick={() => onJump(7)}>
            {de.wizard.editStep}
          </button>
        </div>
        <div className={styles.rows}>
          {contacts.length > 0 ? (
            contacts.map((label) => (
              <div className={styles.row} key={label}>
                <span className={styles.key}>{label}</span>
                <span className={`${styles.value} ${styles.ok}`}>✓</span>
              </div>
            ))
          ) : (
            <div className={styles.row}>
              <span className={styles.key}>{de.wizard.missing}</span>
              <span className={styles.value}>—</span>
            </div>
          )}
        </div>
      </section>

      <section className={styles.group}>
        <div className={styles.groupHead}>
          <h2 className={styles.groupTitle}>{de.wizard.steps.review.social}</h2>
          <button type="button" className={styles.edit} onClick={() => onJump(8)}>
            {de.wizard.editStep}
          </button>
        </div>
        <div className={styles.rows}>
          <div className={styles.row}>
            <span className={styles.key}>{de.wizard.review.links}</span>
            <span className={styles.value}>{String(socialCount)}</span>
          </div>
        </div>
      </section>

      <section className={styles.group}>
        <div className={styles.groupHead}>
          <h2 className={styles.groupTitle}>{de.wizard.steps.review.cta}</h2>
          <button type="button" className={styles.edit} onClick={() => onJump(9)}>
            {de.wizard.editStep}
          </button>
        </div>
        <div className={styles.rows}>
          <div className={styles.row}>
            <span className={styles.key}>{de.wizard.steps.cta.question}</span>
            <span className={styles.value}>
              {de.wizard.ctaIntents[project.cta.intent]}
            </span>
          </div>
          <div className={styles.row}>
            <span className={styles.key}>{de.wizard.steps.cta.label}</span>
            <span className={styles.value}>{project.cta.label || '—'}</span>
          </div>
        </div>
      </section>

      <section className={styles.group}>
        <div className={styles.groupHead}>
          <h2 className={styles.groupTitle}>{de.wizard.steps.review.style}</h2>
          <button type="button" className={styles.edit} onClick={() => onJump(10)}>
            {de.wizard.editStep}
          </button>
        </div>
        <div className={styles.rows}>
          <div className={styles.row}>
            <span className={styles.key}>{de.wizard.steps.style.question}</span>
            <span className={styles.value}>
              {DIRECTION_LABELS[project.style.direction] ?? project.style.direction}
            </span>
          </div>
          <div className={styles.row}>
            <span className={styles.key}>{de.wizard.steps.style.theme}</span>
            <span className={styles.value}>{de.wizard.themes[project.style.theme]}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
