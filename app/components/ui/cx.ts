/** Joins class names, dropping falsy entries. Deliberately not clsx — this is
 *  the whole feature the app needs and it keeps the dependency list short. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
