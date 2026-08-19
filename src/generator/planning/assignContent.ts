import type { AssignedContent, NormalizedProject } from '../schema/types';

export function assignContent(project: NormalizedProject): AssignedContent {
  const { claim } = project.brand;
  const { description, aboutText, story, mission, vision } = project.about;

  return {
    heroSub: claim ?? description,
    aboutLead: description,
    aboutBody: aboutText,
    storyBody: story,
    mission,
    vision,
  };
}

export function hasAboutData(project: NormalizedProject): boolean {
  const { description, aboutText, story, mission, vision } = project.about;
  return Boolean(description || aboutText || story || mission || vision);
}

export function hasExclusiveStoryData(project: NormalizedProject): boolean {
  return Boolean(project.about.story || project.about.mission || project.about.vision);
}

export function hasContactData(project: NormalizedProject): boolean {
  const contact = project.contact;
  return Boolean(
    contact.email ||
    contact.phone ||
    contact.whatsapp ||
    contact.address ||
    contact.city ||
    contact.country ||
    contact.website ||
    contact.hours,
  );
}

export function hasTeamData(project: NormalizedProject): boolean {
  return project.person !== null || project.team.length > 0;
}
