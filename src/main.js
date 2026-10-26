/** Point d'entrée : crée le store et monte chaque vue sur son conteneur. */
import { createStore } from "./state/store.js?v=202610262207";
import { byId } from "./ui/dom.js?v=202610262207";
import { mountPartners } from "./ui/partners.js?v=202610262207";
import { mountDevicePicker } from "./ui/devicePicker.js?v=202610262207";
import { mountLifetimeControls } from "./ui/lifetimeControls.js?v=202610262207";
import { mountDeviceParams, mountGlobalParams } from "./ui/paramsPanel.js?v=202610262207";
import { mountRepairsEditor } from "./ui/repairsEditor.js?v=202610262207";
import { mountSavings } from "./ui/savings.js?v=202610262207";
import { mountThresholds } from "./ui/thresholds.js?v=202610262207";
import { mountCharts } from "./ui/charts.js?v=202610262207";
import { mountTimeline } from "./ui/timeline.js?v=202610262207";
import { mountCompareTable } from "./ui/compareTable.js?v=202610262207";

const store = createStore();

const VIEWS = [
  ["partners", root => mountPartners(root)],
  ["device-picker", mountDevicePicker],
  ["lifetime", mountLifetimeControls],
  ["device-params", mountDeviceParams],
  ["repairs", mountRepairsEditor],
  ["global-params", mountGlobalParams],
  ["savings", mountSavings],
  ["thresholds", mountThresholds],
  ["charts", mountCharts],
  ["timeline", mountTimeline],
  ["compare", mountCompareTable]
];

// Chaque vue est montée indépendamment : un conteneur absent (page en cache d'une
// version précédente) ou une erreur dans une vue ne bloque pas les suivantes.
VIEWS.forEach(([id, mount]) => {
  const root = byId(id);
  if (!root) {
    console.warn(`[simulateur] conteneur #${id} absent : vue ignorée`);
    return;
  }
  try {
    mount(root, store);
  } catch (error) {
    console.error(`[simulateur] échec du montage de #${id}`, error);
  }
});

const deviceTitle = byId("device-title");
const renderTitle = () => {
  const d = store.device();
  deviceTitle.textContent = d.name;
  byId("device-sub").textContent = d.sub;
};
store.subscribe(renderTitle);
renderTitle();

byId("reset").addEventListener("click", () => store.reset());
