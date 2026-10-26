/** Point d'entrée : crée le store et monte chaque vue sur son conteneur. */
import { createStore } from "./state/store.js";
import { byId } from "./ui/dom.js";
import { mountPartners } from "./ui/partners.js";
import { mountDevicePicker } from "./ui/devicePicker.js";
import { mountLifetimeControls } from "./ui/lifetimeControls.js";
import { mountDeviceParams, mountGlobalParams } from "./ui/paramsPanel.js";
import { mountRepairsEditor } from "./ui/repairsEditor.js";
import { mountSavings } from "./ui/savings.js";
import { mountThresholds } from "./ui/thresholds.js";
import { mountCharts } from "./ui/charts.js";
import { mountTimeline } from "./ui/timeline.js";
import { mountCompareTable } from "./ui/compareTable.js";

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

VIEWS.forEach(([id, mount]) => mount(byId(id), store));

const deviceTitle = byId("device-title");
const renderTitle = () => {
  const d = store.device();
  deviceTitle.textContent = d.name;
  byId("device-sub").textContent = d.sub;
};
store.subscribe(renderTitle);
renderTitle();

byId("reset").addEventListener("click", () => store.reset());
