/** Sélecteur du type d'équipement. */
import { formatYears } from "../core/format.js?v=202610262156";

const ICONS = {
  ecran: '<rect x="3" y="3" width="34" height="20" rx="1.5"/><path d="M15 29h10M20 23v6"/>',
  fixe: '<rect x="12" y="2" width="16" height="28" rx="1.5"/><circle cx="20" cy="8" r="1.6"/><path d="M15 14h10M15 18h10"/>',
  laptop: '<rect x="7" y="5" width="26" height="17" rx="1.5"/><path d="M3 27h34l-3-5H6z"/>',
  phone: '<rect x="13" y="1.5" width="14" height="29" rx="2.5"/><path d="M18 27h4"/>'
};

export function mountDevicePicker(root, store) {
  function render(state) {
    root.innerHTML = Object.entries(state.devices).map(([key, d]) => `
      <button type="button" class="device" data-device="${key}" aria-pressed="${key === state.current}">
        <svg viewBox="0 0 40 32" aria-hidden="true">${ICONS[key]}</svg>
        <span class="device-text">
          <strong>${d.name}</strong>
          <span class="device-life">${formatYears(d.life)} → ${formatYears(d.lifeExt)}</span>
        </span>
      </button>`).join("");
  }

  root.addEventListener("click", event => {
    const button = event.target.closest("[data-device]");
    if (!button) return;
    store.update(state => { state.current = button.dataset.device; }, "device");
  });

  store.subscribe(render);
  render(store.get());
}
