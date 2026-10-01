import { MadDragonActor } from "./actor/actor.js";
import { MadDragonActorSheet } from "./actor/actor-sheet.js";
import { registerHandlebarsHelpers } from "./helpers/handlebars.js";

import { CharacterModel } from "./models/actor/character-model.js";
import { NpcModel } from "./models/actor/npc-model.js";
import { EnemyModel } from "./models/actor/enemy-model.js";
import { SpecialtyModel } from "./models/item/specialty-model.js";
import { SpellModel } from "./models/item/spell-model.js";
import { MDTRoll } from "./helpers/roll.js";
import { MDTCombat } from "./combat/combat.js";
import { EquipmentModel } from "./models/item/equipment-model.js";
import { ConsumableModel } from "./models/item/consumable-model.js";
import { MdtItemSheet } from "./item/mdt-item-sheet.js";
import { registerMdtPartials } from "./templates/register-partials.js";
import { registerForcePackItemType } from "./compendium/force-pack-item-type.js";

async function reloadMdtTranslations() {
  try {
    const bucket = game.i18n?.translations?.MDT;
    if (!bucket || typeof bucket !== "object") return;
    bucket.equipments = "EQUIPAMENTOS";
  } catch (error) {
    console.error("MDT | Falha ao ajustar o título de equipamentos:", error);
  }
}

Hooks.on("init", async function () {
  console.log("MDT | Inicializando Mad Dragon Turbo...");

  await reloadMdtTranslations();

  // Registra os DataModels — substitui o template.json
  Object.assign(CONFIG.Actor.dataModels, {
    character: CharacterModel,
    npc: NpcModel,
    enemy: EnemyModel,
  });

  Object.assign(CONFIG.Item.dataModels, {
    specialty: SpecialtyModel,
    spell: SpellModel,
    equipment: EquipmentModel,
    consumable: ConsumableModel,
  });

  registerForcePackItemType();

  await registerMdtPartials();
  registerHandlebarsHelpers();

  // Registra classes de documento
  CONFIG.Actor.documentClass = MadDragonActor;

  // Labels dos tipos
  CONFIG.Actor.typeLabels = {
    character: "TYPES.Actor.character",
    npc: "TYPES.Actor.npc",
    enemy: "TYPES.Actor.enemy",
  };

  CONFIG.Item.typeLabels = {
    specialty: "TYPES.Item.specialty",
    spell: "TYPES.Item.spell",
    equipment: "TYPES.Item.equipment",
    consumable: "TYPES.Item.consumable",
  };

  // Registra fichas
  foundry.documents.collections.Actors.unregisterSheet(
    "core",
    foundry.applications.sheets.ActorSheet,
  );

  foundry.documents.collections.Actors.registerSheet(
    "mad-dragon-turbo",
    MadDragonActorSheet,
    {
      types: ["character", "npc", "enemy"],
      makeDefault: true,
      label: "MDT.sheet.character",
    },
  );

  foundry.documents.collections.Items.unregisterSheet(
    "core",
    foundry.appv1.sheets.ItemSheet,
  );

  foundry.documents.collections.Items.registerSheet("mad-dragon-turbo", MdtItemSheet, {
    types: ["specialty", "spell", "equipment", "consumable"],
    makeDefault: true,
    label: "MDT.sheet.item",
  });

  // Registra o sistema de combate customizado
  CONFIG.Combat.documentClass = MDTCombat;

  registerHandlebarsHelpers();

  MDTRoll.registerChatHooks();
});

Hooks.on("preCreateItem", (doc) => {
  if (doc.type !== "equipment" && doc.type !== "consumable") return;
  const kind = doc.system?.kind ?? "";
  if (kind) return;
  if (doc.getFlag("mad-dragon-turbo", "requiresKind")) return;
  doc.updateSource({
    flags: {
      "mad-dragon-turbo": { requiresKind: true },
    },
  });
});

function isLegacyPotion(item) {
  return item?.type === "consumable" && item.system?.kind === "potion";
}

function potionToEffectUpdates(items) {
  return items.filter(isLegacyPotion).map((item) => ({
    _id: item.id,
    "system.kind": "effect",
  }));
}

/** Consumíveis salvos como "potion" passam a usar a chave "effect". */
async function migrateConsumableKindPotionToEffect() {
  if (!game.user?.isGM) return;

  try {
    const worldUpdates = potionToEffectUpdates(game.items);
    if (worldUpdates.length) await Item.updateDocuments(worldUpdates);

    for (const actor of game.actors ?? []) {
      const updates = potionToEffectUpdates(actor.items);
      if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
    }

    for (const scene of game.scenes ?? []) {
      for (const token of scene.tokens ?? []) {
        if (token.actorLink || !token.actor) continue;
        const updates = potionToEffectUpdates(token.actor.items);
        if (updates.length) await token.actor.updateEmbeddedDocuments("Item", updates);
      }
    }

    for (const pack of game.packs ?? []) {
      if (pack.locked) continue;
      if (pack.documentName === "Item") {
        const docs = await pack.getDocuments();
        const updates = potionToEffectUpdates(docs);
        if (updates.length) await Item.updateDocuments(updates, { pack: pack.collection });
      } else if (pack.documentName === "Actor") {
        const actors = await pack.getDocuments();
        for (const actor of actors) {
          const updates = potionToEffectUpdates(actor.items);
          if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
        }
      }
    }
  } catch (error) {
    console.error("MDT | Falha ao migrar consumível potion para effect:", error);
  }
}

Hooks.on("ready", function () {
  console.log("MDT | Mad Dragon Turbo pronto!");

  game.mdt = { MDTRoll }; // facilita testes no console
  // Mensagens já no log (F5/login) podem ter renderizado antes do usuário estar pronto
  MDTRoll.refreshSpellUsesVisibilityInChat();
  migrateConsumableKindPotionToEffect();
});

Hooks.on("updateActor", async (actor, change) => {
  // Sincroniza nome do token quando o nome da ficha muda.
  if (!Object.hasOwn(change ?? {}, "name")) return;

  const nextName = (actor.name ?? "").toString().trim();
  if (!nextName) return;

  try {
    // Novos tokens criados a partir do ator.
    if ((actor.prototypeToken?.name ?? "") !== nextName) {
      await actor.update({ "prototypeToken.name": nextName });
    }

    // Tokens já existentes nas cenas.
    const updatesByScene = [];
    for (const scene of game.scenes ?? []) {
      const updates = scene.tokens
        .filter((token) => token.actorId === actor.id && token.name !== nextName)
        .map((token) => ({ _id: token.id, name: nextName }));
      if (updates.length) updatesByScene.push({ scene, updates });
    }

    for (const { scene, updates } of updatesByScene) {
      await scene.updateEmbeddedDocuments("Token", updates);
    }
  } catch (error) {
    console.error("MDT | Falha ao sincronizar nome do token com o ator:", error);
  }
});
