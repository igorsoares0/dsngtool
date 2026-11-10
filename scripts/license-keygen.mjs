// Generate the Ed25519 key pair that signs license keys.
//
//   node scripts/license-keygen.mjs
//
// The PUBLIC key goes into LICENSE_PUBLIC_KEYS in app/lib/license/format.ts.
// The PRIVATE key goes into the LICENSE_PRIVATE_KEY env var (local .env and
// Coolify) and into your password manager. Lose it and you can no longer issue
// keys the shipped app accepts; leak it and anyone can mint keys.
import * as ed from "@noble/ed25519";
import { bytesToHex } from "../app/lib/license/format.ts";

const secret = ed.utils.randomSecretKey();
const pub = await ed.getPublicKeyAsync(secret);
console.log(`LICENSE_PRIVATE_KEY=${bytesToHex(secret)}`);
console.log(`public key: ${bytesToHex(pub)}`);
