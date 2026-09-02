import { desktopBridge } from "./desktop-bridge";

/**
 * Bring an image into a design on the desktop build.
 *
 * The web build posts to /api/uploads, which checks the plan quota and puts the
 * object in R2. Here the bytes are handed to the main process, which copies
 * them into the app's own asset folder under the user's data directory and
 * names the file by content hash — so re-importing the same picture costs
 * nothing and the returned URL is stable. There is no quota: the limit is the
 * user's disk.
 */
export async function importDesktopImage(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { url } = await desktopBridge().assets.import(file.name, bytes);
  return url;
}
