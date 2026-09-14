/**
 * F1.com serves its images through Cloudinary (media.formula1.com/image/upload/<transform>/
 * v<version>/<path>). Cloudinary transforms are just a URL segment, so we can request our own
 * crop/size instead of whatever tiny thumbnail the source page originally asked for — no image
 * processing on our side needed. Returns the URL unchanged if it isn't a Cloudinary URL.
 */
export function cloudinaryTransform(url: string, transform: string): string {
  const m = url.match(/^(https:\/\/media\.formula1\.com\/image\/upload\/)([^/]+)(\/.*)$/);
  if (!m) return url;
  return `${m[1]}${transform}${m[3]}`;
}

/** Zoomed torso-up crop for a driver's full-length cutout photo (anchored to the top, where
 *  the head is), at a size big enough for a real photo instead of a tiny listing thumbnail. */
export function f1DriverPhotoUrl(url: string): string {
  return cloudinaryTransform(url, "c_fill,g_north,w_300,h_300,q_auto");
}

/** Upsized team logo (the source page only asks for a 48px version). */
export function f1TeamLogoUrl(url: string): string {
  return cloudinaryTransform(url, "c_fit,w_160,q_auto");
}
