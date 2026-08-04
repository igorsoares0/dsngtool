/**
 * Where a user lands once they're authenticated and no specific destination was
 * requested. The dashboard, not the editor: a fresh account has no project to
 * open, and returning users pick one from the list.
 *
 * Deep links survive this — the proxy stores the original path in `?redirect=`
 * and the login form honours it over this default.
 */
export const POST_AUTH_PATH = "/dashboard";
