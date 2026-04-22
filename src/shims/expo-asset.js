/** Shim mínimo de expo-asset para web. Resuelve URIs estáticas como están. */
export class Asset {
  constructor(uri) {
    this.uri = uri;
    this.localUri = uri;
    this.downloaded = true;
  }
  static fromModule(moduleId) {
    const uri = typeof moduleId === 'string' ? moduleId : (moduleId?.uri || '');
    return new Asset(uri);
  }
  async downloadAsync() { this.downloaded = true; return this; }
}
export default { Asset };
