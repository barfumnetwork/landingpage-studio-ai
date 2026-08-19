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
} from '../shared/sectionPlan';
import { useRendererAsset } from '../shared/useRendererAsset';
import { reelVideoSectionId } from './reelPlan';
import styles from './ReelSections.module.css';

interface SectionProps {
  project: Project;
  concept: GeneratedConcept;
  reducedMotion: boolean;
}

export function ReelAbout(props: SectionProps) {
  if (!isSectionEnabled(props.concept, 'about')) return null;
  return <ReelAboutInner {...props} />;
}

function ReelAboutInner({ project, concept }: SectionProps) {
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
    <section className={styles.section} id="about" aria-labelledby="reel-about-title">
      <p className={styles.kicker}>{de.renderer.reelNav.about}</p>
      <h2 id="reel-about-title" className={styles.statement}>
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
              alt={`${project.brand.name.trim()} ${de.renderer.reelNav.about}`}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function ReelGallery({ project, concept }: SectionProps) {
  if (!isSectionEnabled(concept, 'gallery')) return null;
  const items = mappedGallery(concept).filter((item) =>
    findProjectAsset(project, item.assetId),
  );
  if (items.length === 0) return null;

  return (
    <section className={styles.section} id="gallery" aria-labelledby="reel-gallery-title">
      <p className={styles.kicker}>{de.renderer.reelNav.work}</p>
      <h2 id="reel-gallery-title" className="sr-only">
        {de.renderer.reelNav.work}
      </h2>
      <div className={styles.strip}>
        {items.map((item, index) => (
          <StripPlate
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

function StripPlate({
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
  const wide = index === 0;
  return (
    <div
      className={wide ? styles.stripMain : styles.stripItem}
      style={{ aspectRatio: wide ? '21 / 9' : (cssAspectRatio(ratio) ?? '16 / 9') }}
    >
      <RendererMedia
        asset={media.asset}
        url={media.url}
        alt={`${de.renderer.reelNav.work} ${String(index + 1).padStart(2, '0')}`}
      />
    </div>
  );
}

export function ReelVideo(props: SectionProps) {
  if (!isSectionEnabled(props.concept, 'video')) return null;
  return <ReelVideoInner {...props} />;
}

function ReelVideoInner({ project, concept, reducedMotion }: SectionProps) {
  const media = useRendererAsset(project, reelVideoSectionId(concept));
  if (!media.asset) return null;

  return (
    <section className={styles.feature} id="video" aria-labelledby="reel-video-title">
      <p className={styles.kicker}>{de.renderer.reelNav.video}</p>
      <h2 id="reel-video-title" className="sr-only">
        {de.renderer.reelNav.video}
      </h2>
      <div className={styles.featureMedia}>
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

export function ReelServices({ project, concept }: SectionProps) {
  if (!isSectionEnabled(concept, 'services')) return null;
  const services = project.services.filter((item) => item.name.trim().length > 0);
  if (services.length === 0) return null;

  return (
    <section
      className={styles.section}
      id="services"
      aria-labelledby="reel-services-title"
    >
      <p className={styles.kicker}>{de.renderer.reelNav.services}</p>
      <h2 id="reel-services-title" className="sr-only">
        {de.renderer.reelNav.services}
      </h2>
      <ol className={styles.credits}>
        {services.map((service, index) => (
          <li key={service.id} className={styles.credit}>
            <span className={styles.index}>{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h3 className={styles.creditName}>{service.name.trim()}</h3>
              {service.description.trim() ? (
                <p className={styles.creditCopy}>{service.description.trim()}</p>
              ) : null}
              {service.price.trim() ? (
                <p className={styles.price}>{service.price.trim()}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ReelStory({ project, concept }: SectionProps) {
  if (!isSectionEnabled(concept, 'story')) return null;
  const blocks = [
    { label: de.wizard.steps.about.story, text: project.about.story.trim() },
    { label: de.wizard.steps.about.mission, text: project.about.mission.trim() },
    { label: de.wizard.steps.about.vision, text: project.about.vision.trim() },
  ].filter((item) => item.text.length > 0);
  const primary = blocks[0];
  if (!primary) return null;

  return (
    <section className={styles.interlude} id="story" aria-labelledby="reel-story-title">
      <p className={styles.kicker}>{primary.label}</p>
      <h2 id="reel-story-title" className={styles.statement}>
        {primary.text}
      </h2>
      {blocks.slice(1).map((block) => (
        <p key={block.label} className={styles.creditCopy}>
          {block.text}
        </p>
      ))}
    </section>
  );
}

export function ReelTeam({ project, concept }: SectionProps) {
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
    <section className={styles.section} id="team" aria-labelledby="reel-team-title">
      <p className={styles.kicker}>{de.renderer.reelNav.team}</p>
      <h2 id="reel-team-title" className="sr-only">
        {de.renderer.reelNav.team}
      </h2>
      <ul className={styles.team}>
        {featured ? (
          <ReelPerson
            project={project}
            person={featured}
            imageId={slotId(concept, SLOTS.person)}
          />
        ) : null}
        {members.map((item) => (
          <ReelPerson
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

function ReelPerson({
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
        <div className={styles.personMedia}>
          <RendererMedia asset={media.asset} url={media.url} alt={person.name.trim()} />
        </div>
      ) : null}
      <div>
        <h3 className={styles.creditName}>{person.name.trim()}</h3>
        {person.role.trim() ? <p className={styles.role}>{person.role.trim()}</p> : null}
        {bio ? <p className={styles.creditCopy}>{bio}</p> : null}
      </div>
    </li>
  );
}

export function ReelCta({ project, concept }: SectionProps) {
  if (!isSectionEnabled(concept, 'cta')) return null;
  const cta = resolveCtaTarget(project);
  if (!cta.renderable || !cta.href) return null;
  const label = cta.label ?? de.wizard.ctaIntents[project.cta.intent];

  return (
    <section className={styles.ctaBand} id="cta" aria-labelledby="reel-cta-title">
      <h2 id="reel-cta-title" className="sr-only">
        {label}
      </h2>
      <a className={styles.ctaLink} href={cta.href}>
        {label}
      </a>
    </section>
  );
}

export function ReelContact({ project, concept }: SectionProps) {
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
    <section className={styles.section} id="contact" aria-labelledby="reel-contact-title">
      <p className={styles.kicker}>{de.renderer.reelNav.contact}</p>
      <h2 id="reel-contact-title" className={styles.statementSmall}>
        {de.renderer.reelNav.contact}
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

export function ReelFooter({ project, concept }: SectionProps) {
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
