export class MdtItemSheet extends foundry.appv1.sheets.ItemSheet {
  constructor(...args) {
    super(...args);
    /** @type {boolean} */
    this._itemEditing = false;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["mad-dragon-turbo", "sheet", "item"],
      width: 520,
      resizable: true,
      submitOnChange: false,
      submitOnClose: false,
    });
  }

  get template() {
    return `systems/mad-dragon-turbo/templates/items/${this.item.type}-sheet.hbs`;
  }

  async getData(options) {
    const context = await super.getData(options);
    const item = this.item;
    const sys = item.system;
    const systemPlain = !sys
      ? {}
      : typeof sys.toObject === "function"
        ? sys.toObject()
        : foundry.utils.deepClone(sys);
    context.system = systemPlain;
    context.data = systemPlain;
    context.itemEditing = this._itemEditing;

    if (item.type === "spell") {
      context.spellFreeUseActive = !!systemPlain.freeUse;
    }

    return context;
  }

  async close(options = {}) {
    this._itemEditing = false;
    return super.close(options);
  }

  /**
   * Form da ficha.
   */
  _getSheetForm() {
    const el = this.element;
    const root = el?.jquery ? el[0] : el;
    return root?.querySelector?.("form.sheet-form") ?? null;
  }

  /**
   * Lê nome e campos `system.*` do DOM (checkboxes como boolean).
   */
  _serializeFormToFlat(form) {
    const data = {};
    if (!(form instanceof HTMLFormElement)) return data;

    const byName = new Map();
    for (const el of form.querySelectorAll("input, textarea, select")) {
      const name = el.getAttribute("name");
      if (!name) continue;
      const type = el.type;
      if (type === "submit" || type === "button") continue;
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(el);
    }

    for (const [name, elements] of byName) {
      const el = elements[0];
      const type = el.type;

      if (type === "checkbox") {
        data[name] = elements.some((e) => e.checked);
        continue;
      }
      if (type === "radio") {
        const picked = elements.find((e) => e.checked);
        if (picked) data[name] = picked.value;
        continue;
      }
      data[name] = el.value;
    }

    return data;
  }

  async _persistFromForm(form) {
    const flat = this._serializeFormToFlat(form);
    const expanded = foundry.utils.expandObject(flat);
    const name = (flat.name ?? "").toString().trim() || this.item.name;
    const sysIn = expanded.system ?? {};

    if (this.item.type === "specialty") {
      return this.item.update({
        name,
        system: {
          description: sysIn.description ?? "",
        },
      });
    }

    if (this.item.type === "equipment") {
      return this.item.update({
        name,
        system: {
          description: sysIn.description ?? "",
          quantity: Math.max(0, Number(sysIn.quantity ?? 1)),
        },
      });
    }

    if (this.item.type === "spell") {
      const highLevel = !!sysIn.highLevel;
      const freeUse = !!sysIn.freeUse;
      let maxUses = 0;
      let usedUses = Math.max(0, Number(this.item.system.usedUses ?? 0));

      if (freeUse) {
        maxUses = 0;
        usedUses = 0;
      } else {
        maxUses = Math.max(0, Number(sysIn.maxUses ?? 0));
        usedUses = Math.min(maxUses, usedUses);
      }

      return this.item.update({
        name,
        system: {
          description: sysIn.description ?? "",
          highLevel,
          level: highLevel ? "high" : "low",
          freeUse,
          maxUses,
          usedUses,
        },
      });
    }

    return undefined;
  }

  _onItemEditStart(event) {
    event.preventDefault();
    this._itemEditing = true;
    this.render();
  }

  async _onItemEditSave(event) {
    event.preventDefault();
    const form = this._getSheetForm();
    if (!form) return;

    await this._persistFromForm(form);
    this._itemEditing = false;
    this.render();
  }

  _onItemEditCancel(event) {
    event.preventDefault();
    this._itemEditing = false;
    this.render();
  }

  activateListeners(html) {
    super.activateListeners(html);
    const el = html[0];
    if (!el) return;

    const form = el.querySelector("form.sheet-form");
    if (form) {
      form.addEventListener("submit", (ev) => {
        ev.preventDefault();
      });
    }

    if (!this.isEditable) return;

    el.querySelector(".item-edit-start")?.addEventListener("click", this._onItemEditStart.bind(this));
    el.querySelector(".item-edit-save")?.addEventListener("click", this._onItemEditSave.bind(this));
    el.querySelector(".item-edit-cancel")?.addEventListener("click", this._onItemEditCancel.bind(this));

    if (this._itemEditing && this.item.type === "spell") {
      const freeUse = form?.querySelector('[name="system.freeUse"]');
      const maxEl = form?.querySelector(".spell-max-uses-input");
      const sync = () => {
        const on = !!freeUse?.checked;
        if (maxEl) maxEl.disabled = on;
      };
      freeUse?.addEventListener("change", sync);
      sync();
    }
  }
}
