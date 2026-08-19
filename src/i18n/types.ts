export interface UiCopy {
  appName: string;
  saved: string;
  saving: string;
  storageUnavailable: string;
  welcome: {
    headline: string;
    subline: string;
    create: string;
    continue: string;
    newProject: string;
    demo: string;
    autosaveHint: string;
  };
  confirm: {
    title: string;
    body: string;
    cancel: string;
    confirm: string;
  };
  leave: {
    title: string;
    body: string;
    cancel: string;
    confirm: string;
  };
  corrupt: {
    title: string;
    restart: string;
    discard: string;
  };
  wizard: {
    back: string;
    next: string;
    skip: string;
    generate: string;
    optional: string;
    add: string;
    remove: string;
    editStep: string;
    present: string;
    missing: string;
    steps: {
      brand: { question: string; name: string; claim: string; category: string };
      logo: { question: string; empty: string; formats: string; skip: string };
      images: { question: string; empty: string };
      videos: { question: string; empty: string; hint: string };
      about: {
        question: string;
        description: string;
        story: string;
        mission: string;
        vision: string;
        aboutText: string;
        helper: string;
      };
      services: {
        question: string;
        name: string;
        description: string;
        price: string;
        add: string;
        emptyHint: string;
      };
      team: {
        question: string;
        helper: string;
        name: string;
        role: string;
        description: string;
        story: string;
        add: string;
      };
      contact: { question: string };
      social: { question: string; extraLabel: string; extraUrl: string; add: string };
      cta: { question: string; label: string };
      style: { question: string; theme: string };
      review: {
        question: string;
        brand: string;
        media: string;
        content: string;
        contact: string;
        social: string;
        cta: string;
        style: string;
      };
    };
    contact: {
      email: string;
      phone: string;
      whatsapp: string;
      address: string;
      city: string;
      country: string;
      website: string;
      hours: string;
    };
    social: {
      instagram: string;
      tiktok: string;
      facebook: string;
      linkedin: string;
      youtube: string;
      whatsapp: string;
    };
    ctaIntents: Record<
      | 'contact'
      | 'whatsapp'
      | 'call'
      | 'book'
      | 'buy'
      | 'learn'
      | 'request'
      | 'website'
      | 'custom',
      string
    >;
    themes: Record<'light' | 'dark' | 'auto', string>;
    errors: {
      email: string;
      url: string;
      brandName: string;
      description: string;
    };
    review: {
      logoCount: string;
      imageCount: string;
      videoCount: string;
      serviceCount: string;
      about: string;
      description: string;
      links: string;
    };
    deleteService: { title: string; body: string; confirm: string };
    deleteMember: { title: string; body: string; confirm: string };
  };
}

export type Locale = 'de';
