import { CharacterModel } from "./character-model.js";

// Inimigo: mesmo schema; vida/sanidade máx. editáveis na ficha (sem sobrescrever por estilo).
export class EnemyModel extends CharacterModel {
  prepareDerivedData() {
    // Não aplica CHARACTER_STYLE_STATS — máximos vêm dos dados persistidos.
  }
}
