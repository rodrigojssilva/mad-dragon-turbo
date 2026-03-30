const { TypeDataModel } = foundry.abstract;
const { HTMLField } = foundry.data.fields;

export class EquipmentModel extends TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField({ required: false, blank: true, initial: "" }),
    };
  }
}
