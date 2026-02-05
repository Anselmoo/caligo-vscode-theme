export function resolveScreenshotPath(
  filename: string,
  baseUrl: string = import.meta.env.BASE_URL || "/"
): string {
  const baseUrlWithSlash = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const filenameWithoutLeadingSlashes = filename.replace(/^\/+/, "");

  if (filenameWithoutLeadingSlashes.startsWith("screenshots/")) {
    return `${baseUrlWithSlash}${filenameWithoutLeadingSlashes}`;
  }

  return `${baseUrlWithSlash}screenshots/${filenameWithoutLeadingSlashes.replace(/^.*\//, "")}`;
}
