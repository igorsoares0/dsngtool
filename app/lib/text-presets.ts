import { useEditorStore } from "../store/editor-store";

export type TextPreset = "heading" | "subheading" | "body";

const PRESETS: Record<
  TextPreset,
  { text: string; fontSize: number; fontStyle: string; fontFamily: string }
> = {
  heading: { text: "Add a heading", fontSize: 64, fontStyle: "bold", fontFamily: "Playfair Display" },
  subheading: { text: "Add a subheading", fontSize: 40, fontStyle: "500", fontFamily: "Montserrat" },
  body: { text: "Add body text", fontSize: 24, fontStyle: "normal", fontFamily: "DM Sans" },
};

/** Add a text layer to the active page, centred. Shared by the Text panel and
 *  the T / ⇧T / ⌥T shortcuts. */
export function addTextPreset(
  preset: TextPreset,
  overrides?: Partial<{ text: string; fontFamily: string; fontStyle: string; fontSize: number; y: number }>
) {
  const { addElement, format } = useEditorStore.getState();
  const cfg = { ...PRESETS[preset], ...overrides };
  addElement({
    type: "text",
    text: cfg.text,
    fontSize: cfg.fontSize,
    fontFamily: cfg.fontFamily,
    fill: "#000000",
    align: "center",
    fontStyle: cfg.fontStyle,
    width: format.width * 0.6,
    height: cfg.fontSize * 1.5,
    x: format.width * 0.2,
    y: overrides?.y ?? format.height / 2 - cfg.fontSize,
    rotation: 0,
    opacity: 1,
  });
}
