import { createEmptyProject } from '../../store/createEmptyProject';
import type {
  AssetFile,
  ConceptId,
  Project,
  SectionPlanItem,
  Service,
} from '../../types/project';
import { generateProjectConcepts } from '../generateProjectConcepts';
import { regenerateConcept } from '../concepts/regenerateConcept';
import { mapAssets } from '../mapping/mapAssets';
import { resolveCtaTarget } from '../cta/resolveCtaTarget';
import { normalizeProject } from '../normalize/normalizeProject';

export interface QaCheck {
  id: string;
  pass: boolean;
  detail: string;
}

function image(id: string, width: number, height: number): AssetFile {
  return {
    id,
    kind: 'image',
    mime: 'image/jpeg',
    name: `${id}.jpg`,
    size: 180_000,
    width,
    height,
    aspect: width / height,
    blobKey: `blob_${id}`,
  };
}

function video(id: string): AssetFile {
  return {
    id,
    kind: 'video',
    mime: 'video/mp4',
    name: `${id}.mp4`,
    size: 2_000_000,
    width: 1920,
    height: 1080,
    aspect: 16 / 9,
    blobKey: `blob_${id}`,
  };
}

function logo(id: 'LOGO_ORIGINAL' | 'LOGO_TRANSPARENT'): AssetFile {
  return {
    id,
    kind: 'logo',
    mime: 'image/png',
    name: `${id.toLowerCase()}.png`,
    size: 40_000,
    width: 800,
    height: 200,
    aspect: 4,
    blobKey: `blob_${id}`,
  };
}

function base(id: string): Project {
  const project = createEmptyProject(id);
  return {
    ...project,
    brand: { ...project.brand, name: 'NOIR' },
    about: {
      ...project.about,
      description: 'Eine kreative Marke.',
    },
  };
}

function enabled(plan: SectionPlanItem[], section: string): boolean {
  return plan.find((item) => item.section === section)?.enabled === true;
}

function slot(
  concept: { assetMap: { slot: string; assetId: string | null }[] },
  name: string,
) {
  return concept.assetMap.find((item) => item.slot === name)?.assetId ?? null;
}

function mappingKey(concept: {
  seed: number;
  sectionPlan: SectionPlanItem[];
  assetMap: { slot: string; assetId: string | null; note: string }[];
}): string {
  return JSON.stringify({
    seed: concept.seed,
    sectionPlan: concept.sectionPlan,
    assetMap: concept.assetMap,
  });
}

function check(id: string, pass: boolean, detail: string): QaCheck {
  return { id, pass, detail };
}

const FORBIDDEN_SECTIONS = [
  'faq',
  'testimonials',
  'proof',
  'awards',
  'clients',
  'partners',
];

