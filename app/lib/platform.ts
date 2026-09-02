/**
 * Which build this is.
 *
 * `NEXT_PUBLIC_DESKTOP` is set only by desktop/build.mjs, so in the web build
 * this is a compile-time `false` and every desktop branch is dead code Next
 * strips out. That is the mechanism that keeps the browser app byte-for-byte
 * the product it already is: the desktop target adds branches, it never
 * rewrites the web path.
 */
export const IS_DESKTOP = process.env.NEXT_PUBLIC_DESKTOP === "1";
