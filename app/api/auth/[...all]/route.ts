import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "../../../lib/server/auth";

// Prisma + the driver adapter require the Node runtime, never edge.
export const runtime = "nodejs";

// Every better-auth endpoint (sign-in, sign-up, OAuth callbacks, reset,
// verification) is mounted under this single catch-all.
export const { GET, POST } = toNextJsHandler(auth);
