import type { Project, Service } from '../types/project';
import { createEmptyProject } from '../store/createEmptyProject';

const services: Service[] = [
  {
    id: 'SVC_01',
    name: 'Signature Atelier',
    description:
      'A private studio process for singular pieces — cut, material, and finish decided with you.',
    price: '',
    imageId: null,
  },
  {
    id: 'SVC_02',
    name: 'Private Commission',
    description:
      'One-of-one objects for interiors and wardrobes that should not look like anyone else’s.',
    price: '',
    imageId: null,
  },
  {
    id: 'SVC_03',
    name: 'Seasonal Edit',
    description:
      'A small, considered collection released rarely. Nothing extra. Nothing loud.',
    price: '',
    imageId: null,
  },
];

export function createNoirDemoProject(id: string): Project {
  const project = createEmptyProject(id);
  return {
    ...project,
    isDemo: true,
    brand: {
      name: 'NOIR',
      claim: 'Designed for the extraordinary.',
      category: 'Atelier',
    },
    about: {
      description:
        'NOIR creates considered objects and private commissions for people who prefer quiet luxury over noise.',
      story:
        'The house began as a study in restraint: fewer pieces, better materials, a longer life in the world.',
      mission: 'Design only what deserves to exist.',
      vision:
        'A smaller wardrobe. A quieter room. Work that still feels alive in ten years.',
      aboutText:
        'We work slowly, with a short list of materials and an even shorter list of clients. Every piece is made to be kept.',
    },
    services,
    cta: {
      intent: 'request',
      label: 'Request a conversation',
    },
    style: {
      direction: 'luxury',
      theme: 'dark',
    },
  };
}
