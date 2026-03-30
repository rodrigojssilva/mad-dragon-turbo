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

  activateListeners(html) {
    super.activateListeners(html);

    // html é jQuery — convertemos para HTMLElement com [0]
    const el = html[0];

    if (!this.isEditable) return;
    // Adicionar items
    el.querySelector(".add-specialty")?.addEventListener("click", () =>
      this._onAddItem("specialty"),
    );

    el.querySelector(".add-spell")?.addEventListener("click", () =>
      this._onAddItem("spell"),
    );

    el.querySelector(".add-equipment")?.addEventListener("click", () =>
      this._onAddItem("equipment"),
    );

    // Toggle collapse
    el.querySelectorAll(".item-toggle").forEach((btn) => {
      btn.addEventListener("click", this._onItemToggle.bind(this));
    });

    // Salvar nome do item inline
    el.querySelectorAll(".item-name-input").forEach((input) => {
      input.addEventListener("change", this._onItemNameChange.bind(this));
    });

    // Salvar descrição do item inline
    el.querySelectorAll(".item-desc-input").forEach((textarea) => {
      textarea.addEventListener("change", this._onItemDescChange.bind(this));
    });

    // Deletar item
    el.querySelectorAll(".item-delete").forEach((btn) => {
      btn.addEventListener("click", this._onDeleteItem.bind(this));
    });

    // Enviar para o chat
    el.querySelectorAll(".item-to-chat").forEach((btn) => {
      btn.addEventListener("click", this._onItemToChat.bind(this));
    });

    // el.querySelectorAll(".item-name").forEach((name) => {
    //   name.addEventListener("click", this._onEditItem.bind(this));
    // });

    el.querySelector(".roll-test")?.addEventListener(
      "click",
      this._onRollTest.bind(this),
    );
  }

  // Toggle do collapse
  _onItemToggle(event) {
    const row = event.currentTarget.closest(".item-row");
    const desc = row.querySelector(".item-description");
    const chevron = row.querySelector(".item-chevron");

    const isHidden = desc.classList.contains("hidden");
    desc.classList.toggle("hidden", !isHidden);
    chevron.classList.toggle("fa-chevron-right", !isHidden);
    chevron.classList.toggle("fa-chevron-down", isHidden);
  }

  async _onItemNameChange(event) {
    const itemId = event.currentTarget.closest("[data-item-id]").dataset.itemId;
    const item = this.actor.items.get(itemId);
    await item?.update({ name: event.currentTarget.value });
  }

  async _onItemDescChange(event) {
    const itemId = event.currentTarget.closest("[data-item-id]").dataset.itemId;
    const item = this.actor.items.get(itemId);
    await item?.update({ "system.description": event.currentTarget.value });
  }

  // Enviar item para o chat
  async _onItemToChat(event) {
    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/mad-dragon-turbo/templates/chat/item-card.hbs",
      {
        item,
        system: item.system,
        actorName: this.actor.name,
      },
    );

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
    });
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
