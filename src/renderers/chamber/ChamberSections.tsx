import { resolveCtaTarget } from '../../generator';
import { SLOTS } from '../../generator/schema/ids';
import { de } from '../../i18n/de';
import type { GeneratedConcept, Project } from '../../types/project';
import { findProjectAsset } from '../../features/preview/previewData';
import { contactItems, socialLinks } from '../shared/contactLinks';
import { RendererMedia } from '../shared/RendererMedia';
import {
  gallerySlotIds,
  isSectionEnabled,
  slotId,
  videoSectionId,
} from '../shared/sectionPlan';
import { useRendererAsset } from '../shared/useRendererAsset';
import styles from './ChamberSections.module.css';

interface SectionProps {
  project: Project;
  concept: GeneratedConcept;
  reducedMotion: boolean;
}

export function ChamberAbout(props: SectionProps) {
  if (!isSectionEnabled(props.concept, 'about')) return null;
  return <ChamberAboutInner {...props} />;
}

function ChamberAboutInner({ project, concept }: SectionProps) {
  const claim = project.brand.claim.trim();
  const description = project.about.description.trim();
  const aboutText = project.about.aboutText.trim();
  const storyOn = isSectionEnabled(concept, 'story');
  const lead = claim ? description : '';
  const body = aboutText;
  const extras = storyOn
    ? []
    : [project.about.story, project.about.mission, project.about.vision]
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
  const imageId = slotId(concept, SLOTS.imageAbout);
  const media = useRendererAsset(project, imageId);
  const hasText = Boolean(lead || body || extras.length > 0);
  if (!hasText && !media.asset) return null;

  return (
    <section className={styles.section} id="about" aria-labelledby="chamber-about-title">
      <p className={styles.kicker}>{de.gallery.sectionLabels.about}</p>
      <h2 id="chamber-about-title" className={styles.heading}>
        {project.brand.name.trim()}
      </h2>
      <div className={styles.aboutGrid}>
        <div className={styles.prose}>
          {lead ? <p className={styles.lead}>{lead}</p> : null}
          {body ? <p>{body}</p> : null}
          {extras.map((text) => (
            <p key={text.slice(0, 24)}>{text}</p>
          ))}
        </div>
        {media.asset ? (
          <div className={styles.aboutMedia}>
            <RendererMedia
              asset={media.asset}
              url={media.url}
              alt={`${project.brand.name.trim()} ${de.gallery.sectionLabels.about}`}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function ChamberServices({ project, concept }: SectionProps) {
  if (!isSectionEnabled(concept, 'services')) return null;
  const services = project.services.filter((item) => item.name.trim().length > 0);
  if (services.length === 0) return null;

  return (
    <section
      className={styles.section}
      id="services"
      aria-labelledby="chamber-services-title"
    >
      <p className={styles.kicker}>{de.gallery.sectionLabels.services}</p>
      <h2 id="chamber-services-title" className={styles.heading}>
        {de.gallery.sectionLabels.services}
      </h2>
      <ol className={styles.serviceList}>
        {services.map((service, index) => (
          <li key={service.id} className={styles.service}>
            <span className={styles.index}>{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h3 className={styles.serviceName}>{service.name.trim()}</h3>
              {service.description.trim() ? (
                <p className={styles.serviceCopy}>{service.description.trim()}</p>
              ) : null}
            </div>
            {service.price.trim() ? (
              <p className={styles.price}>{service.price.trim()}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ChamberGallery({ project, concept }: SectionProps) {
  if (!isSectionEnabled(concept, 'gallery')) return null;
  const ids = gallerySlotIds(concept).filter((id) => findProjectAsset(project, id));
  if (ids.length === 0) return null;

  return (
    <section
      className={styles.section}
      id="gallery"
      aria-labelledby="chamber-gallery-title"
    >
      <p className={styles.kicker}>{de.gallery.sectionLabels.gallery}</p>
      <h2 id="chamber-gallery-title" className="sr-only">
        {de.gallery.sectionLabels.gallery}
      </h2>
      <div className={styles.gallery}>
        {ids.map((id, index) => (
          <GalleryItem key={id} project={project} assetId={id} featured={index === 0} />
        ))}
      </div>
    </section>
  );
}

function GalleryItem({
  project,
  assetId,
  featured,
}: {
  project: Project;
  assetId: string;
  featured: boolean;
}) {
  const media = useRendererAsset(project, assetId);
  return (
    <div className={featured ? styles.galleryFeatured : styles.galleryItem}>
      <RendererMedia
        asset={media.asset}
        url={media.url}
        alt={`${de.gallery.sectionLabels.gallery} ${assetId}`}
      />
    </div>
  );
}

export function ChamberVideo(props: SectionProps) {
  if (!isSectionEnabled(props.concept, 'video')) return null;
  return <ChamberVideoInner {...props} />;
}

function ChamberVideoInner({ project, concept, reducedMotion }: SectionProps) {
  const media = useRendererAsset(project, videoSectionId(concept));
  if (!media.asset) return null;

  return (
    <section className={styles.section} id="video" aria-labelledby="chamber-video-title">
      <p className={styles.kicker}>{de.gallery.sectionLabels.video}</p>
      <h2 id="chamber-video-title" className="sr-only">
        {de.gallery.sectionLabels.video}
      </h2>
      <div className={styles.video}>
        <RendererMedia
          asset={media.asset}
          url={media.url}
          alt={de.gallery.videoHint}
          autoPlay={!reducedMotion}
        />
      </div>
    </section>
  );
}

export function ChamberStory({ project, concept }: SectionProps) {
  if (!isSectionEnabled(concept, 'story')) return null;
  const blocks = [
    { label: de.wizard.steps.about.story, text: project.about.story.trim() },
    { label: de.wizard.steps.about.mission, text: project.about.mission.trim() },
    { label: de.wizard.steps.about.vision, text: project.about.vision.trim() },
  ].filter((item) => item.text.length > 0);
  if (blocks.length === 0) return null;

  return (
    <section className={styles.section} id="story" aria-labelledby="chamber-story-title">
      <p className={styles.kicker}>{de.gallery.sectionLabels.story}</p>
      <h2 id="chamber-story-title" className={styles.heading}>
        {de.gallery.sectionLabels.story}
      </h2>
      <div className={styles.story}>
        {blocks.map((block) => (
          <div key={block.label}>
            <p className={styles.kicker}>{block.label}</p>
            <p className={styles.lead}>{block.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ChamberTeam({ project, concept }: SectionProps) {
  if (!isSectionEnabled(concept, 'team')) return null;
  const people = [project.person, ...project.team].filter(
    (person): person is NonNullable<typeof project.person> =>
      Boolean(person && person.name.trim()),
  );
  if (people.length === 0) return null;

  return (
    <section className={styles.section} id="team" aria-labelledby="chamber-team-title">
      <p className={styles.kicker}>{de.gallery.sectionLabels.team}</p>
      <h2 id="chamber-team-title" className={styles.heading}>
        {de.gallery.sectionLabels.team}
      </h2>
      <ul className={styles.team}>
        {people.map((person) => (
          <li key={person.id}>
            <p className={styles.serviceName}>{person.name.trim()}</p>
            {person.role.trim() ? (
              <p className={styles.serviceCopy}>{person.role.trim()}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ChamberCta({ project, concept }: SectionProps) {
  if (!isSectionEnabled(concept, 'cta')) return null;
  const cta = resolveCtaTarget(project);
  if (!cta.renderable || !cta.href) return null;
  const label = cta.label ?? de.wizard.ctaIntents[project.cta.intent];

  return (
    <section className={styles.ctaBand} id="cta" aria-labelledby="chamber-cta-title">
      <h2 id="chamber-cta-title" className={styles.ctaTitle}>
        {label}
      </h2>
      <a className={styles.ctaLink} href={cta.href}>
        {label}
      </a>
    </section>
  );
}

export function ChamberContact({ project, concept }: SectionProps) {
  if (!isSectionEnabled(concept, 'contact')) return null;
  const lines = [
    project.contact.address.trim(),
    [project.contact.city.trim(), project.contact.country.trim()]
      .filter(Boolean)
      .join(', '),
    project.contact.hours.trim(),
  ].filter((line) => line.length > 0);
  const links = contactItems(project.contact);
  if (lines.length === 0 && links.length === 0) return null;

  return (
    <section
      className={styles.section}
      id="contact"
      aria-labelledby="chamber-contact-title"
    >
      <p className={styles.kicker}>{de.gallery.sectionLabels.contact}</p>
      <h2 id="chamber-contact-title" className={styles.heading}>
        {de.gallery.sectionLabels.contact}
      </h2>
      <div className={styles.contact}>
        {links.map((item) => (
          <a
            key={item.href}
            href={item.href}
            rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
          >
            {item.label}
          </a>
        ))}
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </section>
  );
}

export function ChamberFooter({ project, concept }: SectionProps) {
  if (!isSectionEnabled(concept, 'footer')) return null;
  const social = socialLinks(project.social);
  const mail = contactItems(project.contact).find((item) =>
    item.href.startsWith('mailto:'),
  );

  return (
    <footer className={styles.footer}>
      <p className={styles.footerBrand}>{project.brand.name.trim()}</p>
      <div className={styles.footerLinks}>
        {mail ? <a href={mail.href}>{mail.label}</a> : null}
        {social.map((item) => (
          <a key={item.href} href={item.href} rel="noopener noreferrer">
            {item.label}
          </a>
        ))}
      </div>
    </footer>
  );
}
