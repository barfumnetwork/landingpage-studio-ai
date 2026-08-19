import type { AssetFile, AssetMapItem, ConceptId, Project } from '../../types/project';
import { normalizeProject } from '../normalize/normalizeProject';
import { extraVideoSlot, gallerySlot, serviceSlot, SLOTS, teamSlot } from '../schema/ids';
import type { AssetMappingResult, NormalizedProject } from '../schema/types';
import {
  findAsset,
  heroRecommendation,
  isLandscape,
  isPortrait,
  isWide,
  mapItem,
  shuffleDeterministic,
  unusedAssets,
} from './assetHelpers';
import { pickHeroAsset, pickPortraitOrNext } from './assetScoring';

const GALLERY_MIN = 3;
const GALLERY_MAX = 8;
const REUSE_NOTE = 'Reused because no second suitable image exists.';

function collectExplicitImageIds(project: NormalizedProject): string[] {
  const ids: string[] = [];
  if (project.person?.imageId) ids.push(project.person.imageId);
  for (const member of project.team) {
    if (member.imageId) ids.push(member.imageId);
  }
  for (const service of project.services) {
    if (service.imageId) ids.push(service.imageId);
  }
  return ids.filter((id) => project.media.images.some((image) => image.id === id));
}

function mapLogo(project: NormalizedProject): AssetMapItem {
  const { selected, transparent, original } = project.logo;
  if (selected === 'transparent' && transparent) {
    return mapItem(
      SLOTS.logoMain,
      transparent.id,
      false,
      'auto',
      'auto',
      'Selected transparent logo.',
    );
  }
  if (original) {
    return mapItem(SLOTS.logoMain, original.id, false, 'auto', 'auto', 'Original logo.');
  }
  return mapItem(
    SLOTS.logoMain,
    null,
    false,
    'auto',
    'auto',
    'No logo uploaded. Renderer uses the brand name.',
  );
}

function heroNote(
  conceptId: ConceptId,
  asset: AssetFile | null,
  reused: boolean,
): string {
  if (!asset) return 'No suitable image uploaded.';
  if (reused) return REUSE_NOTE;
  if (conceptId === 'reel' && isWide(asset.aspect)) return 'Best available wide image.';
  if (isLandscape(asset.aspect)) return 'Best available landscape image.';
  if (isPortrait(asset.aspect)) {
    return conceptId === 'chamber' || conceptId === 'signal'
      ? 'Portrait used because no suitable landscape image exists.'
      : 'Best available image.';
  }
  return 'Best available image.';
}

function videoHeroNote(conceptId: ConceptId): string {
  switch (conceptId) {
    case 'reel':
      return 'VIDEO_01 mapped to VIDEO_HERO.';
    case 'chamber':
      return 'VIDEO_01 may be used as a video plane.';
    case 'atelier':
      return 'VIDEO_01 for the video section.';
    case 'signal':
      return 'VIDEO_01 as media module.';
    case 'imprint':
      return 'Video as plate media.';
  }
}

function take(used: Set<string>, asset: AssetFile | null): void {
  if (asset) used.add(asset.id);
}

