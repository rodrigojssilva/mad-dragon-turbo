/**
 * Registra partials Handlebars usados nas fichas MDT.
 * Deve rodar em Hooks.once("init") antes de qualquer render da ficha.
 */
export async function registerMdtPartials() {
    const prefix = "systems/mad-dragon-turbo/templates/actors/partials";
    const partials = [
      ["mdt/character-header", `${prefix}/character-sheet-header.hbs`],
      ["mdt/character-tabs-nav", `${prefix}/character-tabs-nav.hbs`],
      ["mdt/character-style-section", `${prefix}/character-style-section.hbs`],
      ["mdt/character-vitals-row", `${prefix}/character-vitals-row.hbs`],
      ["mdt/character-tab-characteristics", `${prefix}/character-tab-characteristics.hbs`],
      ["mdt/character-equipment-list", `${prefix}/character-equipment-list.hbs`],
      ["mdt/character-spells-list", `${prefix}/character-spells-list.hbs`],
      ["mdt/character-tab-diary", `${prefix}/character-tab-diary.hbs`],
    ];
  
    for (const [name, path] of partials) {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`MDT | Falha ao carregar partial: ${path}`);
      const source = await res.text();
      Handlebars.registerPartial(name, source);
    }
  }