import type {
  About,
  Brand,
  Contact,
  Cta,
  LogoState,
  MediaState,
  Project,
  Social,
  Style,
} from '../types/project';

export type ProjectPatch = Partial<
  Omit<
    Project,
    'brand' | 'logo' | 'media' | 'about' | 'contact' | 'social' | 'cta' | 'style'
  >
> & {
  brand?: Partial<Brand>;
  logo?: Partial<LogoState>;
  media?: Partial<MediaState>;
  about?: Partial<About>;
  contact?: Partial<Contact>;
  social?: Partial<Social>;
  cta?: Partial<Cta>;
  style?: Partial<Style>;
};

export function mergeProject(current: Project, partial: ProjectPatch): Project {
  return {
    ...current,
    ...partial,
    brand: mergeBrand(current.brand, partial.brand),
    logo: mergeLogo(current.logo, partial.logo),
    media: mergeMedia(current.media, partial.media),
    about: mergeAbout(current.about, partial.about),
    contact: mergeContact(current.contact, partial.contact),
    social: mergeSocial(current.social, partial.social),
    cta: mergeCta(current.cta, partial.cta),
    style: mergeStyle(current.style, partial.style),
    savedAt: new Date().toISOString(),
  };
}

function mergeBrand(current: Brand, partial: Partial<Brand> | undefined): Brand {
  return partial ? { ...current, ...partial } : current;
}

function mergeLogo(
  current: LogoState,
  partial: Partial<LogoState> | undefined,
): LogoState {
  return partial ? { ...current, ...partial } : current;
}

function mergeMedia(
  current: MediaState,
  partial: Partial<MediaState> | undefined,
): MediaState {
  if (!partial) return current;
  return {
    images: partial.images ?? current.images,
    videos: partial.videos ?? current.videos,
  };
}

function mergeAbout(current: About, partial: Partial<About> | undefined): About {
  return partial ? { ...current, ...partial } : current;
}

function mergeContact(current: Contact, partial: Partial<Contact> | undefined): Contact {
  return partial ? { ...current, ...partial } : current;
}

function mergeSocial(current: Social, partial: Partial<Social> | undefined): Social {
  if (!partial) return current;
  return {
    ...current,
    ...partial,
    extra: partial.extra ?? current.extra,
  };
}

function mergeCta(current: Cta, partial: Partial<Cta> | undefined): Cta {
  return partial ? { ...current, ...partial } : current;
}

function mergeStyle(current: Style, partial: Partial<Style> | undefined): Style {
  return partial ? { ...current, ...partial } : current;
}
