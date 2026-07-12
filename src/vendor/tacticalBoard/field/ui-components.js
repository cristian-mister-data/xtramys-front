import { createFieldModals } from './ui-modals';
import { createFloatingButtons } from './ui-floating-buttons';
import { createFieldPalettes } from './ui-palettes';

export function createFieldUiComponents(dependencies) {
  return {
    ...createFieldModals(dependencies),
    ...createFloatingButtons(dependencies),
    ...createFieldPalettes(dependencies),
  };
}
