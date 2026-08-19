import type { CtaIntent, Project } from '../../types/project';
import { normalizeProject } from '../normalize/normalizeProject';
import { digitsOnly, isValidEmail, normalizeHttpUrl } from '../normalize/text';
import { hasAboutData } from '../planning/assignContent';
import type { CtaTarget, CtaTargetKind, NormalizedProject } from '../schema/types';

function target(
  intent: CtaIntent,
  label: string | null,
  href: string | null,
  kind: CtaTargetKind,
): CtaTarget {
  return {
    intent,
    label,
    href,
    kind,
    renderable: href !== null,
  };
}

function mailto(email: string | null): string | null {
  if (!email || !isValidEmail(email)) return null;
  return `mailto:${email}`;
}

function telHref(phone: string | null): string | null {
  if (!phone) return null;
  const compact = phone.replace(/\s+/g, '');
  return compact.length > 0 ? `tel:${compact}` : null;
}

function whatsappHref(value: string | null): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const digits = digitsOnly(value);
  if (digits.length === 0) return null;
  return `https://wa.me/${digits}`;
}

function websiteHref(website: string | null): string | null {
  if (!website) return null;
  return normalizeHttpUrl(website);
}

export function resolveCtaTargetFromNormalized(project: NormalizedProject): CtaTarget {
  const intent = project.cta.intent;
  const label = project.cta.label;
  const contact = project.contact;

  switch (intent) {
    case 'contact': {
      const emailHref = mailto(contact.email);
      if (emailHref) return target(intent, label, emailHref, 'mailto');
      return target(intent, label, '#contact', 'hash');
    }
    case 'whatsapp':
      return target(intent, label, whatsappHref(contact.whatsapp), 'whatsapp');
    case 'call':
      return target(intent, label, telHref(contact.phone), 'tel');
    case 'book': {
      const site = websiteHref(contact.website);
      if (site) return target(intent, label, site, 'url');
      return target(intent, label, '#contact', 'hash');
    }
    case 'buy':
      return target(intent, label, websiteHref(contact.website), 'url');
    case 'learn':
      return target(intent, label, hasAboutData(project) ? '#about' : '#contact', 'hash');
    case 'request':
      return target(intent, label, '#contact', 'hash');
    case 'website':
      return target(intent, label, websiteHref(contact.website), 'url');
    case 'custom':
      return target(intent, label, null, 'none');
  }
}

export function resolveCtaTarget(project: Project): CtaTarget {
  return resolveCtaTargetFromNormalized(normalizeProject(project));
}
