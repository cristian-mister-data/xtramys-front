/** Shim mínimo de @react-native/assets-registry/registry para web. */
const assets = [];
export function registerAsset(asset) {
  assets.push(asset);
  return assets.length;
}
export function getAssetByID(assetId) {
  return assets[assetId - 1];
}
export default { registerAsset, getAssetByID };
