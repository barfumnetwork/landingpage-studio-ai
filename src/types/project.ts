export type ProjectPhase =
  'welcome' | 'wizard' | 'generating' | 'gallery' | 'selected' | 'exported';

export type LogoStatus = 'idle' | 'processing' | 'ready' | 'failed';

export type LogoSelected = 'original' | 'transparent';

export type AssetKind = 'image' | 'video' | 'logo' | 'svg';

export type CtaIntent =
  | 'contact'
  | 'whatsapp'
  | 'call'
  | 'book'
  | 'buy'
  | 'learn'
  | 'request'
  | 'website'
  | 'custom';

export type StyleDirection =
  | 'luxury'
  | 'minimal'
  | 'editorial'
  | 'modern'
  | 'dark'
  | 'elegant'
  | 'bold'
  | 'creative'
  | 'futuristic'
  | 'organic'
  | 'corporate';

export type StyleTheme = 'light' | 'dark' | 'auto';

export type ConceptId = 'chamber' | 'atelier' | 'signal' | 'reel' | 'imprint';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface AssetFile {
  id: string;
  kind: AssetKind;
  mime: string;
  name: string;
  size: number;
  width: number | null;
  height: number | null;
  aspect: number | null;
  blobKey: string;
}

export interface Brand {
  name: string;
  claim: string;
  category: string;
}

export interface LogoState {
  original: AssetFile | null;
  transparent: AssetFile | null;
  selected: LogoSelected;
  status: LogoStatus;
}

export interface MediaState {
  images: AssetFile[];
  videos: AssetFile[];
}

export interface About {
  description: string;
  story: string;
  mission: string;
  vision: string;
  aboutText: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: string;
  imageId: string | null;
}

export interface Person {
  id: string;
  name: string;
  role: string;
  description: string;
  story: string;
  imageId: string | null;
}

export interface Contact {
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  country: string;
  website: string;
  hours: string;
}

export interface SocialLink {
  id: string;
  label: string;
  url: string;
}

export interface Social {
  instagram: string;
  tiktok: string;
  facebook: string;
  linkedin: string;
  youtube: string;
  whatsapp: string;
  extra: SocialLink[];
}

export interface Cta {
  intent: CtaIntent;
  label: string;
}

export interface Style {
  direction: StyleDirection;
  theme: StyleTheme;
}

export interface SectionPlanItem {
  section: string;
  enabled: boolean;
  reason: 'always' | 'has-data' | 'skipped-empty';
}

export interface AssetMapItem {
  slot: string;
  assetId: string | null;
  required: boolean;
  recommendedRatio: string;
  recommendedPx: string;
  note: string;
}

export interface GeneratedConcept {
  id: ConceptId;
  seed: number;
  sectionPlan: SectionPlanItem[];
  assetMap: AssetMapItem[];
  generatedAt: string;
}

export interface Project {
  id: string;
  version: 1;
  phase: ProjectPhase;
  stepIndex: number;
  savedAt: string | null;
  isDemo: boolean;
  brand: Brand;
  logo: LogoState;
  media: MediaState;
  about: About;
  services: Service[];
  person: Person | null;
  team: Person[];
  contact: Contact;
  social: Social;
  cta: Cta;
  style: Style;
  generatedConcepts: GeneratedConcept[];
  selectedConceptId: ConceptId | null;
}
