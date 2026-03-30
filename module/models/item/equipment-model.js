const { TypeDataModel } = foundry.abstract;
const { StringField } = foundry.data.fields;

export class EquipmentModel extends TypeDataModel {
  static defineSchema() {
    return {
      description: new StringField({ required: false, blank: true, initial: "" })
    };
  }
}