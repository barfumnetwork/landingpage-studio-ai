import type { Project } from '../../types/project';
import type { GenerationError } from '../schema/types';

export function validateGenerationData(project: Project): GenerationError[] {
  const errors: GenerationError[] = [];
  if (project.brand.name.trim().length < 2) {
    errors.push({ code: 'brand.name' });
  }
  if (project.about.description.trim().length < 20) {
    errors.push({ code: 'about.description' });
  }
  return errors;
}
