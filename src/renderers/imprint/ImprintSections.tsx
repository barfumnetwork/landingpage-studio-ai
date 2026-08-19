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
import { imprintIndex } from './imprintPlan';
import styles from './ImprintSections.module.css';

interface SectionProps {
  project: Project;
  concept: GeneratedConcept;
  reducedMotion: boolean;
}

function Kicker({
  concept,
  section,
  label,
}: {
  concept: GeneratedConcept;
  section: string;
  label: string;
}) {
  return (
    <p className={styles.kicker}>
      {imprintIndex(concept, section)} — {label}
    </p>
  );
}

export function ImprintAbout(props: SectionProps) {
  if (!isSectionEnabled(props.concept, 'about')) return null;
  return <ImprintAboutInner {...props} />;
}

function ImprintAboutInner({ project, concept }: SectionProps) {
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
    <section className={styles.section} id="about" aria-labelledby="imprint-about-title">
      <Kicker concept={concept} section="about" label={de.renderer.imprintNav.about} />
      <h2 id="imprint-about-title" className={styles.heading}>
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
          <figure className={styles.aboutMedia}>
            <RendererMedia
              asset={media.asset}
              url={media.url}
              alt={`${project.brand.name.trim()} ${de.renderer.imprintNav.about}`}
            />
          </figure>
        ) : null}
      </div>
    </section>
  );
}

