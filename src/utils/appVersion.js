export function isVersionOlder(currentVersion, minimumVersion) {
  const current = String(currentVersion).split('.').map((part) => Number.parseInt(part, 10) || 0);
  const minimum = String(minimumVersion).split('.').map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(current.length, minimum.length);

  for (let index = 0; index < length; index += 1) {
    if ((current[index] || 0) !== (minimum[index] || 0)) {
      return (current[index] || 0) < (minimum[index] || 0);
    }
  }
  return false;
}
