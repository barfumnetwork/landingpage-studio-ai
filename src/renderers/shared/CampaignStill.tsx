import type { CampaignStill as CampaignStillSource } from './campaignAssets';
import styles from './CampaignStill.module.css';

interface CampaignStillProps {
  still: CampaignStillSource;
  alt?: string;
  className?: string;
  sizes?: string;
  eager?: boolean;
}

export function CampaignStill({
  still,
  alt = '',
  className,
  sizes = '100vw',
  eager = false,
}: CampaignStillProps) {
  return (
    <picture className={`${styles.picture} ${className ?? ''}`}>
      <source srcSet={still.webp} type="image/webp" />
      <img
        className={styles.image}
        src={still.jpg}
        alt={alt}
        sizes={sizes}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
      />
    </picture>
  );
}
