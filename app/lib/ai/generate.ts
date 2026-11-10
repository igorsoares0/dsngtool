/**
 * AI design generation, run in the browser with the user's own Anthropic key
 * (BYOK). Two calls: a cheap model picks the template whose structure fits the
 * brief, a stronger one art-directs it — copy, palette, type, scale and
 * background — against a positional manifest, never coordinates.
 *
 * The key never touches our server: requests go straight from this device to
 * api.anthropic.com (allowed in the CSP's connect-src, see proxy.ts).
 */
import type Anthropic from "@anthropic-ai/sdk";
import { TEMPLATES } from "../../data/templates";
import { FONT_FAMILY_NAMES } from "../font-catalog";
import { buildManifest, buildTemplateIndex, type GenerationResult } from "./manifest";

// Split by job. Picking a template is classification against a fixed enum, so
// the cheapest tier is plenty; filling it is the art direction the user sees,
// so it gets the stronger model.
const SELECT_MODEL = "claude-haiku-5-5";
const FILL_MODEL = "claude-sonnet-5-5";
// On a policy decline the API re-runs the fill on this model in the same call.
const FILL_FALLBACK = "claude-sonnet-5";

export const MAX_PROMPT_CHARS = 600;

const FONT_FAMILIES = FONT_FAMILY_NAMES;
const TEMPLATE_NAMES = TEMPLATES.map((t) => t.name);

const SELECT_SCHEMA = {
  type: "object",
  properties: { template: { type: "string", enum: TEMPLATE_NAMES } },
  required: ["template"],
  additionalProperties: false,
} as const;

const FILL_SCHEMA = {
  type: "object",
  properties: {
    texts: { type: "array", items: { type: "string" } },
    palette: { type: "array", items: { type: "string" } },
    fonts: { type: "array", items: { type: "string", enum: FONT_FAMILIES } },
    scales: { type: "array", items: { type: "number" } },
    background: {
      type: "object",
      properties: {
        treatment: { type: "string", enum: ["flat", "linear", "radial"] },
        direction: {
          type: "string",
          enum: ["top-bottom", "bottom-top", "left-right", "diagonal-down", "diagonal-up"],
        },
        stops: { type: "array", items: { type: "string" } },
      },
      required: ["treatment", "direction", "stops"],
      additionalProperties: false,
    },
    name: { type: "string" },
  },
  required: ["texts", "palette", "fonts", "scales", "background", "name"],
  additionalProperties: false,
} as const;

const SELECT_SYSTEM = `You pick the design template whose structure best fits a user's brief.
Match on: number and role of text slots, aspect ratio, and how the category relates to the brief's subject.
Structure matters more than category wording — a "Wellness" layout can carry a fintech brief if the slot shape fits.`;

const FILL_SYSTEM = `You art-direct a social media design. The layout skeleton is fixed and you
never see or set coordinates — you control content, colour, type, scale, and the background.

Every array you return is positional and its length is fixed by the manifest. The "counts"
object states exactly how many entries each array must have. Getting a length wrong means
that whole array is discarded and the template's original is used instead, so count before
you answer: texts and scales match slots, palette matches colors, fonts matches fonts.

Aim for a design someone would stop scrolling for. That comes from commitment, not decoration:
one clear focal point, strong contrast, and restraint everywhere else. A safe, evenly-weighted,
mid-tone design is a failure even though nothing about it is wrong.

texts[i] replaces slots[i]:
- Respect each slot's role. A headline is a headline, not a sentence.
- Stay within maxChars. This is a hard budget — the layout has no room to grow, and
  anything longer gets shrunk or truncated before it reaches the canvas. Shorter is
  usually stronger: a three-word headline can be set twice as large as a seven-word one.
- Write in the language of the user's brief.
- No emoji, no hashtags, no surrounding quotes.

scales[i] is a font-size multiplier for slots[i], between 0.8 and 1.6:
- Use it to build real hierarchy. Push the headline up and pull supporting text down
  in the same design — the gap is what creates impact.
- Exactly one element should dominate. Scaling everything up achieves nothing.
- Leave a slot at 1.0 when the template's size is already right.

palette[i] replaces colors[i]:
- Return 6-digit hex (#RRGGBB).
- Preserve the *roles*: whichever input colour sits behind the others must stay the
  background in your palette, and foreground colours must stay legible against it.
- Do NOT preserve the key. You may invert light and dark as a set, go to a deep
  near-black or saturated ground, or use a tight duotone. Commit to a direction that
  fits the brief instead of tinting the original.
- Avoid muddy mid-tones and low-contrast pairings. Text must stay clearly readable.

fonts[i] replaces fonts[i]:
- Choose only from the allowed list. Keep the serif/sans pairing logic intact:
  if the original pairs a display serif with a sans body, do the same.
- Display faces (Bebas Neue, Anton, Oswald, Archivo Black, Abril Fatface) and
  script faces (Dancing Script, Great Vibes, Caveat) are headline-only. Never
  set body copy, a caption or a long slot in one — they stop being readable
  below headline size. Pair them with a plain sans or serif for the rest.

background describes the canvas ground:
- treatment "flat" uses palette[0]. "linear" or "radial" render a gradient from stops.
- stops is 2-3 hex colours, in order. Keep them close in hue — a gradient is depth,
  not a rainbow. A dark ground with a subtly lighter corner reads as premium.
- direction is ignored for radial (which always glows from the centre).
- Prefer a gradient when it adds depth; stay flat when the design is typographic
  and wants a clean ground.

name: a short project name, 2-4 words, in the brief's language.`;

