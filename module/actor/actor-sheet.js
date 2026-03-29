export class MadDragonActorSheet extends ActorSheet {

  /** Define as opções padrão da janela da ficha */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["mad-dragon-turbo", "sheet", "actor"],
      width: 520,
      height: 480,
      tabs: []
    });
  }

  /** Diz ao Foundry qual template HTML usar */
  get template() {
    return `systems/mad-dragon-turbo/templates/actors/${this.actor.type}-sheet.hbs`;
  }

  /** Prepara os dados que serão enviados para o template */
  async getData() {
    const context = await super.getData();
    context.system = this.actor.system;
    context.actor = this.actor;
    return context;
  }

  /** Registra os eventos de clique e interação da ficha */
  activateListeners(html) {
    super.activateListeners(html);
    // Aqui vamos adicionar os cliques e interações
  }
}