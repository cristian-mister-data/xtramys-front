// Auto-generated image map for strength exercises (web/Vite version)
// Uses import.meta.glob to bundle all .webp images in this directory.
// Keys are the original filenames (e.g. "AC01. TRIPLE EXT DESDE SENTADO.webp")
// Values are the resolved URL strings produced by Vite.

const modules = import.meta.glob('./*.webp', { eager: true, import: 'default' });

const imageMap = {};
for (const [path, url] of Object.entries(modules)) {
  // path looks like './AC01. TRIPLE EXT DESDE SENTADO.webp'
  const filename = path.replace(/^\.\//, '');
  imageMap[filename] = url;
}

export default imageMap;
