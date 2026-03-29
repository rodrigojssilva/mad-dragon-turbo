import { MadDragonActor } from "./actor/actor.js";
import { MadDragonActorSheet } from "./actor/actor-sheet.js";
import { registerHandlebarsHelpers } from "./helpers/handlebars.js";

import { CharacterModel } from "./models/actor/character-model.js";
import { NpcModel } from "./models/actor/npc-model.js";
import { EnemyModel } from "./models/actor/enemy-model.js";
import { SpecialtyModel } from "./models/item/specialty-model.js";
import { SpellModel } from "./models/item/spell-model.js";
import { MDTRoll } from "./helpers/roll.js";

Hooks.on("init", function () {
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
  });

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

  registerHandlebarsHelpers();
});

Hooks.on("ready", function () {
  console.log("MDT | Mad Dragon Turbo pronto!");

  game.mdt = { MDTRoll }; // facilita testes no console
});
