const { TypeDataModel } = foundry.abstract;
const { HTMLField, NumberField, StringField, BooleanField } = foundry.data.fields;

export const EQUIPMENT_WEAPON_KINDS = ["melee", "firearm"];

export function isEquipmentWeapon(kind) {
  return EQUIPMENT_WEAPON_KINDS.includes(kind ?? "");
}

/**
 * Dano da arma pelo estilo.
 * Arma branca: Porradeiro 2, Malandrão e Genial 1.
 * Arma de fogo: 2 para todos os estilos.
 */
export function equipmentWeaponDamage(style, kind) {
  if (kind === "firearm") return 2;
  if (kind === "melee") return style === "brawler" ? 2 : 1;
  return null;
}

/**
 * Estado de uso de um equipamento.
 * Uso livre ignora estoque. Fora de arma, o botão permanece desabilitado.
 */
export function equipmentUseState(system) {
  const kind = system?.kind ?? "";
  const isWeapon = isEquipmentWeapon(kind);
  const freeUse = !!system?.freeUse;
  const trackAmmo = !!system?.trackAmmo;
  const quantity = Math.max(0, Number(system?.quantity ?? 0));
  const ammo = Math.max(0, Number(system?.ammo ?? 0));
  const noUses = isWeapon && !freeUse && (trackAmmo ? ammo <= 0 : quantity <= 0);
  return {
    kind,
    isWeapon,
    freeUse,
    trackAmmo,
    quantity,
    ammo,
    noUses,
    canUse: isWeapon && !noUses,
    showAmmo: isWeapon && trackAmmo,
  };
}

export class EquipmentModel extends TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField({ required: false, blank: true, initial: "" }),
      quantity: new NumberField({
        required: true,
        integer: true,
        min: 0,
        initial: 1,
      }),
      kind: new StringField({
        required: false,
        blank: true,
        initial: "",
      }),
      trackAmmo: new BooleanField({
        required: true,
        initial: false,
      }),
      ammo: new NumberField({
        required: true,
        integer: true,
        min: 0,
        initial: 0,
      }),
      freeUse: new BooleanField({
        required: true,
        initial: false,
      }),
    };
  }
}
