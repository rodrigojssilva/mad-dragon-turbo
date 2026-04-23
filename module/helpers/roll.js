import { CHARACTER_STYLE_STATS } from "../models/actor/character-model.js";

export class MDTRoll {
  static FLAG_SCOPE = "mad-dragon-turbo";

  static ROLL_STATE_FLAG = "rollState";

  // Dificuldades e seus valores mínimos para sucesso (UI: radios em grupos no diálogo)
  static DIFFICULTIES = {
    hidden: { label: "MDT.roll.difficulties.hidden", min: null },
    common2: { label: "MDT.roll.difficulties.common2", min: 2 },
    common3: { label: "MDT.roll.difficulties.common3", min: 3 },
    challenging4: { label: "MDT.roll.difficulties.challenging4", min: 4 },
    challenging5: { label: "MDT.roll.difficulties.challenging5", min: 5 },
    complex: { label: "MDT.roll.difficulties.complex", min: 6 },
  };

  // Categorias de ação por estilo
  static STYLE_ACTIONS = {
    brawler: "MDT.roll.action.physical",
    genius: "MDT.roll.action.mental",
    trickster: "MDT.roll.action.social",
  };

  /** Estilo obrigatório: um dos três definidos em CHARACTER_STYLE_STATS. */
  static actorHasValidStyle(actor) {
    const s = actor?.system?.style;
    return typeof s === "string" && s !== "" && Object.hasOwn(CHARACTER_STYLE_STATS, s);
  }

  static registerChatHooks() {
    Hooks.on("renderChatMessage", (message, html) => {
      MDTRoll.activateChatListeners(message, html);
    });
  }

