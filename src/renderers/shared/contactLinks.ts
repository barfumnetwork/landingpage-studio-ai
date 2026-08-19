import {
  digitsOnly,
  isValidEmail,
  normalizeHttpUrl,
} from '../../generator/normalize/text';
import type { Contact, Social } from '../../types/project';

export function emailHref(email: string): string | null {
  const trimmed = email.trim();
  if (!isValidEmail(trimmed)) return null;
  return `mailto:${trimmed}`;
}

export function phoneHref(phone: string): string | null {
  const compact = phone.trim().replace(/\s+/g, '');
  return compact.length > 0 ? `tel:${compact}` : null;
}

export function whatsappHref(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const digits = digitsOnly(trimmed);
  if (digits.length === 0) return null;
  return `https://wa.me/${digits}`;
}

export function websiteHref(website: string): string | null {
  return normalizeHttpUrl(website.trim());
}

export interface NamedLink {
  label: string;
  href: string;
}

export function socialLinks(social: Social): NamedLink[] {
  const named: Array<[string, string]> = [
    ['Instagram', social.instagram],
    ['TikTok', social.tiktok],
    ['Facebook', social.facebook],
    ['LinkedIn', social.linkedin],
    ['YouTube', social.youtube],
    ['WhatsApp', social.whatsapp],
  ];
  const links: NamedLink[] = [];
  for (const [label, value] of named) {
    const href = label === 'WhatsApp' ? whatsappHref(value) : websiteHref(value);
    if (href) links.push({ label, href });
  }
  for (const extra of social.extra) {
    const href = websiteHref(extra.url);
    if (!href) continue;
    links.push({ label: extra.label.trim() || href, href });
  }
  return links;
}

export function contactItems(contact: Contact): NamedLink[] {
  const items: NamedLink[] = [];
  const mail = emailHref(contact.email);
  if (mail) items.push({ label: contact.email.trim(), href: mail });
  const tel = phoneHref(contact.phone);
  if (tel) items.push({ label: contact.phone.trim(), href: tel });
  const wa = whatsappHref(contact.whatsapp);
  if (wa) items.push({ label: contact.whatsapp.trim(), href: wa });
  const web = websiteHref(contact.website);
  if (web) items.push({ label: contact.website.trim(), href: web });
  return items;
}
