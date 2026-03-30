export class MadDragonActorSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["mad-dragon-turbo", "sheet", "actor"],
      width: 560,
      height: 780,
      tabs: [],
    });
  }

  get template() {
    return `systems/mad-dragon-turbo/templates/actors/${this.actor.type}-sheet.hbs`;
  }

  async getData() {
    const context = await super.getData();
    const actor = this.actor;
    const systemData = actor.system;

    context.actor = actor;
    context.system = systemData;

    context.healthDots = this._prepareDots(
      systemData.health.value,
      systemData.health.max,
    );
    context.sanityDots = this._prepareDots(
      systemData.sanity.value,
      systemData.sanity.max,
    );

    context.styles = [
      {
        value: "brawler",
        label: game.i18n.localize("MDT.styles.brawler"),
        description: game.i18n.localize("MDT.styles.brawlerDesc"),
        stats: game.i18n.localize("MDT.styles.brawlerStats"),
      },
      {
        value: "trickster",
        label: game.i18n.localize("MDT.styles.trickster"),
        description: game.i18n.localize("MDT.styles.tricksterDesc"),
        stats: game.i18n.localize("MDT.styles.tricksterStats"),
      },
      {
        value: "genius",
        label: game.i18n.localize("MDT.styles.genius"),
        description: game.i18n.localize("MDT.styles.geniusDesc"),
        stats: game.i18n.localize("MDT.styles.geniusStats"),
      },
    ];

    context.specialties = actor.items.filter((i) => i.type === "specialty");
    context.spells = actor.items.filter((i) => i.type === "spell");
    context.equipment = actor.items.filter((i) => i.type === "equipment");

    return context;
  }

  _prepareDots(value, max) {
    return Array.from({ length: max }, (_, i) => ({
      filled: i < value,
      index: i,
    }));
  }

  activateListeners(html) {
  super.activateListeners(html);

  // html é jQuery — convertemos para HTMLElement com [0]
  const el = html[0];

  if (!this.isEditable) return;

  el.querySelectorAll(".health-dot").forEach(dot => {
    dot.addEventListener("click", this._onDotClick.bind(this, "health"));
  });

  el.querySelectorAll(".sanity-dot").forEach(dot => {
    dot.addEventListener("click", this._onDotClick.bind(this, "sanity"));
  });

  el.querySelector(".add-specialty")
    ?.addEventListener("click", () => this._onAddItem("specialty"));

  el.querySelector(".add-spell")
    ?.addEventListener("click", () => this._onAddItem("spell"));

  el.querySelector(".add-equipment")
    ?.addEventListener("click", () => this._onAddItem("equipment"));

  el.querySelectorAll(".item-delete").forEach(btn => {
    btn.addEventListener("click", this._onDeleteItem.bind(this));
  });

  el.querySelectorAll(".item-name").forEach(name => {
    name.addEventListener("click", this._onEditItem.bind(this));
  });

  el.querySelector(".roll-test")
    ?.addEventListener("click", this._onRollTest.bind(this));
}

  async _onDotClick(resource, event) {
    const index = parseInt(event.currentTarget.dataset.index);
    const current = this.actor.system[resource].value;
    const newValue = index + 1 === current ? index : index + 1;
    await this.actor.update({ [`system.${resource}.value`]: newValue });
  }

  async _onAddItem(type) {
    const names = {
      specialty: game.i18n.localize("MDT.specialty.new"),
      spell: game.i18n.localize("MDT.spell.new"),
      equipment: game.i18n.localize("MDT.equipment.new"),
    };
    await Item.create({ name: names[type], type }, { parent: this.actor });
  }

  async _onDeleteItem(event) {
    const itemId = event.currentTarget.closest("[data-item-id]").dataset.itemId;
    await this.actor.items.get(itemId)?.delete();
  }

  async _onEditItem(event) {
    const itemId = event.currentTarget.closest("[data-item-id]").dataset.itemId;
    this.actor.items.get(itemId)?.sheet.render(true);
  }

  async _onRollTest() {
    const { MDTRoll } = game.mdt;
    await MDTRoll.prompt(this.actor);
  }
}
