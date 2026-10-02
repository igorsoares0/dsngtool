/** The dashboard's brief card hands its prompt to the editor through this
 *  sessionStorage key, so the generation (which needs Konva for the fit pass)
 *  runs in the editor and Konva stays out of the dashboard bundle. */
export const BRIEF_HANDOFF_KEY = "modo-brief";