export function runPhase6Scenarios(): QaCheck[] {
  const checks: QaCheck[] = [];

  const minimal = generateProjectConcepts(base('prj_min'));
  const minPlan = minimal.concepts[0]?.sectionPlan ?? [];
  checks.push(
    check(
      'A-minimal',
      Boolean(
        minimal.ok &&
        enabled(minPlan, 'hero') &&
        enabled(minPlan, 'nav') &&
        enabled(minPlan, 'about') &&
        enabled(minPlan, 'cta') &&
        enabled(minPlan, 'footer') &&
        !enabled(minPlan, 'services') &&
        !enabled(minPlan, 'gallery') &&
        !enabled(minPlan, 'video') &&
        !enabled(minPlan, 'team') &&
        !enabled(minPlan, 'contact') &&
        slot(minimal.concepts[0]!, 'IMAGE_HERO') === null,
      ),
      `ok=${minimal.ok} sections=${minPlan
        .filter((item) => item.enabled)
        .map((item) => item.section)
        .join(',')}`,
    ),
  );

  const withServices: Project = {
    ...base('prj_svc'),
    services: [
      { id: 'SVC_01', name: 'Atelier', description: 'One', price: '120', imageId: null },
      { id: 'SVC_02', name: 'Commission', description: '', price: '', imageId: null },
      { id: 'SVC_03', name: 'Edit', description: 'Two', price: '', imageId: null },
      { id: 'SVC_04', name: '   ', description: 'ignored', price: '99', imageId: null },
    ],
  };
  const svc = generateProjectConcepts(withServices);
  const svcNorm = normalizeProject(withServices);
  checks.push(
    check(
      'B-services',
      Boolean(
        svc.ok &&
        enabled(svc.concepts[0]!.sectionPlan, 'services') &&
        svcNorm.services.length === 3 &&
        svcNorm.services[0]?.price === '120',
      ),
      `validServices=${svcNorm.services.length} price=${svcNorm.services[0]?.price ?? ''}`,
    ),
  );

  const fiveImages: Project = {
    ...base('prj_img5'),
    media: {
      images: [
        image('IMAGE_01', 800, 1200),
        image('IMAGE_02', 2400, 1350),
        image('IMAGE_03', 2000, 1500),
        image('IMAGE_04', 3000, 2000),
        image('IMAGE_05', 900, 1200),
      ],
      videos: [],
    },
  };
  const five = generateProjectConcepts(fiveImages);
  const chamber = five.concepts.find((item) => item.id === 'chamber')!;
  const hero = slot(chamber, 'IMAGE_HERO');
  const about = slot(chamber, 'IMAGE_ABOUT');
  const galleryCount = chamber.assetMap.filter((item) =>
    item.slot.startsWith('GALLERY_'),
  ).length;
  checks.push(
    check(
      'C-five-images',
      Boolean(
        five.ok &&
        hero === 'IMAGE_04' &&
        about !== hero &&
        about !== null &&
        enabled(chamber.sectionPlan, 'gallery') &&
        galleryCount >= 3,
      ),
      `hero=${hero} about=${about} gallery=${galleryCount}`,
    ),
  );

  const oneImage: Project = {
    ...base('prj_img1'),
    media: { images: [image('IMAGE_01', 2400, 1350)], videos: [] },
  };
  const one = generateProjectConcepts(oneImage);
  const oneChamber = one.concepts[0]!;
  checks.push(
    check(
      'D-one-image',
      Boolean(
        slot(oneChamber, 'IMAGE_HERO') === 'IMAGE_01' &&
        slot(oneChamber, 'IMAGE_ABOUT') === 'IMAGE_01' &&
        oneChamber.assetMap.some(
          (item) =>
            item.slot === 'IMAGE_ABOUT' &&
            item.note === 'Reused because no second suitable image exists.',
        ) &&
        !enabled(oneChamber.sectionPlan, 'gallery'),
      ),
      `hero=${slot(oneChamber, 'IMAGE_HERO')} about=${slot(oneChamber, 'IMAGE_ABOUT')}`,
    ),
  );

  const withVideo: Project = {
    ...base('prj_vid'),
    media: { images: [], videos: [video('VIDEO_01'), video('VIDEO_02')] },
  };
  const vid = generateProjectConcepts(withVideo);
  const reel = vid.concepts.find((item) => item.id === 'reel')!;
  checks.push(
    check(
      'E-video',
      Boolean(
        enabled(reel.sectionPlan, 'video') &&
        slot(reel, 'VIDEO_HERO') === 'VIDEO_01' &&
        slot(reel, 'VIDEO_STORY') === 'VIDEO_02',
      ),
      `video=${enabled(reel.sectionPlan, 'video')} hero=${slot(reel, 'VIDEO_HERO')}`,
    ),
  );

  const withTeam: Project = {
    ...base('prj_team'),
    person: {
      id: 'PER_01',
      name: 'Ada',
      role: 'Lead',
      description: '',
      story: '',
      imageId: null,
    },
    team: [
      { id: 'TEAM_01', name: 'Bea', role: '', description: '', story: '', imageId: null },
      {
        id: 'TEAM_02',
        name: 'Cara',
        role: '',
        description: '',
        story: '',
        imageId: null,
      },
      {
        id: 'TEAM_03',
        name: '  ',
        role: 'Ghost',
        description: '',
        story: '',
        imageId: null,
      },
    ],
  };
  const team = generateProjectConcepts(withTeam);
  const teamNorm = normalizeProject(withTeam);
  checks.push(
    check(
      'F-team',
      Boolean(
        enabled(team.concepts[0]!.sectionPlan, 'team') &&
        teamNorm.person?.name === 'Ada' &&
        teamNorm.team.length === 2,
      ),
      `teamEnabled=${enabled(team.concepts[0]!.sectionPlan, 'team')} members=${teamNorm.team.length}`,
    ),
  );

  const withMail: Project = {
    ...base('prj_mail'),
    contact: { ...base('prj_mail').contact, email: 'studio@noir.example' },
    cta: { intent: 'contact', label: 'Kontakt' },
  };
  const mail = generateProjectConcepts(withMail);
  checks.push(
    check(
      'G-contact-mailto',
      Boolean(
        enabled(mail.concepts[0]!.sectionPlan, 'contact') &&
        mail.cta?.href === 'mailto:studio@noir.example' &&
        mail.cta.renderable,
      ),
      `href=${mail.cta?.href ?? 'null'}`,
    ),
  );

  const wa: Project = {
    ...base('prj_wa'),
    cta: { intent: 'whatsapp', label: 'WhatsApp' },
  };
  const waResult = generateProjectConcepts(wa);
  const waTarget = resolveCtaTarget(wa);
  checks.push(
    check(
      'H-whatsapp-empty',
      Boolean(!waTarget.renderable && waTarget.href === null && waResult.ok),
      `renderable=${waTarget.renderable} href=${waTarget.href ?? 'null'}`,
    ),
  );

  const emptyAssets = generateProjectConcepts(base('prj_empty_assets'));
  const emptyMap = emptyAssets.concepts[0]!.assetMap;
  checks.push(
    check(
      'I-empty-assets',
      Boolean(
        slot(emptyAssets.concepts[0]!, 'IMAGE_HERO') === null &&
        slot(emptyAssets.concepts[0]!, 'LOGO_MAIN') === null &&
        emptyMap.every((item) => item.assetId === null),
      ),
      `nullSlots=${emptyMap.filter((item) => item.assetId === null).length}/${emptyMap.length}`,
    ),
  );

  const detA = generateProjectConcepts(fiveImages, {
    generatedAt: '2026-01-01T00:00:00.000Z',
  });
  const detB = generateProjectConcepts(fiveImages, {
    generatedAt: '2026-01-01T00:00:00.000Z',
  });
  checks.push(
    check(
      'J-determinism',
      detA.concepts.map(mappingKey).join('|') === detB.concepts.map(mappingKey).join('|'),
      'same input + same generatedAt → identical plans',
    ),
  );

  const before = generateProjectConcepts(fiveImages, {
    generatedAt: '2026-01-01T00:00:00.000Z',
  });
  const regenerated = regenerateConcept(
    fiveImages,
    'chamber',
    before.concepts[0]!.seed + 1,
    '2026-01-02T00:00:00.000Z',
  );
  checks.push(
    check(
      'J-regenerate-hero-stable',
      Boolean(
        regenerated.seed !== before.concepts[0]!.seed &&
        slot(regenerated, 'IMAGE_HERO') === slot(before.concepts[0]!, 'IMAGE_HERO'),
      ),
      `seed ${before.concepts[0]!.seed} → ${regenerated.seed} hero=${slot(regenerated, 'IMAGE_HERO')}`,
    ),
  );

  const logoProject: Project = {
    ...base('prj_logo'),
    logo: {
      original: logo('LOGO_ORIGINAL'),
      transparent: logo('LOGO_TRANSPARENT'),
      selected: 'transparent',
      status: 'ready',
    },
  };
  const logoPlan = generateProjectConcepts(logoProject);
  checks.push(
    check(
      'logo-transparent',
      slot(logoPlan.concepts[0]!, 'LOGO_MAIN') === 'LOGO_TRANSPARENT',
      `logo=${slot(logoPlan.concepts[0]!, 'LOGO_MAIN')}`,
    ),
  );

  const callProject: Project = {
    ...base('prj_call'),
    contact: { ...base('prj_call').contact, phone: '+49 30 123' },
    cta: { intent: 'call', label: 'Anrufen' },
  };
  const callTarget = resolveCtaTarget(callProject);
  checks.push(
    check(
      'cta-call',
      callTarget.href === 'tel:+4930123',
      `href=${callTarget.href ?? 'null'}`,
    ),
  );

  const buyProject: Project = {
    ...base('prj_buy'),
    cta: { intent: 'buy', label: 'Kaufen' },
  };
  const buyTarget = resolveCtaTarget(buyProject);
  checks.push(
    check(
      'cta-buy-missing',
      !buyTarget.renderable && buyTarget.href === null,
      'no dead buy button',
    ),
  );

  const forbidden = generateProjectConcepts(base('prj_fake'));
  const names = forbidden.concepts.flatMap((item) =>
    item.sectionPlan.map((entry) => entry.section),
  );
  checks.push(
    check(
      'no-fake-sections',
      FORBIDDEN_SECTIONS.every((name) => !names.includes(name)),
      `sections=${[...new Set(names)].join(',')}`,
    ),
  );

  const invalid = generateProjectConcepts(createEmptyProject('prj_bad'));
  checks.push(
    check(
      'validation',
      !invalid.ok &&
        invalid.errors.some((item) => item.code === 'brand.name') &&
        invalid.errors.some((item) => item.code === 'about.description'),
      invalid.errors.map((item) => item.code).join(','),
    ),
  );

  const allIds: ConceptId[] = ['chamber', 'atelier', 'signal', 'reel', 'imprint'];
  checks.push(
    check(
      'five-concepts',
      Boolean(
        five.ok && allIds.every((id) => five.concepts.some((item) => item.id === id)),
      ),
      five.concepts.map((item) => item.id).join(','),
    ),
  );

  const mapped = mapAssets(fiveImages, 'reel');
  checks.push(
    check(
      'mapAssets-pure',
      mapped.items.some((item) => item.slot === 'IMAGE_HERO' && item.assetId !== null),
      `slots=${mapped.items.length}`,
    ),
  );

  const services: Service[] = withServices.services;
  checks.push(
    check('service-count-input', services.length === 4, 'raw list still has unnamed row'),
  );

  return checks;
}

export function formatQaReport(checks: QaCheck[]): string {
  const failed = checks.filter((item) => !item.pass);
  const lines = checks.map(
    (item) => `${item.pass ? 'PASS' : 'FAIL'}  ${item.id} — ${item.detail}`,
  );
  lines.push('');
  lines.push(`Total ${checks.length}, failed ${failed.length}`);
  return lines.join('\n');
}
