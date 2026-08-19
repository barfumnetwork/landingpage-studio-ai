import { de } from '../../../i18n/de';
import { useProjectStore } from '../../../store/projectStore';
import styles from '../fields.module.css';

export function LogoStep() {
  const hasLogo = useProjectStore((state) => state.project?.logo.original != null);

  return (
    <div className={styles.empty}>
      <p>{hasLogo ? de.wizard.review.logoCount : de.wizard.steps.logo.empty}</p>
      <p className={styles.emptyMeta}>{de.wizard.steps.logo.formats}</p>
    </div>
  );
}

export function ImagesStep() {
  const count = useProjectStore((state) => state.project?.media.images.length ?? 0);

  return (
    <div className={styles.empty}>
      <p>
        {count > 0
          ? `${count} ${de.wizard.review.imageCount}`
          : de.wizard.steps.images.empty}
      </p>
    </div>
  );
}

export function VideosStep() {
  const count = useProjectStore((state) => state.project?.media.videos.length ?? 0);

  return (
    <div className={styles.empty}>
      <p>
        {count > 0
          ? `${count} ${de.wizard.review.videoCount}`
          : de.wizard.steps.videos.empty}
      </p>
      <p className={styles.emptyMeta}>{de.wizard.steps.videos.hint}</p>
    </div>
  );
}
