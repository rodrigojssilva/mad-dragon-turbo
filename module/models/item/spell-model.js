const { TypeDataModel } = foundry.abstract;
const { StringField, HTMLField, NumberField, BooleanField } = foundry.data.fields;

export class SpellModel extends TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField({
        required: false,
        blank: true,
        initial: "",
      }),
      level: new StringField({
        required: true,
        initial: "low",
        choices: ["low", "high"],
      }),
      highLevel: new BooleanField({
        required: true,
        initial: false,
      }),
      maxUses: new NumberField({
        required: true,
        integer: true,
        min: 0,
        initial: 0,
      }),
      usedUses: new NumberField({
        required: true,
        integer: true,
        min: 0,
        initial: 0,
      }),
      cost: new StringField({ required: false, blank: true, initial: "" }),
    };
  }
}
