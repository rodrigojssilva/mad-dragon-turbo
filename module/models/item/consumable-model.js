const { TypeDataModel } = foundry.abstract;
const { HTMLField, NumberField, StringField } = foundry.data.fields;

export class ConsumableModel extends TypeDataModel {
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
    };
  }
}