export function ImprintServices({ project, concept }: SectionProps) {
  if (!isSectionEnabled(concept, 'services')) return null;
  const services = project.services.filter((item) => item.name.trim().length > 0);
  if (services.length === 0) return null;

  return (
    <section
      className={styles.section}
      id="services"
      aria-labelledby="imprint-services-title"
    >
      <Kicker
        concept={concept}
        section="services"
        label={de.renderer.imprintNav.services}
      />
      <h2 id="imprint-services-title" className="sr-only">
        {de.renderer.imprintNav.services}
      </h2>
      <ul className={styles.serviceList}>
        {services.map((service) => (
          <li key={service.id} className={styles.service}>
            <h3 className={styles.serviceName}>{service.name.trim()}</h3>
            {service.description.trim() ? (
              <p className={styles.serviceCopy}>{service.description.trim()}</p>
            ) : null}
            {service.price.trim() ? (
              <p className={styles.price}>{service.price.trim()}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ImprintGallery({ project, concept }: SectionProps) {
  if (!isSectionEnabled(concept, 'gallery')) return null;
  const items = mappedGallery(concept).filter((item) =>
    findProjectAsset(project, item.assetId),
  );
  if (items.length === 0) return null;

  return (
    <section
      className={styles.section}
      id="gallery"
      aria-labelledby="imprint-gallery-title"
    >
      <Kicker concept={concept} section="gallery" label={de.renderer.imprintNav.work} />
      <h2 id="imprint-gallery-title" className="sr-only">
        {de.renderer.imprintNav.work}
      </h2>
      <div className={styles.gallery}>
        {items.map((item, index) => (
          <ArchivePlate
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

function ArchivePlate({
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
  const variant =
    index % 3 === 0
      ? styles.plateWide
      : index % 3 === 1
        ? styles.plateTall
        : styles.plateBase;
  return (
    <figure
      className={`${styles.plate} ${variant}`}
      style={{ aspectRatio: cssAspectRatio(ratio) ?? '4 / 5' }}
    >
      <RendererMedia
        asset={media.asset}
        url={media.url}
        alt={`${de.renderer.imprintNav.work} ${String(index + 1).padStart(2, '0')}`}
      />
      <figcaption className={styles.plateIndex}>
        {String(index + 1).padStart(2, '0')}
      </figcaption>
    </figure>
  );
}

export function ImprintVideo(props: SectionProps) {
  if (!isSectionEnabled(props.concept, 'video')) return null;
  return <ImprintVideoInner {...props} />;
}

function ImprintVideoInner({ project, concept, reducedMotion }: SectionProps) {
  const media = useRendererAsset(project, videoSectionId(concept));
  if (!media.asset) return null;

  return (
    <section className={styles.section} id="video" aria-labelledby="imprint-video-title">
      <Kicker concept={concept} section="video" label={de.renderer.imprintNav.video} />
      <h2 id="imprint-video-title" className="sr-only">
        {de.renderer.imprintNav.video}
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

export function ImprintStory({ project, concept }: SectionProps) {
  if (!isSectionEnabled(concept, 'story')) return null;
  const blocks = [
    { label: de.wizard.steps.about.story, text: project.about.story.trim() },
    { label: de.wizard.steps.about.mission, text: project.about.mission.trim() },
    { label: de.wizard.steps.about.vision, text: project.about.vision.trim() },
  ].filter((item) => item.text.length > 0);
  const primary = blocks[0];
  if (!primary) return null;
  const rest = blocks.slice(1);

  return (
    <section className={styles.section} id="story" aria-labelledby="imprint-story-title">
      <Kicker concept={concept} section="story" label={de.gallery.sectionLabels.story} />
      <h2 id="imprint-story-title" className={styles.statement}>
        {primary.text}
      </h2>
      {rest.length > 0 ? (
        <div className={styles.storyRest}>
          {rest.map((block) => (
            <div key={block.label} className={styles.storyBlock}>
              <p className={styles.kicker}>{block.label}</p>
              <p className={styles.storyCopy}>{block.text}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function ImprintTeam({ project, concept }: SectionProps) {
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
    <section className={styles.section} id="team" aria-labelledby="imprint-team-title">
      <Kicker concept={concept} section="team" label={de.renderer.imprintNav.team} />
      <h2 id="imprint-team-title" className="sr-only">
        {de.renderer.imprintNav.team}
      </h2>
      <ul className={styles.team}>
        {featured ? (
          <ImprintPerson
            project={project}
            person={featured}
            imageId={slotId(concept, SLOTS.person)}
          />
        ) : null}
        {members.map((item) => (
          <ImprintPerson
            key={item.person.id}
            project={project}
            person={item.person}
            imageId={item.imageId}
          />
        ))}
      </ul>
    </section>
  );
}

function ImprintPerson({
  project,
  person,
  imageId,
}: {
  project: Project;
  person: Person;
  imageId: string | null;
}) {
  const media = useRendererAsset(project, imageId);
  const bio = person.description.trim();
  return (
    <li className={styles.person}>
      {media.asset ? (
        <figure className={styles.personMedia}>
          <RendererMedia asset={media.asset} url={media.url} alt={person.name.trim()} />
        </figure>
      ) : null}
      <div className={styles.personCopy}>
        <h3 className={styles.personName}>{person.name.trim()}</h3>
        {person.role.trim() ? <p className={styles.role}>{person.role.trim()}</p> : null}
        {bio ? <p className={styles.personBio}>{bio}</p> : null}
      </div>
    </li>
  );
}

export function ImprintCta({ project, concept }: SectionProps) {
  if (!isSectionEnabled(concept, 'cta')) return null;
  const cta = resolveCtaTarget(project);
  if (!cta.renderable || !cta.href) return null;
  const label = cta.label ?? de.wizard.ctaIntents[project.cta.intent];

  return (
    <section className={styles.ctaBand} id="cta" aria-labelledby="imprint-cta-title">
      <Kicker concept={concept} section="cta" label={de.gallery.sectionLabels.cta} />
      <h2 id="imprint-cta-title" className="sr-only">
        {label}
      </h2>
      <a className={styles.ctaLink} href={cta.href}>
        {label}
      </a>
    </section>
  );
}

export function ImprintContact({ project, concept }: SectionProps) {
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
      aria-labelledby="imprint-contact-title"
    >
      <Kicker
        concept={concept}
        section="contact"
        label={de.renderer.imprintNav.contact}
      />
      <h2 id="imprint-contact-title" className={styles.headingSmall}>
        {de.renderer.imprintNav.contact}
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

export function ImprintFooter({ project, concept }: SectionProps) {
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
