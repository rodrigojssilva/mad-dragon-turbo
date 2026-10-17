import { CHARACTER_STYLE_STATS } from "../models/actor/character-model.js";

export class MadDragonActor extends Actor {

  prepareData() {
    super.prepareData();
  }

  async _preUpdate(changes, options, user) {
    const allowed = await super._preUpdate(changes, options, user);
    if (allowed === false) return false;
    if (this.type !== "character" || !changes.system) return allowed;

    const styleChanged =
      Object.prototype.hasOwnProperty.call(changes.system, "style") &&
      changes.system.style !== this.system.style;
    const stats = styleChanged ? CHARACTER_STYLE_STATS[changes.system.style] : null;

    if (stats) {
      const healthValue = changes.system.health?.value ?? this.system.health?.value ?? 0;
      const sanityValue = changes.system.sanity?.value ?? this.system.sanity?.value ?? 0;
      changes.system.health = {
        ...changes.system.health,
        max: stats.healthMax,
        value: Math.min(Math.max(0, Number(healthValue)), stats.healthMax),
      };
      changes.system.sanity = {
        ...changes.system.sanity,
        max: stats.sanityMax,
        value: Math.min(Math.max(0, Number(sanityValue)), stats.sanityMax),
      };
      return allowed;
    }

    if (this._isGmUser(user)) return allowed;

    if (changes.system.health && "max" in changes.system.health) {
      delete changes.system.health.max;
    }
    if (changes.system.sanity && "max" in changes.system.sanity) {
      delete changes.system.sanity.max;
    }
    return allowed;
  }

  _isGmUser(user) {
    const doc = typeof user === "string" ? game.users.get(user) : user;
    return Boolean(doc?.isGM);
  }
}