const PACK_FORCED_ITEM_TYPE = {
  "mdt-equipments": "equipment",
  "mdt-spells": "spell",
  "mdt-specialties": "specialty",
};

function forcedTypeFromPack(pack) {
  if (!pack || pack.documentName !== "Item") return null;
  const packName = pack.metadata?.name;
  if (!packName) return null;
  const forced = PACK_FORCED_ITEM_TYPE[packName];
  if (!forced || !CONFIG.Item.dataModels?.[forced]) return null;
  return forced;
}

function wrapItemCreateDialog() {
  const ItemClass = globalThis.Item;
  if (!ItemClass || typeof ItemClass.createDialog !== "function") return;

  const original = ItemClass.createDialog;
  if (original.__mdtForcePackType) return;

  ItemClass.createDialog = function (data = {}, options = {}) {
    const packId = options?.pack;
    if (packId) {
      const pack = game.packs.get(packId);
      const forced = forcedTypeFromPack(pack);
      if (forced) {
        data = foundry.utils.mergeObject({ type: forced }, data, { inplace: false });
        options = foundry.utils.mergeObject({ types: [forced] }, options, { inplace: false });
      }
    }
    return original.call(this, data, options);
  };

  ItemClass.createDialog.__mdtForcePackType = true;
}

export function registerForcePackItemType() {
  wrapItemCreateDialog();

  Hooks.on("preCreateItem", (doc, _data, options, _userId) => {
    const packId = options?.pack;
    if (!packId) return;

    const pack = game.packs.get(packId);
    if (!pack || pack.documentName !== "Item") return;

    const forced = forcedTypeFromPack(pack);
    if (!forced) return;

    if (doc.type === forced) return;

    doc.updateSource({ type: forced });
  });
}
