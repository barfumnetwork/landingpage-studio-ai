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
  corrupt: {
    title: string;
    restart: string;
    discard: string;
  };
  placeholder: {
    created: string;
    wizardNext: string;
    demoLoaded: string;
    back: string;
  };
}

export type Locale = 'de';
