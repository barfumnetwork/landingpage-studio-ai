import { resolveCtaTarget } from '../../generator';
import { SLOTS, teamSlot } from '../../generator/schema/ids';
import { de } from '../../i18n/de';
import type { GeneratedConcept, Person, Project } from '../../types/project';
import { findProjectAsset } from '../../features/preview/previewData';
import { contactItems, socialLinks, websiteHref } from '../shared/contactLinks';
import { RendererMedia } from '../shared/RendererMedia';
import {
  cssAspectRatio,
  isSectionEnabled,
  mappedGallery,
  slotId,
  videoSectionId,
} from '../shared/sectionPlan';
import { useRendererAsset } from '../shared/useRendererAsset';
import styles from './AtelierSections.module.css';

interface SectionProps {
  project: Project;
  concept: GeneratedConcept;
  reducedMotion: boolean;
}

export function AtelierAbout(props: SectionProps) {
  if (!isSectionEnabled(props.concept, 'about')) return null;
  return <AtelierAboutInner {...props} />;
}

function AtelierAboutInner({ project, concept }: SectionProps) {
  const claim = project.brand.claim.trim();
  const description = project.about.description.trim();
  const aboutText = project.about.aboutText.trim();
  const storyOn = isSectionEnabled(concept, 'story');
  const lead = claim ? description : '';
  const extras = storyOn
    ? []
    : [project.about.story, project.about.mission, project.about.vision]
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
  const media = useRendererAsset(project, slotId(concept, SLOTS.imageAbout));
  if (!lead && !aboutText && extras.length === 0 && !media.asset) return null;

  return (
    <section className={styles.section} id="about" aria-labelledby="atelier-about-title">
      <p className={styles.kicker}>{de.renderer.atelierNav.about}</p>
      <h2 id="atelier-about-title" className={styles.heading}>
        {project.brand.name.trim()}
      </h2>
      <div className={styles.about}>
        <div className={styles.prose}>
          {lead ? <p className={styles.lead}>{lead}</p> : null}
          {aboutText ? <p>{aboutText}</p> : null}
          {extras.map((text) => (
            <p key={text.slice(0, 24)}>{text}</p>
          ))}
        </div>
        {media.asset ? (
          <div className={styles.aboutMedia} data-atelier-media>
            <RendererMedia
              asset={media.asset}
              url={media.url}
              alt={`${project.brand.name.trim()} ${de.renderer.atelierNav.about}`}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function AtelierServices({ project, concept }: SectionProps) {
  if (!isSectionEnabled(concept, 'services')) return null;
  const services = project.services.filter((item) => item.name.trim().length > 0);
  if (services.length === 0) return null;

  return (
    <section
      className={styles.section}
      id="services"
      aria-labelledby="atelier-services-title"
    >
      <p className={styles.kicker}>{de.renderer.atelierNav.services}</p>
      <h2 id="atelier-services-title" className={styles.heading}>
        {de.renderer.atelierNav.services}
      </h2>
      <ol className={styles.serviceList}>
        {services.map((service, index) => (
          <li key={service.id} className={styles.service}>
            <span className={styles.index}>{String(index + 1).padStart(2, '0')}</span>
            <h3 className={styles.serviceName}>{service.name.trim()}</h3>
            {service.description.trim() ? (
              <p className={styles.serviceCopy}>{service.description.trim()}</p>
            ) : null}
            {service.price.trim() ? (
              <p className={styles.price}>{service.price.trim()}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function AtelierGallery({ project, concept }: SectionProps) {
  if (!isSectionEnabled(concept, 'gallery')) return null;
  const items = mappedGallery(concept).filter((item) =>
    findProjectAsset(project, item.assetId),
  );
  if (items.length === 0) return null;

  return (
    <section
      className={styles.section}
      id="gallery"
      aria-labelledby="atelier-gallery-title"
    >
      <p className={styles.kicker}>{de.renderer.atelierNav.work}</p>
      <h2 id="atelier-gallery-title" className="sr-only">
        {de.renderer.atelierNav.work}
      </h2>
      <div className={styles.gallery}>
        {items.map((item, index) => (
          <GalleryPlate
            key={item.assetId}
            project={project}
            assetId={item.assetId}
            ratio={item.ratio}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}

function GalleryPlate({
  project,
  assetId,
  ratio,
  index,
}: {
  project: Project;
  assetId: string;
  ratio: string;
  index: number;
}) {
  const media = useRendererAsset(project, assetId);
  const plates = [styles.plate1, styles.plate2, styles.plate3, styles.plate4];
  return (
    <div
      className={`${styles.plate} ${plates[index % 4]}`}
      data-atelier-media
      style={{ aspectRatio: cssAspectRatio(ratio) ?? '3 / 2' }}
    >
      <RendererMedia
        asset={media.asset}
        url={media.url}
        alt={`${de.renderer.atelierNav.work} ${String(index + 1).padStart(2, '0')}`}
      />
    </div>
  );
}

export function AtelierVideo(props: SectionProps) {
  if (!isSectionEnabled(props.concept, 'video')) return null;
  return <AtelierVideoInner {...props} />;
}

function AtelierVideoInner({ project, concept, reducedMotion }: SectionProps) {
  const media = useRendererAsset(project, videoSectionId(concept));
  if (!media.asset) return null;

  return (
    <section className={styles.section} id="video" aria-labelledby="atelier-video-title">
      <p className={styles.kicker}>{de.gallery.sectionLabels.video}</p>
      <h2 id="atelier-video-title" className="sr-only">
        {de.gallery.sectionLabels.video}
      </h2>
      <div className={styles.video} data-atelier-media>
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

export function AtelierStory({ project, concept }: SectionProps) {
  if (!isSectionEnabled(concept, 'story')) return null;
  const blocks = [
    { label: de.wizard.steps.about.story, text: project.about.story.trim() },
    { label: de.wizard.steps.about.mission, text: project.about.mission.trim() },
    { label: de.wizard.steps.about.vision, text: project.about.vision.trim() },
  ].filter((item) => item.text.length > 0);
  if (blocks.length === 0) return null;
  const [primary, ...rest] = blocks;
  if (!primary) return null;

  return (
    <section className={styles.section} id="story" aria-labelledby="atelier-story-title">
      <p className={styles.kicker}>{primary.label}</p>
      <h2 id="atelier-story-title" className={styles.statement}>
        {primary.text}
      </h2>
      {rest.length > 0 ? (
        <div className={styles.storyRest}>
          {rest.map((block) => (
            <div key={block.label}>
              <p className={styles.kicker}>{block.label}</p>
              <p className={styles.lead}>{block.text}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function AtelierTeam({ project, concept }: SectionProps) {
  if (!isSectionEnabled(concept, 'team')) return null;
  const featured = project.person && project.person.name.trim() ? project.person : null;
  const members = project.team
    .map((person, index) => ({
      person,
      imageId: slotId(concept, teamSlot(index)),
    }))
    .filter((item) => item.person.name.trim().length > 0);
  if (!featured && members.length === 0) return null;

  return (
    <section className={styles.section} id="team" aria-labelledby="atelier-team-title">
      <p className={styles.kicker}>{de.gallery.sectionLabels.team}</p>
      <h2 id="atelier-team-title" className={styles.heading}>
        {de.gallery.sectionLabels.team}
      </h2>
      <ul className={styles.team}>
        {featured ? (
          <AtelierPerson
            project={project}
            person={featured}
            imageId={slotId(concept, SLOTS.person)}
            reverse={false}
          />
        ) : null}
        {members.map((item, index) => (
          <AtelierPerson
            key={item.person.id}
            project={project}
            person={item.person}
            imageId={item.imageId}
            reverse={(index + (featured ? 1 : 0)) % 2 === 1}
          />
        ))}
      </ul>
    </section>
  );
}

function AtelierPerson({
  project,
  person,
  imageId,
  reverse,
}: {
  project: Project;
  person: Person;
  imageId: string | null;
  reverse: boolean;
}) {
  const media = useRendererAsset(project, imageId);
  return (
    <li className={`${styles.person} ${reverse ? styles.personReverse : ''}`}>
      {media.asset ? (
        <div className={styles.personMedia}>
          <RendererMedia asset={media.asset} url={media.url} alt={person.name.trim()} />
        </div>
      ) : null}
      <div className={styles.personCopy}>
        <h3 className={styles.serviceName}>{person.name.trim()}</h3>
        {person.role.trim() ? (
          <p className={styles.serviceCopy}>{person.role.trim()}</p>
        ) : null}
      </div>
    </li>
  );
}

export function AtelierCta({ project, concept }: SectionProps) {
  if (!isSectionEnabled(concept, 'cta')) return null;
  const cta = resolveCtaTarget(project);
  if (!cta.renderable || !cta.href) return null;
  const label = cta.label ?? de.wizard.ctaIntents[project.cta.intent];

  return (
    <section className={styles.ctaBand} id="cta" aria-labelledby="atelier-cta-title">
      <h2 id="atelier-cta-title" className="sr-only">
        {label}
      </h2>
      <a className={styles.ctaLink} href={cta.href}>
        {label}
      </a>
    </section>
  );
}

export function AtelierContact({ project, concept }: SectionProps) {
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
      aria-labelledby="atelier-contact-title"
    >
      <p className={styles.kicker}>{de.renderer.atelierNav.contact}</p>
      <h2 id="atelier-contact-title" className={styles.heading}>
        {de.renderer.atelierNav.contact}
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

export function AtelierFooter({ project, concept }: SectionProps) {
  if (!isSectionEnabled(concept, 'footer')) return null;
  const social = socialLinks(project.social);
  const mail = contactItems(project.contact).find((item) =>
    item.href.startsWith('mailto:'),
  );
  const siteHref = websiteHref(project.contact.website);
  const siteLabel = project.contact.website.trim();

  return (
    <footer className={styles.footer}>
      <p className={styles.footerBrand}>{project.brand.name.trim()}</p>
      <div className={styles.footerLinks}>
        {mail ? <a href={mail.href}>{mail.label}</a> : null}
        {siteHref ? (
          <a href={siteHref} rel="noopener noreferrer">
            {siteLabel || siteHref}
          </a>
        ) : null}
        {social.map((item) => (
          <a key={item.href} href={item.href} rel="noopener noreferrer">
            {item.label}
          </a>
        ))}
      </div>
    </footer>
  );
}
