import { CharacterModel } from "./character-model.js";

// NPC: mesmo schema que o personagem; vida/sanidade máx. são editáveis na ficha (sem sobrescrever por estilo).
export class NpcModel extends CharacterModel {
  prepareDerivedData() {
    // Não aplica CHARACTER_STYLE_STATS — máximos vêm dos dados persistidos.
  }
}
