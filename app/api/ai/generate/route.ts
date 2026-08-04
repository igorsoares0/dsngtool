import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../../../lib/server/db";
import { getSession } from "../../../lib/server/session";
import { isPro as isProUser } from "../../../lib/server/storage";
import { TEMPLATES } from "../../../data/templates";
import { FONT_FAMILY_NAMES } from "../../../lib/font-catalog";
import { buildManifest, buildTemplateIndex } from "../../../lib/ai/manifest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-opus-4-8";
const FREE_MONTHLY = 5;
const PRO_MONTHLY = 100;

// Constructed lazily: the SDK throws when ANTHROPIC_API_KEY is missing, and at
// module scope that would break the build on any machine without the key set.
let client: Anthropic | null = null;
function anthropic(): Anthropic {
  return (client ??= new Anthropic());
}

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

background describes the canvas ground:
- treatment "flat" uses palette[0]. "linear" or "radial" render a gradient from stops.
- stops is 2-3 hex colours, in order. Keep them close in hue — a gradient is depth,
  not a rainbow. A dark ground with a subtly lighter corner reads as premium.
- direction is ignored for radial (which always glows from the centre).
- Prefer a gradient when it adds depth; stay flat when the design is typographic
  and wants a clean ground.

name: a short project name, 2-4 words, in the brief's language.`;

function currentMonth() {
  return new Date().toISOString().slice(0, 7); // "2026-07"
}

function textFrom(message: Anthropic.Message): string {
  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("no text block in response");
  return block.text;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }

  // This route spends money upstream, so it is never anonymous: the quota has
  // to hang off an identity the client can't mint on demand.
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: {
    prompt?: string;
    templateName?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }
  if (prompt.length > 600) {
    return Response.json({ error: "prompt_too_long" }, { status: 400 });
  }

  // Tier comes from the server-side subscription, not the client's word.
  const isPro = await isProUser(userId);
  const limit = isPro ? PRO_MONTHLY : FREE_MONTHLY;
  const month = currentMonth();

  // Reserve the credit before spending money upstream, so a crash mid-call
  // can't be replayed for free. The claim is a conditional UPDATE rather than a
  // read-then-write, so parallel requests can't all pass the same "under the
  // limit" read and overspend the month in one burst.
  const before = await prisma.aiUsage.upsert({
    where: { userId_month: { userId, month } },
    create: { userId, month, count: 0 },
    update: {},
  });
  const quotaExceeded = Response.json(
    { error: "quota_exceeded", limit, tier: isPro ? "pro" : "free" },
    { status: 402 }
  );
  if (before.count >= limit) return quotaExceeded;

  const claimed = await prisma.aiUsage.updateMany({
    where: { userId, month, count: { lt: limit } },
    data: { count: { increment: 1 } },
  });
  if (claimed.count === 0) return quotaExceeded; // lost the race for the last credit

  try {
    // 1. Pick the structure. Tiny output, and the enum makes an unknown
    //    template name impossible.
    let templateName = body.templateName;
    if (!templateName || !TEMPLATE_NAMES.includes(templateName)) {
      const pick = await anthropic().messages.create({
        model: MODEL,
        max_tokens: 200,
        output_config: { format: { type: "json_schema", schema: SELECT_SCHEMA }, effort: "low" },
        system: SELECT_SYSTEM,
        messages: [
          {
            role: "user",
            content: `Brief: ${prompt}\n\nTemplates:\n${JSON.stringify(buildTemplateIndex(TEMPLATES))}`,
          },
        ],
      });
      templateName = (JSON.parse(textFrom(pick)) as { template: string }).template;
    }

    const template = TEMPLATES.find((t) => t.name === templateName);
    if (!template) {
      return Response.json({ error: "unknown_template" }, { status: 500 });
    }

    // 2. Fill the slots.
    const manifest = buildManifest(template);
    const fill = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 2000,
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
    });

    if (fill.stop_reason === "refusal") {
      return Response.json({ error: "refused" }, { status: 422 });
    }

    return Response.json({
      template: template.name,
      result: JSON.parse(textFrom(fill)),
      remaining: Math.max(0, limit - (before.count + 1)),
    });
  } catch (err) {
    // Upstream failure isn't the user's fault — hand the credit back.
    await prisma.aiUsage
      .updateMany({
        where: { userId, month, count: { gt: 0 } },
        data: { count: { decrement: 1 } },
      })
      .catch(() => {});

    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "rate_limited" }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("[ai/generate] upstream", err.status, err.message);
      return Response.json({ error: "upstream" }, { status: 502 });
    }
    console.error("[ai/generate]", err);
    return Response.json({ error: "internal" }, { status: 500 });
  }
}
