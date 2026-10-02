import { TEMPLATES, type Template } from "./templates";
import type { Page } from "../types/editor";

/** Templates carry no element ids; the thumbnail renderer wants a Page. Built
 *  once per template so thumbnails get a stable object. */
const TEMPLATE_PAGES = new Map<string, Page>(
  TEMPLATES.map((t) => [
    t.name,
    {
      id: `tpl_${t.name}`,
      elements: t.elements.map((el, i) => ({ ...el, id: `tpl_${t.name}_${i}` })) as Page["elements"],
      backgroundColor: t.backgroundColor,
      backgroundGradient: null,
    },
  ])
);

export function templatePage(t: Template): Page {
  return TEMPLATE_PAGES.get(t.name)!;
}
