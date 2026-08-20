export interface CampaignStill {
  webp: string;
  jpg: string;
}

export const CAMPAIGN = {
  chamber: {
    architecture: {
      webp: '/assets/concepts/chamber/architecture.webp',
      jpg: '/assets/concepts/chamber/architecture.jpg',
    },
  },
  atelier: {
    figure: {
      webp: '/assets/concepts/atelier/figure.webp',
      jpg: '/assets/concepts/atelier/figure.jpg',
    },
    materials: {
      webp: '/assets/concepts/atelier/materials.webp',
      jpg: '/assets/concepts/atelier/materials.jpg',
    },
    interior: {
      webp: '/assets/concepts/atelier/interior.webp',
      jpg: '/assets/concepts/atelier/interior.jpg',
    },
  },
  signal: {
    atmosphere: {
      webp: '/assets/concepts/signal/atmosphere.webp',
      jpg: '/assets/concepts/signal/atmosphere.jpg',
    },
  },
  reel: {
    frames: [
      {
        webp: '/assets/concepts/reel/frame-01.webp',
        jpg: '/assets/concepts/reel/frame-01.jpg',
      },
      {
        webp: '/assets/concepts/reel/frame-02.webp',
        jpg: '/assets/concepts/reel/frame-02.jpg',
      },
      {
        webp: '/assets/concepts/reel/frame-03.webp',
        jpg: '/assets/concepts/reel/frame-03.jpg',
      },
      {
        webp: '/assets/concepts/reel/frame-04.webp',
        jpg: '/assets/concepts/reel/frame-04.jpg',
      },
    ] satisfies CampaignStill[],
  },
  imprint: {
    paper: {
      webp: '/assets/concepts/imprint/paper.webp',
      jpg: '/assets/concepts/imprint/paper.jpg',
    },
  },
} as const;
