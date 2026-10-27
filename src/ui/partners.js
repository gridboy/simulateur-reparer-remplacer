/** Bandeau des logos partenaires. Un logo absent est remplacé par le nom du partenaire. */
import { escapeHtml } from "./dom.js?v=202610270821";

const PARTNERS = [
  { id: "lanum", name: "LaNum Pays Basque", short: "LaNum", src: "assets/logos/lanum.svg", width: 231, height: 67 },
  { id: "neonum", name: "NéoNum", short: "NéoNum", src: "assets/logos/neonum.webp", width: 320, height: 258 }
];

export function mountPartners(root) {
  root.innerHTML = PARTNERS.map(p => `
    <li class="partner" data-partner="${p.id}">
      <img src="${p.src}" alt="${escapeHtml(p.name)}" width="${p.width}" height="${p.height}" decoding="async">
      <span class="partner-fallback" hidden>${escapeHtml(p.short)}</span>
    </li>`).join("");

  root.querySelectorAll("img").forEach(img => {
    img.addEventListener("error", () => {
      img.hidden = true;
      img.nextElementSibling.hidden = false;
    }, { once: true });
  });
}
