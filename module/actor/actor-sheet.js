export class MadDragonActorSheet extends ActorSheet {
  constructor(object, options) {
    super(object, options);
    this._expandedItems = new Set();
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["mad-dragon-turbo", "sheet", "actor"],
      width: 560,
      height: 800,
      tabs: [
        {
          navSelector: "nav.sheet-tabs",
          contentSelector: "section.sheet-body",
          initial: "characteristics"
        }
      ],
      submitOnChange: false
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

    // Adicionar magia
    el.querySelector(".add-spell")?.addEventListener("click", () =>
      this._onAddItem("spell"),
    );

    // Adicionar equipamento
    el.querySelector(".add-equipment")?.addEventListener("click", () =>
      this._onAddItem("equipment"),
    );

    // Expandir/Contrair collapse
    el.querySelectorAll(".item-toggle").forEach((btn) => {
      btn.addEventListener("click", this._onItemToggle.bind(this));
    });

    // Editar item
    el.querySelectorAll(".item-edit-start").forEach((btn) => {
      btn.addEventListener("click", this._onItemEditStart.bind(this));
    });

    // Salvar item
    el.querySelectorAll(".item-edit-save").forEach((btn) => {
      btn.addEventListener("click", this._onItemEditSave.bind(this));
    });

    // Cancelar edição
    el.querySelectorAll(".item-edit-cancel").forEach((btn) => {
      btn.addEventListener("click", this._onItemEditCancel.bind(this));
    });

    // Deletar item
    el.querySelectorAll(".item-delete").forEach((btn) => {
      btn.addEventListener("click", this._onDeleteItem.bind(this));
    });

    // Enviar para o chat
    el.querySelectorAll(".item-to-chat").forEach((btn) => {
      btn.addEventListener("click", this._onItemToChat.bind(this));
    });

    // Rolagem de teste
    el.querySelector(".roll-test")?.addEventListener(
      "click",
      this._onRollTest.bind(this),
    );

    this._restoreExpandedItems(el);
  }

  // Expandir/Contrair collapse
  _onItemToggle(event) {
    event.preventDefault();
    event.stopPropagation();

    const row = event.currentTarget.closest(".item-row");
    if (!row) return;

    // Verifica se o item está expandido
    const itemId = row.dataset.itemId;
    const desc = row.querySelector(".item-description");
    const chevron = row.querySelector(".item-chevron");
    if (!itemId || !desc || !chevron) return;

    // Verifica se o collapse está oculto
    const isHidden = desc.classList.contains("hidden");
    const willOpen = isHidden;

    // Alterna a visibilidade do collapse
    desc.classList.toggle("hidden", !willOpen);
    chevron.classList.toggle("fa-chevron-right", !willOpen);
    chevron.classList.toggle("fa-chevron-down", willOpen);

    // Adiciona/remove o item ao conjunto de itens expandidos
    if (willOpen) this._expandedItems.add(itemId);
    else this._expandedItems.delete(itemId);
  }

  // Restaura os itens expandidos
  _restoreExpandedItems(el) {
    el.querySelectorAll(".item-row").forEach((row) => {
      const itemId = row.dataset.itemId;
      if (!itemId) return;

      const desc = row.querySelector(".item-description");
      const chevron = row.querySelector(".item-chevron");
      if (!desc || !chevron) return;

      const isOpen = this._expandedItems.has(itemId);
      desc.classList.toggle("hidden", !isOpen);
      chevron.classList.toggle("fa-chevron-right", !isOpen);
      chevron.classList.toggle("fa-chevron-down", isOpen);
    });
  }

  _onItemEditStart(event) {
    event.preventDefault();
    event.stopPropagation();
    const row = event.currentTarget.closest(".item-row");
    if (!row) return;

    const nameInput = row.querySelector(".item-name-input");
    const descInput = row.querySelector(".item-desc-input");
    const btnStart = row.querySelector(".item-edit-start");
    const btnSave = row.querySelector(".item-edit-save");
    const btnCancel = row.querySelector(".item-edit-cancel");

    if (!nameInput || !descInput || !btnStart || !btnSave || !btnCancel) return;

    // Guarda estado original para permitir cancelamento
    nameInput.dataset.originalValue = nameInput.value ?? "";
    descInput.dataset.originalValue = descInput.value ?? "";

    // Habilita inputs e mostra botões de salvar/cancelar
    nameInput.disabled = false;
    descInput.disabled = false;
    btnStart.classList.add("hidden");
    btnSave.classList.remove("hidden");
    btnCancel.classList.remove("hidden");
    nameInput.focus();
  }

  async _onItemEditSave(event) {
    event.preventDefault();
    event.stopPropagation();

    const row = event.currentTarget.closest(".item-row");
    if (!row) return;

    const itemId = row.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    // Atualiza item com novos valores
    const nameInput = row.querySelector(".item-name-input");
    const descInput = row.querySelector(".item-desc-input");

    const btnStart = row.querySelector(".item-edit-start");
    const btnSave = row.querySelector(".item-edit-save");
    const btnCancel = row.querySelector(".item-edit-cancel");
    if (!nameInput || !descInput || !btnStart || !btnSave || !btnCancel) return;

    const newName = (nameInput.value ?? "").trim();
    const newDesc = (descInput.value ?? "").trim();

    await item.update({
      name: newName || item.name,
      "system.description": newDesc,
    });

    nameInput.disabled = true;
    descInput.disabled = true;

    btnStart.classList.remove("hidden");
    btnSave.classList.add("hidden");
    btnCancel.classList.add("hidden");
  }

  _onItemEditCancel(event) {
    event.preventDefault();
    event.stopPropagation();

    const row = event.currentTarget.closest(".item-row");
    if (!row) return;

    const nameInput = row.querySelector(".item-name-input");
    const descInput = row.querySelector(".item-desc-input");
    const btnStart = row.querySelector(".item-edit-start");
    const btnSave = row.querySelector(".item-edit-save");
    const btnCancel = row.querySelector(".item-edit-cancel");

    if (!nameInput || !descInput || !btnStart || !btnSave || !btnCancel) return;

    // Restaura valores anteriores
    nameInput.value = nameInput.dataset.originalValue ?? nameInput.value;
    descInput.value = descInput.dataset.originalValue ?? descInput.value;

    // Desabilita inputs
    nameInput.disabled = true;
    descInput.disabled = true;

    // Oculta botões de salvar/cancelar
    btnStart.classList.remove("hidden");
    btnSave.classList.add("hidden");
    btnCancel.classList.add("hidden");
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
