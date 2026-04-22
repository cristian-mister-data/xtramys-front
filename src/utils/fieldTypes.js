// import.meta.globEager fue removido en Vite 5; usar glob({ eager: true }).
const fieldImages = import.meta.glob('../images/*.webp', { eager: true });
const imageMap = Object.fromEntries(
  Object.entries(fieldImages).map(([path, mod]) => [path.replace(/^\.\.\/images\//, ''), mod.default])
);

// Definición de tipos de campos disponibles
export const FIELD_TYPES = [
  { id: 'full', label: 'Campo entero', src: imageMap['campo.webp'] || '', aspect: 0.6 },
  { id: 'half', label: 'Medio campo', src: imageMap['mitad-campo.webp'] || '', aspect: 0.7 },
  { id: 'halfUp', label: 'Medio campo arriba', src: imageMap['mitad-campo-arriba.webp'] || '', aspect: 1 },
  { id: 'halfDown', label: 'Medio campo abajo', src: imageMap['mitad-campo-abajo.webp'] || '', aspect: 1 },
  { id: 'area', label: 'Area', src: imageMap['area.webp'] || '', aspect: 0.7 },
  { id: 'zonas1', label: '1 zona', src: imageMap['zonas1.webp'] || '', aspect: 0.6 },
  { id: 'zonas2', label: '2 zonas', src: imageMap['zonas2.webp'] || '', aspect: 0.6 },
  { id: 'zonas3', label: '3 zonas', src: imageMap['zonas3.webp'] || '', aspect: 0.6 },
  { id: 'zonas4', label: '4 zonas', src: imageMap['zonas4.webp'] || '', aspect: 0.6 },
  { id: 'empty', label: 'Vacío', src: imageMap['campo-vacio.webp'] || '', aspect: 0.6 },
];

// Función helper para obtener campo por ID
export const getFieldById = (fieldId) => {
  const field = FIELD_TYPES.find(f => f.id === fieldId) || FIELD_TYPES[0];
  // Añadir 'image' como alias de 'src' para compatibilidad
  return { ...field, image: field.src };
};
