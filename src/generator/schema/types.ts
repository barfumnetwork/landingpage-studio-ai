import type {
  AssetFile,
  AssetMapItem,
  ConceptId,
  CtaIntent,
  GeneratedConcept,
  LogoState,
  Person,
  SectionPlanItem,
  Service,
  Style,
} from '../../types/project';

export type GenerationErrorCode = 'brand.name' | 'about.description' | 'project.missing';

export interface GenerationError {
  code: GenerationErrorCode;
}

export interface NormalizedBrand {
  name: string;
  claim: string | null;
  category: string | null;
}

export interface NormalizedAbout {
  description: string | null;
  story: string | null;
  mission: string | null;
  vision: string | null;
  aboutText: string | null;
}

export interface NormalizedContact {
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  hours: string | null;
}

export interface NormalizedSocialLink {
  id: string;
  label: string | null;
  url: string;
}

export interface NormalizedSocial {
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  linkedin: string | null;
  youtube: string | null;
  whatsapp: string | null;
  extra: NormalizedSocialLink[];
}

export interface NormalizedCta {
  intent: CtaIntent;
  label: string | null;
}

export interface NormalizedProject {
  id: string;
  brand: NormalizedBrand;
  logo: LogoState;
  media: {
    images: AssetFile[];
    videos: AssetFile[];
  };
  about: NormalizedAbout;
  services: Service[];
  person: Person | null;
  team: Person[];
  contact: NormalizedContact;
  social: NormalizedSocial;
  cta: NormalizedCta;
  style: Style;
}

export interface AssignedContent {
  heroSub: string | null;
  aboutLead: string | null;
  aboutBody: string | null;
  storyBody: string | null;
  mission: string | null;
  vision: string | null;
}

export type CtaTargetKind = 'mailto' | 'tel' | 'whatsapp' | 'url' | 'hash' | 'none';

export interface CtaTarget {
  intent: CtaIntent;
  label: string | null;
  href: string | null;
  kind: CtaTargetKind;
  renderable: boolean;
}

export interface AssetMappingResult {
  items: AssetMapItem[];
  galleryAssetIds: string[];
}

export interface GenerationPlanResult {
  ok: boolean;
  concepts: GeneratedConcept[];
  errors: GenerationError[];
  normalized: NormalizedProject | null;
  content: AssignedContent | null;
  cta: CtaTarget | null;
  sectionPlans: Record<ConceptId, SectionPlanItem[]> | null;
}
