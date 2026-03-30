const { TypeDataModel } = foundry.abstract;
const { StringField, HTMLField } = foundry.data.fields;

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
      cost: new StringField({ required: false, blank: true, initial: "" }),
    };
  }
}
