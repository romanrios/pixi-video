import { PRESETS_DATA } from "../lib/presets-data.js";

export const EXAMPLES = {
  "flow-field": PRESETS_DATA.find((p) => p.id === "flow-field-preset")?.code || "",
  "sacred-geometry": PRESETS_DATA.find((p) => p.id === "sacred-geometry-preset")?.code || "",
  "cyber-grid": PRESETS_DATA.find((p) => p.id === "cyber-grid-preset")?.code || "",
  "audio-waves": PRESETS_DATA.find((p) => p.id === "audio-waves-preset")?.code || "",
};
