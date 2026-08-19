import type { Person, Project, Service } from '../../types/project';
import type {
  NormalizedAbout,
  NormalizedContact,
  NormalizedProject,
  NormalizedSocial,
} from '../schema/types';
import { normalizeHttpUrl, trimToNull } from './text';

function normalizeService(service: Service): Service | null {
  const name = service.name.trim();
  if (name.length === 0) return null;
  return {
    ...service,
    name,
    description: service.description.trim(),
    price: service.price.trim(),
    imageId: service.imageId,
  };
}

function normalizePerson(person: Person): Person | null {
  const name = person.name.trim();
  if (name.length === 0) return null;
  return {
    ...person,
    name,
    role: person.role.trim(),
    description: person.description.trim(),
    story: person.story.trim(),
    imageId: person.imageId,
  };
}

function normalizeAbout(about: Project['about']): NormalizedAbout {
  return {
    description: trimToNull(about.description),
    story: trimToNull(about.story),
    mission: trimToNull(about.mission),
    vision: trimToNull(about.vision),
    aboutText: trimToNull(about.aboutText),
  };
}

function normalizeContact(contact: Project['contact']): NormalizedContact {
  return {
    email: trimToNull(contact.email),
    phone: trimToNull(contact.phone),
    whatsapp: trimToNull(contact.whatsapp),
    address: trimToNull(contact.address),
    city: trimToNull(contact.city),
    country: trimToNull(contact.country),
    website: trimToNull(contact.website),
    hours: trimToNull(contact.hours),
  };
}

function normalizeSocial(social: Project['social']): NormalizedSocial {
  return {
    instagram: trimToNull(social.instagram),
    tiktok: trimToNull(social.tiktok),
    facebook: trimToNull(social.facebook),
    linkedin: trimToNull(social.linkedin),
    youtube: trimToNull(social.youtube),
    whatsapp: trimToNull(social.whatsapp),
    extra: social.extra.flatMap((item) => {
      const url = trimToNull(item.url);
      if (!url) return [];
      return [
        {
          id: item.id,
          label: trimToNull(item.label),
          url: normalizeHttpUrl(url) ?? url,
        },
      ];
    }),
  };
}

export function normalizeProject(project: Project): NormalizedProject {
  return {
    id: project.id,
    brand: {
      name: project.brand.name.trim(),
      claim: trimToNull(project.brand.claim),
      category: trimToNull(project.brand.category),
    },
    logo: project.logo,
    media: {
      images: [...project.media.images],
      videos: [...project.media.videos],
    },
    about: normalizeAbout(project.about),
    services: project.services.flatMap((item) => {
      const next = normalizeService(item);
      return next ? [next] : [];
    }),
    person: project.person ? normalizePerson(project.person) : null,
    team: project.team.flatMap((item) => {
      const next = normalizePerson(item);
      return next ? [next] : [];
    }),
    contact: normalizeContact(project.contact),
    social: normalizeSocial(project.social),
    cta: {
      intent: project.cta.intent,
      label: trimToNull(project.cta.label),
    },
    style: { ...project.style },
  };
}
