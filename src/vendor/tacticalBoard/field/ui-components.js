import { createFloatingButtons } from './ui-floating-buttons';

export function createFieldUiComponents(dependencies) {
  return {
    ...createFloatingButtons(dependencies),
  };
}
