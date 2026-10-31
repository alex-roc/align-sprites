// URL of a file in public/ (the app is served under a base path, e.g. /align-sprites/).
export function assetUrl(path: string): string {
  return import.meta.env.BASE_URL + path;
}
