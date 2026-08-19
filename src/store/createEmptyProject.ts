import type { Project } from '../types/project';

export function createProjectId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `prj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyProject(id = createProjectId()): Project {
  return {
    id,
    version: 1,
    phase: 'wizard',
    stepIndex: 0,
    savedAt: new Date().toISOString(),
    isDemo: false,
    brand: {
      name: '',
      claim: '',
      category: '',
    },
    logo: {
      original: null,
      transparent: null,
      selected: 'original',
      status: 'idle',
    },
    media: {
      images: [],
      videos: [],
    },
    about: {
      description: '',
      story: '',
      mission: '',
      vision: '',
      aboutText: '',
    },
    services: [],
    person: null,
    team: [],
    contact: {
      email: '',
      phone: '',
      whatsapp: '',
      address: '',
      city: '',
      country: '',
      website: '',
      hours: '',
    },
    social: {
      instagram: '',
      tiktok: '',
      facebook: '',
      linkedin: '',
      youtube: '',
      whatsapp: '',
      extra: [],
    },
    cta: {
      intent: 'contact',
      label: '',
    },
    style: {
      direction: 'luxury',
      theme: 'auto',
    },
    generatedConcepts: [],
    selectedConceptId: null,
  };
}
