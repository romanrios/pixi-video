import { PRESETS_DATA } from "../lib/presets-data.js";

export const EXAMPLES = {
  "basic-shapes": PRESETS_DATA.find((p) => p.id === "basic-shapes-preset")?.code || "",
  "moving-shapes": PRESETS_DATA.find((p) => p.id === "moving-shapes-preset")?.code || "",
  "bouncing-balls": PRESETS_DATA.find((p) => p.id === "bouncing-balls-preset")?.code || "",
  "containers-hierarchy": PRESETS_DATA.find((p) => p.id === "containers-hierarchy-preset")?.code || "",
  "flow-field": PRESETS_DATA.find((p) => p.id === "flow-field-preset")?.code || "",
  "sacred-geometry": PRESETS_DATA.find((p) => p.id === "sacred-geometry-preset")?.code || "",
  "cyber-grid": PRESETS_DATA.find((p) => p.id === "cyber-grid-preset")?.code || "",
  "audio-waves": PRESETS_DATA.find((p) => p.id === "audio-waves-preset")?.code || "",
};
