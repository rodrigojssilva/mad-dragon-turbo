export class MDTCombat extends Combat {

  static INITIATIVE_ORDER = {
    trickster: 40,
    enemy:     30,
    brawler:   20,
    genius:    10
  };

  async rollInitiative(ids, { updateTurn = true, messageOptions = {} } = {}) {
    const combatantIds = typeof ids === "string" ? [ids] : ids;

    const updates = combatantIds.map(id => {
      const combatant = this.combatants.get(id);
      if (!combatant?.actor) return null;

      const actor = combatant.actor;
      const actorType = actor.type;
      const actorStyle = actor.system?.style;

      let initiative;
      if (actorType === "enemy") {
        initiative = MDTCombat.INITIATIVE_ORDER.enemy;
      } else {
        initiative = MDTCombat.INITIATIVE_ORDER[actorStyle] ?? 10;
      }

      initiative += parseFloat(Math.random().toFixed(2));
      return { _id: id, initiative };
    }).filter(Boolean);

    if (!updates.length) return this;

    await this.updateEmbeddedDocuments("Combatant", updates);

    if (updateTurn && this.turn !== null) {
      await this.update({ turn: 0 });
    }

    return this;
  }
}

// -----------------------------------------------
// Adiciona botão de iniciativa no Combat Tracker
// visível apenas para o GM
// -----------------------------------------------
Hooks.on("renderCombatTracker", (app, html, data) => {
  if (!game.user.isGM) return;
  if (!game.combat) return;

  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("mdt-initiative-btn");
  button.innerHTML = `<i class="fas fa-dice"></i> ${game.i18n.localize("MDT.combat.rollAll")}`;

  button.addEventListener("click", async () => {
    const combatants = game.combat.combatants.contents;
    if (!combatants.length) {
      ui.notifications.warn(game.i18n.localize("MDT.combat.noCombatants"));
      return;
    }
    const ids = combatants.map(c => c.id);
    await game.combat.rollInitiative(ids);
    ui.notifications.info(game.i18n.localize("MDT.combat.initiativeRolled"));
  });

  // Insere o botão no topo do tracker
  const header = html.querySelector(".combat-tracker-header") 
               ?? html.querySelector("header");
  if (header) header.appendChild(button);
});