  static activateChatListeners(message, html) {
    const root = html?.[0] ?? html;
    if (!root) return;

    root.querySelectorAll(".mdt-reroll-trigger").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        await MDTRoll.handleManualReroll(message, button);
      });
    });
  }

  static userCanTriggerReroll(message, actor) {
    if (game.user?.isGM) return true;
    if (message.user?.id === game.user?.id) return true;
    if (actor?.isOwner) return true;
    return false;
  }

  static async handleManualReroll(message, button) {
    const state = message.getFlag(MDTRoll.FLAG_SCOPE, MDTRoll.ROLL_STATE_FLAG);
    if (!state) return;
    if (state.rerollUsed) {
      ui.notifications?.info(game.i18n.localize("MDT.roll.rerollAlreadyUsed"));
      return;
    }

    const actor = game.actors.get(state.actorId);
    if (!actor) {
      ui.notifications?.warn(game.i18n.localize("MDT.roll.rerollActorMissing"));
      return;
    }

    if (!MDTRoll.userCanTriggerReroll(message, actor)) {
      ui.notifications?.warn(game.i18n.localize("MDT.roll.rerollNotAllowed"));
      return;
    }

    if (actor.system.style !== "trickster") {
      ui.notifications?.warn(game.i18n.localize("MDT.roll.rerollNotAllowed"));
      return;
    }

    const baseResults = Array.isArray(state.currentResults) ? [...state.currentResults] : [];
    const rerolledIndex = baseResults.indexOf(1);
    if (rerolledIndex < 0) {
      ui.notifications?.warn(game.i18n.localize("MDT.roll.rerollNoOne"));
      return;
    }

    button.disabled = true;

    try {
      const reroll = await new Roll("1d6").evaluate({ allowInteractive: false });
      const rerolledResult = reroll.dice[0].results[0].result;
      const results = [
        ...baseResults.slice(0, rerolledIndex),
        rerolledResult,
        ...baseResults.slice(rerolledIndex + 1),
      ];

      const difficultyKey = state.difficulty;
      const difficultyData = MDTRoll.DIFFICULTIES[difficultyKey];
      const isHidden = Boolean(state.isHidden);
      const actorStyle = actor.system.style;
      const analysis = isHidden
        ? MDTRoll.analyzeHidden(results, actorStyle)
        : MDTRoll.analyze(results, difficultyData.min, actorStyle);
      const difficultyLabel = isHidden
        ? game.i18n.localize("MDT.roll.difficulties.hiddenLabel")
        : game.i18n.localize(difficultyData.label);

      const updatedState = {
        ...state,
        currentResults: results,
        rerollUsed: true,
        rerolledResult,
        rerolledIndex,
      };

      await MDTRoll.toChat(actor, {
        originalResults: Array.isArray(state.originalResults) ? state.originalResults : baseResults,
        results,
        rerolledResult,
        rerolledIndex,
        analysis,
        breakdown: state.breakdown,
        difficultyLabel,
        diceCount: state.diceCount,
        isHidden,
        rolls: [reroll],
        showRerollButton: false,
        rollState: updatedState,
      });

      await message.setFlag(MDTRoll.FLAG_SCOPE, MDTRoll.ROLL_STATE_FLAG, updatedState);
    } catch (error) {
      console.error("MDT | Falha ao aplicar re-rolagem manual:", error);
      ui.notifications?.error(game.i18n.localize("MDT.roll.rerollFailed"));
      button.disabled = false;
    }
  }

  // -----------------------------------------------
  // Abre o popup e executa a rolagem
  // -----------------------------------------------
  static async prompt(actor) {
    if (!MDTRoll.actorHasValidStyle(actor)) {
      ui.notifications?.warn(game.i18n.localize("MDT.styles.required"));
      return;
    }

    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/mad-dragon-turbo/templates/dialogs/roll-dialog.hbs",
    );


    const result = await foundry.applications.api.DialogV2.wait({
      classes: ["mad-dragon-turbo", "mdt-roll-dialog-app"],
      window: {
        title: game.i18n.localize("MDT.roll.title"),
        contentClasses: ["mad-dragon-turbo", "mdt-roll-dialog-content"],
      },
      content,
      buttons: [
        {
          label: "1",
          action: "roll-1d6",
          icon: "fa-solid fa-dice-one",
          callback: (event, button) => {
            const fd = new foundry.applications.ux.FormDataExtended(button.form);
            return { difficulty: fd.object.difficulty, diceCount: 1 };
          },
        },
        {
          label: "2",
          action: "roll-2d6",
          icon: "fa-solid fa-dice-two",
          callback: (event, button) => {
            const fd = new foundry.applications.ux.FormDataExtended(button.form);
            return { difficulty: fd.object.difficulty, diceCount: 2 };
          },
        },
        {
          label: "3",
          action: "roll-3d6",
          icon: "fa-solid fa-dice-three",
          callback: (event, button) => {
            const fd = new foundry.applications.ux.FormDataExtended(button.form);
            return { difficulty: fd.object.difficulty, diceCount: 3 };
          },
        },
      ],
    });

    if (!result) return;
    await MDTRoll.execute(actor, result);
  }

  // -----------------------------------------------
  // Executa a rolagem e manda para o chat
  // -----------------------------------------------
  static async execute(actor, options) {
    if (!MDTRoll.actorHasValidStyle(actor)) {
      ui.notifications?.warn(game.i18n.localize("MDT.styles.required"));
      return;
    }

    const { difficulty, diceCount } = options;
    if (!Object.hasOwn(MDTRoll.DIFFICULTIES, difficulty)) {
      ui.notifications?.warn(game.i18n.localize("MDT.roll.invalidDifficulty"));
      return;
    }

    const actorStyle = actor.system.style;
    const isHidden = difficulty === "hidden";

    const breakdownParts = [game.i18n.localize("MDT.roll.bonus.diceCount")];
    const breakdown = breakdownParts.join(" + ");

    const roll = await new Roll(`${diceCount}d6`).evaluate({ allowInteractive: false });
    const results = roll.dice[0].results.map((r) => r.result);
    const originalResults = [...results];

    const difficultyData = MDTRoll.DIFFICULTIES[difficulty];

    // Se oculta, analisa apenas resultados absolutos
    const analysis = isHidden
      ? MDTRoll.analyzeHidden(results, actorStyle)
      : MDTRoll.analyze(results, difficultyData.min, actorStyle);

    const difficultyLabel = isHidden
      ? game.i18n.localize("MDT.roll.difficulties.hiddenLabel")
      : game.i18n.localize(difficultyData.label);
    const canManualReroll = actorStyle === "trickster" && results.includes(1);

    await MDTRoll.toChat(actor, {
      originalResults,
      results,
      rerolledResult: null,
      rerolledIndex: null,
      analysis,
      breakdown,
      difficultyLabel,
      diceCount,
      isHidden,
      rolls: [roll],
      showRerollButton: canManualReroll,
      rollState: {
        actorId: actor.id,
        style: actorStyle,
        difficulty,
        isHidden,
        diceCount,
        breakdown,
        originalResults,
        currentResults: results,
        rerollUsed: !canManualReroll,
      },
    });
  }

  static analyzeHidden(results, style) {
    const sixes = results.filter((r) => r === 6).length;
    const ones = results.filter((r) => r === 1).length;
    const sorted = [...results].sort((a, b) => a - b);
    const key = sorted.join(",");

    if (sixes === 3)
      return {
        label: "MDT.roll.result.spectacular",
        cssClass: "result-spectacular",
        specialFlavorKey: "MDT.roll.specialFlavor.spectacular",
      };
    if (sixes === 2 && ones === 0)
      return {
        label: "MDT.roll.result.superb",
        cssClass: "result-superb",
        specialFlavorKey: "MDT.roll.specialFlavor.superb",
      };

    if (ones === 3) return { label: "MDT.roll.result.critical", cssClass: "result-critical" };
    if (ones === 2 && sixes === 1)
      return { label: "MDT.roll.result.critical", cssClass: "result-critical" };
    if (results.length === 2 && ones === 2 && sixes === 0)
      return { label: "MDT.roll.result.critical", cssClass: "result-critical" };
    if (ones === 2 && sixes === 0)
      return { label: "MDT.roll.result.failure_maybe", cssClass: "result-failure" };

    if (results.length === 2 && ones === 1 && sixes === 0)
      return { label: "MDT.roll.result.failure", cssClass: "result-failure" };

    if (sixes > 0 && ones > 0)
      return { label: "MDT.roll.result.partial_maybe", cssClass: "result-partial" };

    if (results.length === 3 && sixes === 1 && ones === 0) {
      // Mantem o "jogo de incerteza" aprovado na tabela verdade das rolagens ocultas.
      const successMaybeKeys = new Set([
        "2,3,6",
        "2,4,6",
        "2,5,6",
        "3,3,6",
        "3,4,6",
        "3,5,6",
        "5,5,6",
      ]);
      if (successMaybeKeys.has(key))
        return { label: "MDT.roll.result.success_maybe", cssClass: "result-success" };
    }

    if (results.length === 1 && ones === 1)
      return { label: "MDT.roll.result.critical", cssClass: "result-critical" };

    // Zona cinza — Mestre decide
    return { label: "MDT.roll.result.maybe", cssClass: "result-maybe" };
  }

  // -----------------------------------------------
  // Analisa os resultados e retorna a categoria
  // -----------------------------------------------
  static analyze(results, minSuccess, style) {
    const sixes = results.filter((r) => r === 6).length;
    const ones = results.filter((r) => r === 1).length;
    const hits = results.filter((r) => r >= minSuccess).length;
    const effectiveHits = hits - ones;

    if (sixes === 3)
      return {
        category: "spectacular",
        label: "MDT.roll.result.spectacular",
        cssClass: "result-spectacular",
        specialFlavorKey: "MDT.roll.specialFlavor.spectacular",
      };

    // Dois 6 com nenhum 1 vira Primoroso.
    if (sixes === 2 && ones === 0)
      return {
        category: "superb",
        label: "MDT.roll.result.superb",
        cssClass: "result-superb",
        specialFlavorKey: "MDT.roll.specialFlavor.superb",
      };

    // Caso especial confirmado em regra: 6 + 1 sem acerto liquido = Parcial.
    if (sixes > 0 && ones === 1 && effectiveHits <= 0)
      return { category: "partial", label: "MDT.roll.result.partial", cssClass: "result-partial" };

    if (effectiveHits > 0)
      return { category: "success", label: "MDT.roll.result.success", cssClass: "result-success" };

    // Falha critica apenas quando nao existe acerto bruto e ha pelo menos um 1.
    if (hits === 0 && ones > 0)
      return { category: "critical", label: "MDT.roll.result.critical", cssClass: "result-critical" };

    return { category: "failure", label: "MDT.roll.result.failure", cssClass: "result-failure" };
  }

  // -----------------------------------------------
  // Envia a mensagem formatada para o chat
  // -----------------------------------------------
  static async toChat(
    actor,
    {
      originalResults,
      results,
      rerolledResult,
      rerolledIndex,
      analysis,
      breakdown,
      difficultyLabel,
      diceCount,
      isHidden,
      rolls,
      showRerollButton = false,
      rollState = null,
    },
  ) {
    // Renderiza o template do chat
    const specialFlavorText = analysis.specialFlavorKey
      ? game.i18n.localize(analysis.specialFlavorKey)
      : "";

    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/mad-dragon-turbo/templates/chat/roll-result.hbs",
      {
        actorName: actor.name,
        originalResults, // dados originais
        results, // dados finais
        rerolledResult,
        rerolledIndex,
        analysis,
        specialFlavorText,
        breakdown,
        difficultyLabel,
        diceCount,
        isHidden,
        showRerollButton,
      },
    );

    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      rolls,
    };

    if (rollState) {
      messageData.flags = {
        [MDTRoll.FLAG_SCOPE]: {
          [MDTRoll.ROLL_STATE_FLAG]: rollState,
        },
      };
    }

    await ChatMessage.create(messageData);
  }
}
