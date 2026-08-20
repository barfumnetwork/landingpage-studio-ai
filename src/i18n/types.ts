export interface UiCopy {
  appName: string;
  saved: string;
  saving: string;
  storageUnavailable: string;
  assetDbUnavailable: string;
  a11y: {
    skip: string;
    closeDialog: string;
    previousConcept: string;
    nextConcept: string;
  };
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
      logoPresent: string;
    };
    deleteService: { title: string; body: string; confirm: string };
    deleteMember: { title: string; body: string; confirm: string };
  };
  assets: {
    dropTitleLogo: string;
    dropTitleImages: string;
    dropTitleVideos: string;
    dropHint: string;
    dropFormatsLogo: string;
    dropFormatsImages: string;
    dropFormatsVideos: string;
    browse: string;
    addMoreImages: string;
    addMoreVideos: string;
    unsupported: string;
    tooLarge: string;
    readError: string;
    quota: string;
    useOriginal: string;
    useTransparent: string;
    uploadTransparent: string;
    originalPanel: string;
    transparentPanel: string;
    processing: string;
    processingHint: string;
    knockoutFailed: string;
    knockoutFailedHint: string;
    knockoutTimeout: string;
    retry: string;
    svgHint: string;
    liveProcessing: string;
    liveReady: string;
    liveFailed: string;
    liveTimeout: string;
    deleteLogoTitle: string;
    deleteLogoBody: string;
    replaceLogo: string;
    replaceLogoTitle: string;
    replaceLogoBody: string;
    deleteVideoTitle: string;
    deleteVideoBody: string;
    undo: string;
    imageRemoved: string;
    missingBlob: string;
    moveUp: string;
    moveDown: string;
  };
  generation: {
    phases: Array<{ label: string; text: string }>;
    errorTitle: string;
    errorBody: string;
    retry: string;
    backToReview: string;
    recoveryTitle: string;
    recoveryBody: string;
    livePhase: string;
    liveReady: string;
    liveError: string;
    liveInterrupted: string;
  };
  gallery: {
    eyebrow: string;
    view: string;
    fullscreen: string;
    select: string;
    regenerate: string;
    selected: string;
    exportSite: string;
    exportAll: string;
    exportSoon: string;
    openSite: string;
    closeSite: string;
    closePreview: string;
    regenerateError: string;
    missingConcept: string;
    missingImage: string;
    sections: string;
    videoHint: string;
    updating: string;
    placeholder: string;
    play: string;
    pause: string;
    filterAll: string;
    filterLabel: string;
    tools: string;
    index: string;
    actions: string;
    filmFor: string;
    world: Record<'chamber' | 'atelier' | 'signal' | 'reel' | 'imprint', string>;
    names: Record<'chamber' | 'atelier' | 'signal' | 'reel' | 'imprint', string>;
    sectionLabels: Record<string, string>;
  };
  export: {
    siteMissing: string;
    chooserHint: string;
    preparing: string;
    failed: string;
    unavailable: string;
    needSelect: string;
  };
  renderer: {
    loading: string;
    failed: string;
    backToGallery: string;
    unimplemented: string;
    placeholder: string;
    atelierNav: {
      about: string;
      work: string;
      services: string;
      contact: string;
    };
    signalNav: {
      about: string;
      services: string;
      work: string;
      video: string;
      team: string;
      contact: string;
    };
    reelNav: {
      about: string;
      work: string;
      services: string;
      video: string;
      team: string;
      contact: string;
    };
    imprintNav: {
      about: string;
      work: string;
      services: string;
      video: string;
      team: string;
      contact: string;
    };
  };
}

export type Locale = 'de';