export function mapAssetsFromNormalized(
  project: NormalizedProject,
  conceptId: ConceptId,
  options?: { jitterSeed?: number },
): AssetMappingResult {
  const images = project.media.images;
  const videos = project.media.videos;
  const used = new Set<string>(collectExplicitImageIds(project));
  const items: AssetMapItem[] = [];

  items.push(mapLogo(project));

  const unusedForHero = unusedAssets(images, used);
  let hero = pickHeroAsset(unusedForHero, images, conceptId);
  let heroReused = false;
  if (!hero && images.length > 0) {
    hero = pickHeroAsset(images, images, conceptId);
    heroReused = true;
  }
  if (hero && !heroReused) take(used, hero);
  const heroRec = heroRecommendation(conceptId, hero);
  items.push(
    mapItem(
      SLOTS.imageHero,
      hero?.id ?? null,
      true,
      heroRec.ratio,
      heroRec.px,
      heroNote(conceptId, hero, heroReused),
    ),
  );

  if (project.person) {
    const explicit = findAsset(images, project.person.imageId);
    const picked = explicit ?? pickPortraitOrNext(unusedAssets(images, used));
    if (picked && !explicit) take(used, picked);
    items.push(
      mapItem(
        SLOTS.person,
        picked?.id ?? null,
        false,
        '4:5',
        '1600x2000',
        explicit
          ? 'Explicit person image.'
          : picked
            ? 'Best available portrait for person.'
            : 'No person image uploaded.',
      ),
    );
  }

  project.team.forEach((member, index) => {
    const explicit = findAsset(images, member.imageId);
    const picked = explicit ?? pickPortraitOrNext(unusedAssets(images, used));
    if (picked && !explicit) take(used, picked);
    items.push(
      mapItem(
        teamSlot(index),
        picked?.id ?? null,
        false,
        '4:5',
        '1600x2000',
        explicit
          ? `Explicit team image for ${member.id}.`
          : picked
            ? 'Remaining portrait for team member.'
            : 'No team image uploaded.',
      ),
    );
  });

  project.services.forEach((service, index) => {
    const explicit = findAsset(images, service.imageId);
    const remaining = unusedAssets(images, used);
    const picked = explicit ?? remaining[0] ?? null;
    if (picked && !explicit) take(used, picked);
    items.push(
      mapItem(
        serviceSlot(index),
        picked?.id ?? null,
        false,
        '4:3',
        '1600x1200',
        explicit
          ? `Explicit image for ${service.id}.`
          : picked
            ? 'Next remaining image for this service.'
            : 'Image recommended for this service.',
      ),
    );
  });

  const unusedForAbout = unusedAssets(images, used);
  let about = pickPortraitOrNext(unusedForAbout);
  let aboutReused = false;
  if (!about && hero) {
    about = hero;
    aboutReused = true;
  } else if (about && about.id === hero?.id) {
    aboutReused = true;
  }
  if (about && !aboutReused) take(used, about);
  items.push(
    mapItem(
      SLOTS.imageAbout,
      about?.id ?? null,
      false,
      '4:5',
      '1600x2000',
      aboutReused
        ? REUSE_NOTE
        : about
          ? isPortrait(about.aspect)
            ? 'Portrait preferred for about.'
            : 'Next remaining image for about.'
          : 'No suitable image uploaded.',
    ),
  );

  const remaining = unusedAssets(images, used);
  const ordered =
    options?.jitterSeed !== undefined
      ? shuffleDeterministic(remaining, options.jitterSeed)
      : remaining;
  const gallery = ordered.slice(0, GALLERY_MAX);
  const galleryAssetIds =
    gallery.length >= GALLERY_MIN ? gallery.map((item) => item.id) : [];
  if (galleryAssetIds.length >= GALLERY_MIN) {
    galleryAssetIds.forEach((id, index) => {
      items.push(
        mapItem(
          gallerySlot(index),
          id,
          false,
          '3:2',
          '1800x1200',
          options?.jitterSeed !== undefined
            ? 'Remaining image after priority mapping (regenerate order).'
            : 'Remaining image after priority mapping, user order.',
        ),
      );
    });
  }

  const videoHero = videos[0] ?? null;
  items.push(
    mapItem(
      SLOTS.videoHero,
      videoHero?.id ?? null,
      false,
      '16:9',
      '1920x1080',
      videoHero ? videoHeroNote(conceptId) : 'No video uploaded.',
    ),
  );
  const videoStory = videos[1] ?? null;
  if (videos.length >= 2) {
    items.push(
      mapItem(
        SLOTS.videoStory,
        videoStory?.id ?? null,
        false,
        '16:9',
        '1920x1080',
        'Second uploaded video.',
      ),
    );
  }
  videos.slice(2).forEach((video, index) => {
    items.push(
      mapItem(
        extraVideoSlot(index + 2),
        video.id,
        false,
        '16:9',
        '1920x1080',
        'Additional uploaded video.',
      ),
    );
  });

  return { items, galleryAssetIds };
}

export function mapAssets(
  project: Project,
  conceptId: ConceptId,
  seed?: number,
): AssetMappingResult {
  return mapAssetsFromNormalized(normalizeProject(project), conceptId, {
    jitterSeed: seed,
  });
}
