import { isEquipmentWeapon } from "../models/item/equipment-model.js";
import { itemKindIconClass, itemKindLabel } from "../helpers/item-kind-icon.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class MdtItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  constructor(arg0 = {}, arg1 = {}) {
    const isDocument = arg0?.documentName === "Item";
    super(isDocument ? { ...arg1, document: arg0 } : arg0);
    /** @type {boolean} */
    this._itemEditing = false;
  }

  static DEFAULT_OPTIONS = {
    classes: ["mad-dragon-turbo", "sheet", "item"],
    tag: "div",
    position: {
      width: 520,
    },
    window: {
      resizable: true,
    },
    form: {
      submitOnChange: false,
      closeOnSubmit: false,
    },
  };

  static PARTS = {
    sheet: {
      template: "systems/mad-dragon-turbo/templates/items/specialty-sheet.hbs",
    },
  };

  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    const type = this.item?.type;
    if (parts.sheet && type) {
      parts.sheet.template = `systems/mad-dragon-turbo/templates/items/${type}-sheet.hbs`;
    }
    return parts;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.item = this.item;
    context.editable = this.isEditable;
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

    if (item.type === "equipment" || item.type === "consumable") {
      const kind = systemPlain.kind ?? "";
      const requiresKind = !!item.getFlag("mad-dragon-turbo", "requiresKind");
      context.requiresKind = requiresKind;
      if (requiresKind && !kind && !this._kindPrompted) {
        this._kindPrompted = true;
        this._itemEditing = true;
        context.itemEditing = true;
      }
      context.kindIcon = itemKindIconClass(kind);
      context.kindLabel = itemKindLabel(item.type, kind);
      if (item.type === "equipment") {
        context.equipmentIsWeapon = isEquipmentWeapon(kind);
        context.equipmentFreeUseActive = !!systemPlain.freeUse && context.equipmentIsWeapon;
      }
      if (item.type === "consumable") {
        context.consumableFreeUseActive = !!systemPlain.freeUse;
      }
    }

    return context;
  }

  async close(options = {}) {
    this._itemEditing = false;
    this._kindPrompted = false;
    return super.close(options);
  }

  /**
   * Form da ficha.
   */
  _getSheetForm() {
    const el = this.element;
    const root = el instanceof HTMLElement ? el : el?.[0];
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

  /**
   * Remove recuos artificiais em textos multiline preservando o conteúdo.
   */
  _normalizeMultilineText(value) {
    const text = (value ?? "").toString().replace(/\r\n/g, "\n");
    const lines = text.split("\n");
    if (lines.length <= 1) return text.trimEnd();

    const firstIndent = (lines[0].match(/^[ \t]*/) ?? [""])[0].length;
    const laterNonEmpty = lines.slice(1).filter((l) => l.trim().length > 0);
    if (!laterNonEmpty.length) return text.trimEnd();

    const laterIndents = laterNonEmpty.map((l) => {
      const m = l.match(/^[ \t]*/);
      return m ? m[0].length : 0;
    });
    const minLaterIndent = Math.min(...laterIndents);

    if (minLaterIndent > firstIndent) {
      const removeCount = minLaterIndent - firstIndent;
      for (let i = 1; i < lines.length; i += 1) {
        lines[i] = lines[i].replace(new RegExp(`^[ \\t]{0,${removeCount}}`), "");
      }
    }

    return lines.join("\n").trimEnd();
  }

  async _persistFromForm(form) {
    const flat = this._serializeFormToFlat(form);
    const expanded = foundry.utils.expandObject(flat);
    const name = (flat.name ?? "").toString().trim() || this.item.name;
    const sysIn = expanded.system ?? {};
    const description = this._normalizeMultilineText(sysIn.description ?? "");

    if (this.item.type === "specialty") {
      return this.item.update({
        name,
        system: {
          description,
        },
      });
    }

    if (this.item.type === "equipment" || this.item.type === "consumable") {
      const kind = (sysIn.kind ?? "").toString();
      const requiresKind = !!this.item.getFlag("mad-dragon-turbo", "requiresKind");
      if (requiresKind && !kind) {
        const key = this.item.type === "consumable"
          ? "MDT.consumable.kindRequired"
          : "MDT.equipment.kindRequired";
        ui.notifications?.warn(game.i18n.localize(key));
        return false;
      }

      const quantity = Math.max(0, Number(sysIn.quantity ?? 1));
      const system = {
        description,
        quantity,
        kind,
      };
      if (this.item.type === "equipment") {
        system.trackAmmo = !!sysIn.trackAmmo;
        system.ammo = Math.max(0, Number(sysIn.ammo ?? 0));
        system.freeUse = !!sysIn.freeUse;
      }
      if (this.item.type === "consumable") {
        system.freeUse = !!sysIn.freeUse;
      }

      const update = { name, system };
      if (requiresKind && kind) update["flags.mad-dragon-turbo.-=requiresKind"] = null;
      return this.item.update(update);
    }

    if (this.item.type === "spell") {
      const highLevel = !!sysIn.highLevel;
      const freeUse = !!sysIn.freeUse;
      const ready = !!sysIn.ready;
      let maxUses = 0;
      let usedUses = Math.max(0, Number(this.item.system.usedUses ?? 0));

      if (freeUse) {
        maxUses = 0;
        usedUses = 0;
      } else {
        maxUses = Math.max(0, Number(sysIn.maxUses ?? 0));
        usedUses = Math.min(maxUses, usedUses);
      }

      const duration = (sysIn.duration ?? "").toString().trim();

      return this.item.update({
        name,
        system: {
          description,
          duration,
          highLevel,
          level: highLevel ? "high" : "low",
          freeUse,
          ready,
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

    const saved = await this._persistFromForm(form);
    if (saved === false) return;
    this._itemEditing = false;
    this.render();
  }

  _onItemEditCancel(event) {
    event.preventDefault();
    this._itemEditing = false;
    this.render();
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const el = this.element instanceof HTMLElement ? this.element : this.element?.[0];
    if (!el) return;

    this._bindPortraitEditor(el);
    this._normalizeTextareasInRoot(el);

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

    if (this._itemEditing && this.item.type === "equipment") {
      const kindEl = form?.querySelector('[name="system.kind"]');
      const trackAmmoEl = form?.querySelector(".equipment-track-ammo-input");
      const ammoEl = form?.querySelector(".equipment-ammo-input");
      const freeUseEl = form?.querySelector(".equipment-free-use-input");
      const syncWeapon = () => {
        const isWeapon = kindEl?.value === "melee" || kindEl?.value === "firearm";
        if (trackAmmoEl) trackAmmoEl.disabled = !isWeapon;
        if (ammoEl) ammoEl.disabled = !isWeapon;
        if (freeUseEl) freeUseEl.disabled = !isWeapon;
      };
      kindEl?.addEventListener("change", syncWeapon);
      syncWeapon();
    }
  }

  _bindPortraitEditor(root) {
    const img = root.querySelector('img.profile-img[data-edit="img"]');
    if (!img || img.dataset.mdtImgBound === "1") return;
    img.dataset.mdtImgBound = "1";
    img.addEventListener("click", (event) => {
      if (!this.isEditable) return;
      event.preventDefault();
      const FilePickerImpl =
        foundry.applications.apps.FilePicker?.implementation ??
        foundry.applications.apps.FilePicker;
      const picker = new FilePickerImpl({
        type: "image",
        current: this.item.img,
        callback: (path) => this.item.update({ img: path }),
      });
      return picker.browse();
    });
  }

  _normalizeTextareasInRoot(root) {
    root.querySelectorAll("textarea").forEach((textarea) => {
      const normalized = this._normalizeMultilineText(textarea.value);
      if (normalized !== textarea.value) textarea.value = normalized;
    });
  }
}
