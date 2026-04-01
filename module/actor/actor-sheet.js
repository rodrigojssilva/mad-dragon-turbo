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
    context.spells = actor.items
      .filter((i) => i.type === "spell")
      .map((spell) => {
        const maxUses = Math.max(0, Number(spell.system.maxUses ?? 0));
        const usedUses = Math.min(maxUses, Math.max(0, Number(spell.system.usedUses ?? 0)));
        const remainingUses = Math.max(0, maxUses - usedUses);
        return {
          id: spell.id,
          name: spell.name,
          type: spell.type,
          system: {
            ...spell.system,
            maxUses,
            usedUses,
            remainingUses,
          },
          noUses: remainingUses <= 0,
        };
      });
    context.equipment = actor.items
      .filter((i) => i.type === "equipment")
      .map((equipment) => ({
        id: equipment.id,
        name: equipment.name,
        type: equipment.type,
        system: {
          ...equipment.system,
          quantity: Math.max(0, Number(equipment.system.quantity ?? 1)),
        },
      }));

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
    el.querySelectorAll(".item-summary").forEach((summary) => {
      summary.addEventListener("click", this._onItemSummaryToggle.bind(this));
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

    // Usar magia
    el.querySelectorAll(".spell-cast").forEach((btn) => {
      btn.addEventListener("click", this._onSpellCast.bind(this));
    });

    // Rolagem de teste
    el.querySelector(".roll-test")?.addEventListener(
      "click",
      this._onRollTest.bind(this),
    );
    el.querySelector(".rest-test")?.addEventListener(
      "click",
      this._onRest.bind(this),
    );
    el.querySelector(".concept-edit-start")?.addEventListener(
      "click",
      this._onConceptEditStart.bind(this),
    );
    el.querySelector(".concept-edit-save")?.addEventListener(
      "click",
      this._onConceptEditSave.bind(this),
    );
    el.querySelector(".concept-edit-cancel")?.addEventListener(
      "click",
      this._onConceptEditCancel.bind(this),
    );

    // Diário - editar/salvar/cancelar
    el.querySelectorAll(".diary-edit-start").forEach((btn) => {
      btn.addEventListener("click", this._onDiaryEditStart.bind(this));
    });
    el.querySelectorAll(".diary-edit-save").forEach((btn) => {
      btn.addEventListener("click", this._onDiaryEditSave.bind(this));
    });
    el.querySelectorAll(".diary-edit-cancel").forEach((btn) => {
      btn.addEventListener("click", this._onDiaryEditCancel.bind(this));
    });

    this._restoreExpandedItems(el);
  }

  // Expandir/Contrair collapse
  _onItemToggle(event) {
    event.preventDefault();
    event.stopPropagation();

    const row = event.currentTarget.closest(".item-row");
    if (!row) return;
    this._toggleItemRow(row);
  }

  _onItemSummaryToggle(event) {
    event.preventDefault();
    event.stopPropagation();
    // Permite usar controles (dado, lixeira, etc) sem abrir/fechar collapse
    if (event.target.closest(".item-controls")) return;
    const row = event.currentTarget.closest(".item-row");
    if (!row) return;
    this._toggleItemRow(row);
  }

  _toggleItemRow(row) {
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
    const spellHighLevelInput = row.querySelector(".spell-high-level-input");
    const spellMaxUsesInput = row.querySelector(".spell-max-uses-input");
    const spellUsedUsesInput = row.querySelector(".spell-used-uses-input");
    const equipmentQtyInput = row.querySelector(".equipment-qty-input");
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
    if (spellHighLevelInput) spellHighLevelInput.disabled = false;
    if (spellMaxUsesInput) spellMaxUsesInput.disabled = false;
    if (spellUsedUsesInput) spellUsedUsesInput.disabled = false;
    if (equipmentQtyInput) equipmentQtyInput.disabled = false;
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
    const spellHighLevelInput = row.querySelector(".spell-high-level-input");
    const spellMaxUsesInput = row.querySelector(".spell-max-uses-input");
    const spellUsedUsesInput = row.querySelector(".spell-used-uses-input");
    const equipmentQtyInput = row.querySelector(".equipment-qty-input");

    const btnStart = row.querySelector(".item-edit-start");
    const btnSave = row.querySelector(".item-edit-save");
    const btnCancel = row.querySelector(".item-edit-cancel");
    if (!nameInput || !descInput || !btnStart || !btnSave || !btnCancel) return;

    const newName = (nameInput.value ?? "").trim();
    const newDesc = (descInput.value ?? "").trim();
    const newHighLevel = spellHighLevelInput?.checked ?? item.system.highLevel ?? false;
    const newMaxUses = Math.max(0, Number(spellMaxUsesInput?.value ?? item.system.maxUses ?? 0));
    const rawUsedUses = Math.max(0, Number(spellUsedUsesInput?.value ?? item.system.usedUses ?? 0));
    const newUsedUses = Math.min(newMaxUses, rawUsedUses);
    const newQuantity = Math.max(0, Number(equipmentQtyInput?.value ?? item.system.quantity ?? 1));

    const updateData = {
      name: newName || item.name,
      "system.description": newDesc,
    };

    if (item.type === "spell") {
      updateData["system.highLevel"] = newHighLevel;
      updateData["system.level"] = newHighLevel ? "high" : "low";
      updateData["system.maxUses"] = newMaxUses;
      updateData["system.usedUses"] = newUsedUses;
    }
    if (item.type === "equipment") {
      updateData["system.quantity"] = newQuantity;
    }

    await item.update(updateData);

    nameInput.disabled = true;
    descInput.disabled = true;
    if (spellHighLevelInput) spellHighLevelInput.disabled = true;
    if (spellMaxUsesInput) spellMaxUsesInput.disabled = true;
    if (spellUsedUsesInput) spellUsedUsesInput.disabled = true;
    if (equipmentQtyInput) equipmentQtyInput.disabled = true;

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
    const spellHighLevelInput = row.querySelector(".spell-high-level-input");
    const spellMaxUsesInput = row.querySelector(".spell-max-uses-input");
    const spellUsedUsesInput = row.querySelector(".spell-used-uses-input");
    const equipmentQtyInput = row.querySelector(".equipment-qty-input");
    const btnStart = row.querySelector(".item-edit-start");
    const btnSave = row.querySelector(".item-edit-save");
    const btnCancel = row.querySelector(".item-edit-cancel");

    if (!nameInput || !descInput || !btnStart || !btnSave || !btnCancel) return;

    // Restaura valores anteriores
    nameInput.value = nameInput.dataset.originalValue ?? nameInput.value;
    descInput.value = descInput.dataset.originalValue ?? descInput.value;
    if (spellHighLevelInput) spellHighLevelInput.checked = !!spellHighLevelInput.defaultChecked;
    if (spellMaxUsesInput) spellMaxUsesInput.value = spellMaxUsesInput.defaultValue ?? spellMaxUsesInput.value;
    if (spellUsedUsesInput) spellUsedUsesInput.value = spellUsedUsesInput.defaultValue ?? spellUsedUsesInput.value;
    if (equipmentQtyInput) equipmentQtyInput.value = equipmentQtyInput.defaultValue ?? equipmentQtyInput.value;

    // Desabilita inputs
    nameInput.disabled = true;
    descInput.disabled = true;
    if (spellHighLevelInput) spellHighLevelInput.disabled = true;
    if (spellMaxUsesInput) spellMaxUsesInput.disabled = true;
    if (spellUsedUsesInput) spellUsedUsesInput.disabled = true;
    if (equipmentQtyInput) equipmentQtyInput.disabled = true;

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
    await this._sendItemToChat(item);
  }

  async _onSpellCast(event) {
    event.preventDefault();
    event.stopPropagation();
    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "spell") return;

    const maxUses = Math.max(0, Number(item.system.maxUses ?? 0));
    const usedUses = Math.max(0, Number(item.system.usedUses ?? 0));
    const remainingUses = Math.max(0, maxUses - usedUses);

    if (remainingUses <= 0) {
      ui.notifications?.warn(game.i18n.localize("MDT.spell.noUses"));
      return;
    }

    const nextUsedUses = usedUses + 1;
    await item.update({ "system.usedUses": nextUsedUses });

    await this._sendItemToChat(item);
  }

  async _sendItemToChat(item) {
    const maxUses = Math.max(0, Number(item.system.maxUses ?? 0));
    const usedUses = Math.min(maxUses, Math.max(0, Number(item.system.usedUses ?? 0)));
    const remainingUses = Math.max(0, maxUses - usedUses);
    const isHighLevel = item.system.highLevel ?? item.system.level === "high";

    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/mad-dragon-turbo/templates/chat/item-card.hbs",
      {
        item,
        system: item.system,
        actorName: this.actor.name,
        isSpell: item.type === "spell",
        isHighLevel,
        maxUses,
        usedUses,
        remainingUses,
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

  async _onRest() {
    const spells = this.actor.items.filter((i) => i.type === "spell");
    if (!spells.length) {
      ui.notifications?.info(game.i18n.localize("MDT.spell.restNoSpells"));
      return;
    }

    await Promise.all(spells.map((spell) => spell.update({ "system.usedUses": 0 })));
    ui.notifications?.info(game.i18n.localize("MDT.spell.restDone"));
  }

  _onDiaryEditStart(event) {
    event.preventDefault();
    const block = event.currentTarget.closest(".diary-block");
    if (!block) return;
    const textarea = block.querySelector(".diary-textarea");
    const btnStart = block.querySelector(".diary-edit-start");
    const btnSave = block.querySelector(".diary-edit-save");
    const btnCancel = block.querySelector(".diary-edit-cancel");
    if (!textarea || !btnStart || !btnSave || !btnCancel) return;

    textarea.dataset.originalValue = textarea.value ?? "";
    textarea.disabled = false;
    btnStart.classList.add("hidden");
    btnSave.classList.remove("hidden");
    btnCancel.classList.remove("hidden");
    textarea.focus();
  }

  async _onDiaryEditSave(event) {
    event.preventDefault();
    const block = event.currentTarget.closest(".diary-block");
    if (!block) return;
    const field = block.dataset.diaryField;
    const textarea = block.querySelector(".diary-textarea");
    const btnStart = block.querySelector(".diary-edit-start");
    const btnSave = block.querySelector(".diary-edit-save");
    const btnCancel = block.querySelector(".diary-edit-cancel");
    if (!field || !textarea || !btnStart || !btnSave || !btnCancel) return;

    await this.actor.update({ [`system.${field}`]: textarea.value ?? "" });
    textarea.disabled = true;
    btnStart.classList.remove("hidden");
    btnSave.classList.add("hidden");
    btnCancel.classList.add("hidden");
  }

  _onDiaryEditCancel(event) {
    event.preventDefault();
    const block = event.currentTarget.closest(".diary-block");
    if (!block) return;
    const textarea = block.querySelector(".diary-textarea");
    const btnStart = block.querySelector(".diary-edit-start");
    const btnSave = block.querySelector(".diary-edit-save");
    const btnCancel = block.querySelector(".diary-edit-cancel");
    if (!textarea || !btnStart || !btnSave || !btnCancel) return;

    textarea.value = textarea.dataset.originalValue ?? textarea.value;
    textarea.disabled = true;
    btnStart.classList.remove("hidden");
    btnSave.classList.add("hidden");
    btnCancel.classList.add("hidden");
  }

  _onConceptEditStart(event) {
    event.preventDefault();
    const row = event.currentTarget.closest(".header-field-concept");
    if (!row) return;
    const input = row.querySelector(".concept-input");
    const btnStart = row.querySelector(".concept-edit-start");
    const btnSave = row.querySelector(".concept-edit-save");
    const btnCancel = row.querySelector(".concept-edit-cancel");
    if (!input || !btnStart || !btnSave || !btnCancel) return;

    input.dataset.originalValue = input.value ?? "";
    input.disabled = false;
    btnStart.classList.add("hidden");
    btnSave.classList.remove("hidden");
    btnCancel.classList.remove("hidden");
    input.focus();
  }

  async _onConceptEditSave(event) {
    event.preventDefault();
    const row = event.currentTarget.closest(".header-field-concept");
    if (!row) return;
    const input = row.querySelector(".concept-input");
    const btnStart = row.querySelector(".concept-edit-start");
    const btnSave = row.querySelector(".concept-edit-save");
    const btnCancel = row.querySelector(".concept-edit-cancel");
    if (!input || !btnStart || !btnSave || !btnCancel) return;

    await this.actor.update({ "system.concept": input.value ?? "" });
    input.disabled = true;
    btnStart.classList.remove("hidden");
    btnSave.classList.add("hidden");
    btnCancel.classList.add("hidden");
  }

  _onConceptEditCancel(event) {
    event.preventDefault();
    const row = event.currentTarget.closest(".header-field-concept");
    if (!row) return;
    const input = row.querySelector(".concept-input");
    const btnStart = row.querySelector(".concept-edit-start");
    const btnSave = row.querySelector(".concept-edit-save");
    const btnCancel = row.querySelector(".concept-edit-cancel");
    if (!input || !btnStart || !btnSave || !btnCancel) return;

    input.value = input.dataset.originalValue ?? input.value;
    input.disabled = true;
    btnStart.classList.remove("hidden");
    btnSave.classList.add("hidden");
    btnCancel.classList.add("hidden");
  }
}
