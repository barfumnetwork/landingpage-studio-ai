import { SLOTS } from '../../generator/schema/ids';
import type { GeneratedConcept, Project } from '../../types/project';
import { KineticText } from './KineticText';
import { slotId } from './sectionPlan';
import { useRendererAsset } from './useRendererAsset';
import styles from './BrandMark.module.css';

export type BrandTone = 'chamber' | 'atelier' | 'signal' | 'reel' | 'imprint';

interface BrandMarkProps {
  project: Project;
  concept: GeneratedConcept;
  tone: BrandTone;
  reducedMotion: boolean;
  showLogo?: boolean;
}

export function BrandMark({
  project,
  concept,
  tone,
  reducedMotion,
  showLogo = true,
}: BrandMarkProps) {
  const logo = useRendererAsset(project, slotId(concept, SLOTS.logoMain));
  const name = project.brand.name.trim();
  const kinetic = (tone === 'imprint' || tone === 'signal') && !reducedMotion;

  return (
    <div className={`${styles.mark} ${styles[tone]}`} data-brand-mark="">
      {showLogo && logo.url ? (
        <img className={styles.logo} src={logo.url} alt="" />
      ) : null}
      <h1 className={styles.name}>{kinetic ? <KineticText text={name} /> : name}</h1>
    </div>
  );
}
