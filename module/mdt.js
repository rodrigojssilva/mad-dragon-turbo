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
import { MdtItemSheet } from "./item/mdt-item-sheet.js";
import { registerMdtPartials } from "./templates/register-partials.js";
import { registerForcePackItemType } from "./compendium/force-pack-item-type.js";

Hooks.on("init", async function () {
  console.log("MDT | Inicializando Mad Dragon Turbo...");

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
    types: ["specialty", "spell", "equipment"],
    makeDefault: true,
    label: "MDT.sheet.item",
  });

  // Registra o sistema de combate customizado
  CONFIG.Combat.documentClass = MDTCombat;

  registerHandlebarsHelpers();
});

Hooks.on("ready", function () {
  console.log("MDT | Mad Dragon Turbo pronto!");

  game.mdt = { MDTRoll }; // facilita testes no console
});
