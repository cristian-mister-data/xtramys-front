export const getVisualSource = (item) => {
  if (item?.visualSource === 'imported' && item?.importedImage) return 'imported';
  if (item?.imagen) return 'board';
  return item?.importedImage ? 'imported' : 'board';
};

export const getContentImage = (item) => (
  getVisualSource(item) === 'imported' ? item?.importedImage : item?.imagen
) || '';

export const usesImportedImage = (item) => getVisualSource(item) === 'imported' && Boolean(item?.importedImage);