function textFrom(message: { content: Array<{ type: string }> }): string {
  const block = message.content.find((b) => b.type === "text") as { text?: string } | undefined;
  if (!block?.text) throw new GenerateError("internal");
  return block.text;
}

export type GenerateErrorCode =
  | "no_key"
  | "invalid_key"
  | "permission"
  | "rate_limited"
  | "overloaded"
  | "bad_request"
  | "refused"
  | "prompt_too_long"
  | "network"
  | "internal";

export class GenerateError extends Error {
  constructor(public code: GenerateErrorCode) {
    super(code);
  }
}

/** Load the SDK only when someone actually generates — it is not small. */
async function client(apiKey: string): Promise<Anthropic> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  return new Anthropic({
    apiKey,
    // Safe here by construction: the key is the user's own, typed into their
    // own browser, and is sent only to Anthropic.
    dangerouslyAllowBrowser: true,
    maxRetries: 1,
  });
}

/** Map SDK errors to codes the UI can explain. Most specific class first. */
async function toGenerateError(err: unknown): Promise<GenerateError> {
  if (err instanceof GenerateError) return err;
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  if (err instanceof Anthropic.AuthenticationError) return new GenerateError("invalid_key");
  if (err instanceof Anthropic.PermissionDeniedError) return new GenerateError("permission");
  if (err instanceof Anthropic.RateLimitError) return new GenerateError("rate_limited");
  if (err instanceof Anthropic.BadRequestError) return new GenerateError("bad_request");
  if (err instanceof Anthropic.APIUserAbortError) throw err;
  if (err instanceof Anthropic.APIConnectionError) return new GenerateError("network");
  if (err instanceof Anthropic.APIError && (err.status ?? 0) >= 500) return new GenerateError("overloaded");
  return new GenerateError("internal");
}

export interface Generated {
  template: string;
  result: GenerationResult;
}

/**
 * Generate a design from a brief. Throws GenerateError (or the SDK's
 * APIUserAbortError when `signal` fires).
 */
export async function generateDesign(opts: {
  apiKey: string | null;
  prompt: string;
  signal?: AbortSignal;
}): Promise<Generated> {
  if (!opts.apiKey) throw new GenerateError("no_key");
  const prompt = opts.prompt.trim();
  if (prompt.length > MAX_PROMPT_CHARS) throw new GenerateError("prompt_too_long");

  try {
    const anthropic = await client(opts.apiKey);

    // 1. Pick the structure. Tiny output, and the enum makes an unknown
    //    template name impossible. Haiku 5.5 thinks by default and thinking
    //    counts toward max_tokens, so the cap leaves room for it.
    const pick = await anthropic.messages.create(
      {
        model: SELECT_MODEL,
        max_tokens: 1024,
        output_config: { format: { type: "json_schema", schema: SELECT_SCHEMA }, effort: "low" },
        system: SELECT_SYSTEM,
        messages: [
          {
            role: "user",
            content: `Brief: ${prompt}\n\nTemplates:\n${JSON.stringify(buildTemplateIndex(TEMPLATES))}`,
          },
        ],
      },
      { signal: opts.signal }
    );
    if (pick.stop_reason === "refusal") throw new GenerateError("refused");
    const templateName = (JSON.parse(textFrom(pick)) as { template: string }).template;

    const template = TEMPLATES.find((t) => t.name === templateName);
    if (!template) throw new GenerateError("internal");

    // 2. Fill the slots. max_tokens covers adaptive thinking as well as the
    //    JSON; too tight a cap cuts the JSON off mid-object.
    const manifest = buildManifest(template);
    const fill = await anthropic.beta.messages.create(
      {
        model: FILL_MODEL,
        max_tokens: 8000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: [{ model: FILL_FALLBACK }],
        thinking: { type: "adaptive" },
        output_config: { format: { type: "json_schema", schema: FILL_SCHEMA }, effort: "medium" },
        system: FILL_SYSTEM,
        messages: [
          {
            role: "user",
            content:
              `Brief: ${prompt}\n\n` +
              `Manifest:\n${JSON.stringify(manifest)}\n\n` +
              `counts: ${JSON.stringify({
                texts: manifest.slots.length,
                scales: manifest.slots.length,
                palette: manifest.colors.length,
                fonts: manifest.fonts.length,
              })}\n\n` +
              `Allowed fonts: ${FONT_FAMILIES.join(", ")}`,
          },
        ],
      },
      { signal: opts.signal }
    );
    if (fill.stop_reason === "refusal") throw new GenerateError("refused");

    return { template: template.name, result: JSON.parse(textFrom(fill)) as GenerationResult };
  } catch (err) {
    throw await toGenerateError(err);
  }
}

/** Cheapest authenticated call there is: proves a key works without spending tokens. */
export async function testApiKey(apiKey: string): Promise<"ok" | GenerateErrorCode> {
  try {
    const anthropic = await client(apiKey);
    await anthropic.models.list({ limit: 1 });
    return "ok";
  } catch (err) {
    return (await toGenerateError(err)).code;
  }
}
