export const BRANDING_FILE_ROUTE = "/api/settings/branding-file";

const OBJECT_ID_HEX = /^[0-9a-fA-F]{24}$/;

export function brandingFileUrl(fileId: string): string {
  return `${BRANDING_FILE_ROUTE}/${fileId}`;
}

export function parseBrandingFileId(path: string | null | undefined): string | null {
  if (!path?.trim()) return null;
  const trimmed = path.trim();
  if (trimmed.startsWith(`${BRANDING_FILE_ROUTE}/`)) {
    const id = trimmed.slice(BRANDING_FILE_ROUTE.length + 1).split("?")[0]?.trim();
    return id && OBJECT_ID_HEX.test(id) ? id : null;
  }
  return null;
}

/** Resolve stored path to a browser-loadable URL (GridFS route or legacy absolute URL). */
export function resolveBrandingAssetUrl(path: string | null | undefined): string {
  if (!path?.trim()) return "";
  const trimmed = path.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
    return trimmed;
  }
  return trimmed;
}
