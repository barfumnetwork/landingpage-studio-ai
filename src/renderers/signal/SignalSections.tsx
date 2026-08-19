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
import { signalIndex } from './signalPlan';
import styles from './SignalSections.module.css';

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
      {signalIndex(concept, section)} / {label}
    </p>
  );
}

export function SignalAbout(props: SectionProps) {
  if (!isSectionEnabled(props.concept, 'about')) return null;
  return <SignalAboutInner {...props} />;
}

function SignalAboutInner({ project, concept }: SectionProps) {
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
    <section className={styles.section} id="about" aria-labelledby="signal-about-title">
      <Kicker concept={concept} section="about" label={de.renderer.signalNav.about} />
      <h2 id="signal-about-title" className={styles.heading}>
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
          <div className={styles.aboutMedia}>
            <RendererMedia
              asset={media.asset}
              url={media.url}
              alt={`${project.brand.name.trim()} ${de.renderer.signalNav.about}`}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function SignalServices({ project, concept }: SectionProps) {
  if (!isSectionEnabled(concept, 'services')) return null;
  const services = project.services.filter((item) => item.name.trim().length > 0);
  if (services.length === 0) return null;

  return (
    <section
      className={styles.section}
      id="services"
      aria-labelledby="signal-services-title"
    >
      <Kicker
        concept={concept}
        section="services"
        label={de.renderer.signalNav.services}
      />
      <h2 id="signal-services-title" className="sr-only">
        {de.renderer.signalNav.services}
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

export function SignalGallery({ project, concept }: SectionProps) {
  if (!isSectionEnabled(concept, 'gallery')) return null;
  const items = mappedGallery(concept).filter((item) =>
    findProjectAsset(project, item.assetId),
  );
  if (items.length === 0) return null;

  return (
    <section
      className={styles.section}
      id="gallery"
      aria-labelledby="signal-gallery-title"
    >
      <Kicker concept={concept} section="gallery" label={de.renderer.signalNav.work} />
      <h2 id="signal-gallery-title" className="sr-only">
        {de.renderer.signalNav.work}
      </h2>
      <div className={styles.gallery}>
        {items.map((item, index) => (
          <WorkPlate
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

function WorkPlate({
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
  return (
    <figure
      className={`${styles.plate} ${index === 0 ? styles.plateMain : styles.plateSide}`}
      style={{ aspectRatio: cssAspectRatio(ratio) ?? '16 / 9' }}
    >
      <RendererMedia
        asset={media.asset}
        url={media.url}
        alt={`${de.renderer.signalNav.work} ${String(index + 1).padStart(2, '0')}`}
      />
      <figcaption className={styles.plateIndex}>
        {String(index + 1).padStart(2, '0')}
      </figcaption>
    </figure>
  );
}

export function SignalVideo(props: SectionProps) {
  if (!isSectionEnabled(props.concept, 'video')) return null;
  return <SignalVideoInner {...props} />;
}

function SignalVideoInner({ project, concept, reducedMotion }: SectionProps) {
  const media = useRendererAsset(project, videoSectionId(concept));
  if (!media.asset) return null;

  return (
    <section className={styles.section} id="video" aria-labelledby="signal-video-title">
      <Kicker concept={concept} section="video" label={de.renderer.signalNav.video} />
      <h2 id="signal-video-title" className="sr-only">
        {de.renderer.signalNav.video}
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

export function SignalStory({ project, concept }: SectionProps) {
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
    <section className={styles.section} id="story" aria-labelledby="signal-story-title">
      <Kicker concept={concept} section="story" label={de.gallery.sectionLabels.story} />
      <h2 id="signal-story-title" className={styles.heading}>
        {primary.text}
      </h2>
      {rest.length > 0 ? (
        <div className={styles.storyRest}>
          {rest.map((block) => (
            <div key={block.label} className={styles.storyBlock}>
              <p className={styles.kicker}>{block.label}</p>
              <p>{block.text}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function SignalTeam({ project, concept }: SectionProps) {
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
    <section className={styles.section} id="team" aria-labelledby="signal-team-title">
      <Kicker concept={concept} section="team" label={de.renderer.signalNav.team} />
      <h2 id="signal-team-title" className="sr-only">
        {de.renderer.signalNav.team}
      </h2>
      <ul className={styles.team}>
        {featured ? (
          <SignalPerson
            project={project}
            person={featured}
            imageId={slotId(concept, SLOTS.person)}
            index={0}
          />
        ) : null}
        {members.map((item, index) => (
          <SignalPerson
            key={item.person.id}
            project={project}
            person={item.person}
            imageId={item.imageId}
            index={index + (featured ? 1 : 0)}
          />
        ))}
      </ul>
    </section>
  );
}

function SignalPerson({
  project,
  person,
  imageId,
  index,
}: {
  project: Project;
  person: Person;
  imageId: string | null;
  index: number;
}) {
  const media = useRendererAsset(project, imageId);
  const bio = person.description.trim();
  return (
    <li className={styles.person}>
      <span className={styles.index}>{String(index + 1).padStart(2, '0')}</span>
      {media.asset ? (
        <div className={styles.personMedia}>
          <RendererMedia asset={media.asset} url={media.url} alt={person.name.trim()} />
        </div>
      ) : null}
      <div className={styles.personCopy}>
        <h3 className={styles.serviceName}>{person.name.trim()}</h3>
        {person.role.trim() ? <p className={styles.role}>{person.role.trim()}</p> : null}
        {bio ? <p className={styles.serviceCopy}>{bio}</p> : null}
      </div>
    </li>
  );
}

export function SignalCta({ project, concept }: SectionProps) {
  if (!isSectionEnabled(concept, 'cta')) return null;
  const cta = resolveCtaTarget(project);
  if (!cta.renderable || !cta.href) return null;
  const label = cta.label ?? de.wizard.ctaIntents[project.cta.intent];

  return (
    <section className={styles.ctaBand} id="cta" aria-labelledby="signal-cta-title">
      <Kicker concept={concept} section="cta" label={de.gallery.sectionLabels.cta} />
      <h2 id="signal-cta-title" className="sr-only">
        {label}
      </h2>
      <a className={styles.ctaLink} href={cta.href}>
        {label}
      </a>
    </section>
  );
}

export function SignalContact({ project, concept }: SectionProps) {
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
      aria-labelledby="signal-contact-title"
    >
      <Kicker concept={concept} section="contact" label={de.renderer.signalNav.contact} />
      <h2 id="signal-contact-title" className={styles.headingSmall}>
        {de.renderer.signalNav.contact}
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

export function SignalFooter({ project, concept }: SectionProps) {
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
