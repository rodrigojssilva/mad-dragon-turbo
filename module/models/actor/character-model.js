const { TypeDataModel } = foundry.abstract;
const { StringField, NumberField, HTMLField } = foundry.data.fields;

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
    this._applyStyleStats();
  }

  _applyStyleStats() {
    const STYLE_STATS = {
      brawler: { healthMax: 5, sanityMax: 3 },
      genius: { healthMax: 3, sanityMax: 5 },
      trickster: { healthMax: 3, sanityMax: 3 },
    };

    const stats = STYLE_STATS[this.style];
    if (!stats) return;

    this.health.max = stats.healthMax;
    this.sanity.max = stats.sanityMax;
    this.health.value = Math.min(this.health.value, stats.healthMax);
    this.sanity.value = Math.min(this.sanity.value, stats.sanityMax);
  }
}
