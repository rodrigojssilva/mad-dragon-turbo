const { TypeDataModel } = foundry.abstract;
const { StringField, NumberField, HTMLField } = foundry.data.fields;

/** Vida máx / sanidade máx por estilo (regras do sistema). */
export const CHARACTER_STYLE_STATS = {
  brawler: { healthMax: 5, sanityMax: 3 },
  genius: { healthMax: 3, sanityMax: 5 },
  trickster: { healthMax: 3, sanityMax: 3 },
};

export class CharacterModel extends TypeDataModel {
  static defineSchema() {
    return {
      concept: new StringField({ required: false, blank: true, initial: "" }),
      style: new StringField({ required: false, blank: true, initial: "" }),
      health: new foundry.data.fields.SchemaField({
        value: new NumberField({
          required: true,
          integer: true,
          initial: 3,
          min: 0,
        }),
        max: new NumberField({
          required: true,
          integer: true,
          initial: 3,
          min: 0,
        }),
      }),
      sanity: new foundry.data.fields.SchemaField({
        value: new NumberField({
          required: true,
          integer: true,
          initial: 3,
          min: 0,
        }),
        max: new NumberField({
          required: true,
          integer: true,
          initial: 3,
          min: 0,
        }),
      }),
      notes: new HTMLField({ required: false, blank: true, initial: "" }),
      resources: new StringField({ required: false, blank: true, initial: "" }),
    };
  }

  prepareDerivedData() {
    const healthMax = Math.max(0, Number(this.health?.max ?? 0));
    const sanityMax = Math.max(0, Number(this.sanity?.max ?? 0));
    this.health.value = Math.min(Math.max(0, Number(this.health?.value ?? 0)), healthMax);
    this.sanity.value = Math.min(Math.max(0, Number(this.sanity?.value ?? 0)), sanityMax);
  }
}
