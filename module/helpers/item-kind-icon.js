const ITEM_KIND_ICONS = {
  armor: "fa-vest",
  shield: "fa-shield-halved",
  accessory: "fa-ring",
  melee: "fa-khanda",
  firearm: "fa-gun",
  key: "fa-key",
  potion: "fa-flask",
  money: "fa-coins",
  misc: "fa-box",
};

/**
 * Classe Font Awesome do tipo. Sem tipo selecionado, retorna fa-question-circle.
 * @param {string} kind
 * @returns {string}
 */
export function itemKindIconClass(kind) {
  return ITEM_KIND_ICONS[kind] ?? "fa-question-circle";
}

/**
 * Rótulo localizado do tipo, ou o placeholder quando nenhum está selecionado.
 * @param {"equipment"|"consumable"} type
 * @param {string} kind
 * @returns {string}
 */
export function itemKindLabel(type, kind) {
  const group = type === "consumable" ? "consumable" : "equipment";
  if (!kind) return game.i18n.localize(`MDT.${group}.kindPlaceholder`);
  return game.i18n.localize(`MDT.${group}.kinds.${kind}`);
}
