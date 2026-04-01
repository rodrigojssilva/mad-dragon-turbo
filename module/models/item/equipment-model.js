const { TypeDataModel } = foundry.abstract;
const { HTMLField, NumberField } = foundry.data.fields;

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
    };
  }
}
