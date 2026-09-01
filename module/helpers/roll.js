import { CHARACTER_STYLE_STATS } from "../models/actor/character-model.js";

export class MDTRoll {
  static FLAG_SCOPE = "mad-dragon-turbo";

  static ROLL_STATE_FLAG = "rollState";

  static SPELL_USES_FLAG = "spellUses";

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
    if (MDTRoll._chatHooksRegistered) return;
    MDTRoll._chatHooksRegistered = true;

    const apply = (message, html) => {
      MDTRoll.activateChatListeners(message, html);
      MDTRoll.applySpellUsesVisibility(message, html);
    };

    // Foundry v13: renderChatMessageHTML (HTMLElement). v12 legado: renderChatMessage.
    Hooks.on("renderChatMessageHTML", apply);
    Hooks.on("renderChatMessage", apply);
  }

  /** Reaplica visibilidade nas mensagens já renderizadas (ex.: após F5). */
  static refreshSpellUsesVisibilityInChat() {
    for (const message of game.messages ?? []) {
      const el =
        document.querySelector(`.chat-message[data-message-id="${message.id}"]`) ??
        ui.chat?.element?.querySelector?.(`.chat-message[data-message-id="${message.id}"]`);
      if (el) MDTRoll.applySpellUsesVisibility(message, el);
    }
  }

  static activateChatListeners(message, html) {
    const root = MDTRoll._chatHtmlRoot(html);
    if (!root) return;

    root.querySelectorAll(".mdt-reroll-trigger").forEach((button) => {
      if (button.dataset.mdtRerollBound === "1") return;
      button.dataset.mdtRerollBound = "1";
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        await MDTRoll.handleManualReroll(message, button);
      });
    });
  }

  static _chatHtmlRoot(html) {
    if (!html) return null;
    if (html instanceof HTMLElement) return html;
    if (html?.[0] instanceof HTMLElement) return html[0];
    if (typeof html.querySelectorAll === "function") return html;
    return null;
  }

  /** Usos restantes de magia no chat: só dono do personagem e mestre (usuário logado). */
  static userCanSeeSpellUses(message) {
    const user = game.user;
    if (!user) return false;
    if (user.isGM) return true;

    const flagActorId = message.getFlag?.(MDTRoll.FLAG_SCOPE, "actorId");
    const actorId = flagActorId || message.speaker?.actor;
    const actor = actorId ? game.actors.get(actorId) : null;
    if (actor?.isOwner) return true;
    if (
      actor &&
      typeof actor.testUserPermission === "function" &&
      actor.testUserPermission(user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)
    ) {
      return true;
    }

    const authorId =
      message.author?.id ??
      message.user?.id ??
      message._source?.author ??
      message._source?.user;
    if (authorId && authorId === user.id) return true;

    return false;
  }

  static applySpellUsesVisibility(message, html) {
    const root = MDTRoll._chatHtmlRoot(html);
    if (!root) return;

    const privateUses = root.querySelectorAll(".mdt-spell-uses-private");
    if (!privateUses.length) return;

    const canSee = MDTRoll.userCanSeeSpellUses(message);
    privateUses.forEach((el) => {
      el.classList.toggle("mdt-spell-uses-visible", canSee);
      el.hidden = !canSee;
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
        onlyGM: !!state.onlyGM,
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
      return false;
    }

    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/mad-dragon-turbo/templates/dialogs/roll-dialog.hbs",
    );

    const readForm = (button) => new foundry.applications.ux.FormDataExtended(button.form).object;

    const result = await new Promise((resolve) => {
      let settled = false;
      const finish = (payload) => {
        if (settled) return;
        settled = true;
        resolve(payload);
      };

      const app = new foundry.applications.api.DialogV2({
        classes: ["mad-dragon-turbo", "mdt-roll-dialog-app"],
        window: {
          title: game.i18n.localize("MDT.roll.title"),
          contentClasses: ["mad-dragon-turbo", "mdt-roll-dialog-content"],
        },
        position: { width: 310 },
        content,
        buttons: [
          {
            label: "1",
            action: "roll-1d6",
            icon: "fa-solid fa-dice-one",
            callback: (_event, button) => {
              const fd = readForm(button);
              finish({
                difficulty: fd.difficulty,
                diceCount: 1,
                onlyGM: !!fd.onlyGM,
              });
            },
          },
          {
            label: "2",
            action: "roll-2d6",
            icon: "fa-solid fa-dice-two",
            callback: (_event, button) => {
              const fd = readForm(button);
              finish({
                difficulty: fd.difficulty,
                diceCount: 2,
                onlyGM: !!fd.onlyGM,
              });
            },
          },
          {
            label: "3",
            action: "roll-3d6",
            icon: "fa-solid fa-dice-three",
            callback: (_event, button) => {
              const fd = readForm(button);
              finish({
                difficulty: fd.difficulty,
                diceCount: 3,
                onlyGM: !!fd.onlyGM,
              });
            },
          },
          {
            label: game.i18n.localize("MDT.roll.luckEven"),
            action: "luck-even",
            icon: "fa-solid fa-clover",
            callback: (_event, button) => {
              const fd = readForm(button);
              finish({ type: "luck", choice: "even", onlyGM: !!fd.onlyGM });
            },
          },
          {
            label: game.i18n.localize("MDT.roll.luckOdd"),
            action: "luck-odd",
            icon: "fa-solid fa-clover",
            callback: (_event, button) => {
              const fd = readForm(button);
              finish({ type: "luck", choice: "odd", onlyGM: !!fd.onlyGM });
            },
          },
        ],
      });

      app.addEventListener("render", () => {
        MDTRoll._repositionRollDialogButtons(app);
      });
      app.addEventListener("close", () => finish(null), { once: true });
      app.render({ force: true });
    });

    if (!result) return false;

    if (result.type === "luck") {
      await MDTRoll.executeLuck(actor, result);
      return true;
    }
    await MDTRoll.execute(actor, result);
    return true;
  }

  /**
   * Aguarda clique em um token. Mostra diálogo com instrução + Cancelar.
   * Usa coordenadas do canvas (funciona para GM e jogadores).
   */
  static async pickTargetToken({ excludeActorId = null } = {}) {
    if (!canvas?.ready || !canvas.tokens) {
      ui.notifications?.warn(game.i18n.localize("MDT.roll.selectTargetNoCanvas"));
      return null;
    }

    const pointerRoot = MDTRoll._getCanvasPointerRoot();
    if (!pointerRoot) {
      ui.notifications?.warn(game.i18n.localize("MDT.roll.selectTargetNoCanvas"));
      return null;
    }

    const previousCursor =
      pointerRoot.style?.cursor ?? document.body.style.cursor ?? "";
    if (pointerRoot.style) pointerRoot.style.cursor = "crosshair";
    else document.body.style.cursor = "crosshair";

    return new Promise((resolve) => {
      let settled = false;
      let pickerApp = null;

      const cleanup = () => {
        pointerRoot.removeEventListener?.("pointerdown", onPointerDown, true);
        canvas.stage?.off?.("pointerdown", onStagePointerDown);
        document.removeEventListener("keydown", onKeyDown, true);
        if (pointerRoot.style) pointerRoot.style.cursor = previousCursor;
        else document.body.style.cursor = previousCursor;
        if (MDTRoll._cancelTargetPick === cancelQuiet) MDTRoll._cancelTargetPick = null;
        if (pickerApp) {
          const app = pickerApp;
          pickerApp = null;
          app.close({ animate: false }).catch(() => {});
        }
      };

      const finish = (token) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(token);
      };

      const cancelQuiet = () => finish(null);

      const cancel = () => {
        ui.notifications?.info(game.i18n.localize("MDT.roll.selectTargetCancelled"));
        finish(null);
      };

      const onKeyDown = (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          cancel();
        }
      };

      const tryPickToken = (clientX, clientY, event) => {
        if (event?.target?.closest?.(".mdt-select-target-app")) return false;

        const token = MDTRoll._findTokenAtClientPoint(clientX, clientY);
        if (!token) return false;

        const targetActorId = token.actor?.id ?? null;
        if (excludeActorId && targetActorId && targetActorId === excludeActorId) {
          ui.notifications?.warn(game.i18n.localize("MDT.roll.selectTargetOther"));
          event?.preventDefault?.();
          event?.stopPropagation?.();
          return true;
        }

        event?.preventDefault?.();
        event?.stopPropagation?.();
        finish(token);
        return true;
      };

      const onPointerDown = (event) => {
        if (event.button !== 0) return;
        tryPickToken(event.clientX, event.clientY, event);
      };

      const onStagePointerDown = (event) => {
        const button = event.button ?? event.data?.button;
        if (button != null && button !== 0) return;

        const client =
          event.client ??
          (Number.isFinite(event.clientX)
            ? { x: event.clientX, y: event.clientY }
            : null);
        if (!client) {
          // Fallback: token sob o ponteiro do Foundry
          const hovered = canvas.tokens.hover;
          if (!hovered) return;
          const targetActorId = hovered.actor?.id ?? null;
          if (excludeActorId && targetActorId && targetActorId === excludeActorId) {
            ui.notifications?.warn(game.i18n.localize("MDT.roll.selectTargetOther"));
            return;
          }
          finish(hovered);
          return;
        }

        tryPickToken(client.x, client.y, event);
      };

      if (typeof MDTRoll._cancelTargetPick === "function") MDTRoll._cancelTargetPick();
      MDTRoll._cancelTargetPick = cancelQuiet;

      pickerApp = new foundry.applications.api.DialogV2({
        classes: ["mad-dragon-turbo", "mdt-select-target-app"],
        window: {
          title: game.i18n.localize("MDT.roll.target"),
          contentClasses: ["mad-dragon-turbo", "mdt-select-target-content"],
        },
        position: { width: 320 },
        content: `<p class="mdt-select-target-msg">${game.i18n.localize("MDT.roll.selectTargetPrompt")}</p>`,
        modal: false,
        buttons: [
          {
            action: "cancel",
            label: game.i18n.localize("MDT.roll.selectTargetCancel"),
            icon: "fa-solid fa-xmark",
            callback: () => cancel(),
          },
        ],
      });

      pickerApp.addEventListener(
        "close",
        () => {
          if (!settled) cancel();
        },
        { once: true },
      );

      pointerRoot.addEventListener("pointerdown", onPointerDown, true);
      canvas.stage?.on?.("pointerdown", onStagePointerDown);
      document.addEventListener("keydown", onKeyDown, true);
      pickerApp.render({ force: true });
    });
  }

  /** Elemento DOM do canvas (Foundry v13: app.canvas / app.view / #board). */
  static _getCanvasPointerRoot() {
    return (
      canvas.app?.canvas ||
      canvas.app?.view ||
      document.getElementById("board") ||
      document.querySelector("canvas#board") ||
      document.querySelector("#board canvas") ||
      null
    );
  }

  /** Resolve o token sob o ponto do mouse (client coords). */
  static _findTokenAtClientPoint(clientX, clientY) {
    if (!canvas?.ready || !canvas.tokens) return null;

    let x;
    let y;
    if (typeof canvas.canvasCoordinatesFromClient === "function") {
      const coords = canvas.canvasCoordinatesFromClient({ x: clientX, y: clientY });
      x = coords?.x;
      y = coords?.y;
    }

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return canvas.tokens.hover || null;
    }

    const tokens = canvas.tokens.placeables.filter(
      (t) => t.visible && t.renderable !== false && !t.document?.hidden,
    );

    for (let i = tokens.length - 1; i >= 0; i--) {
      const token = tokens[i];
      const bounds = token.bounds;
      if (bounds?.contains?.(x, y)) return token;
    }

    return canvas.tokens.hover || null;
  }

  /** Move os botões do rodapé do DialogV2 para os fieldsets do formulário. */
  static _repositionRollDialogButtons(dialog) {
    const root = dialog?.element ?? dialog;
    if (!root) return;

    const diceSlot = root.querySelector('[data-mdt-button-slot="dice"]');
    const luckSlot = root.querySelector('[data-mdt-button-slot="luck"]');
    if (!diceSlot || !luckSlot) return;
    if (diceSlot.childElementCount || luckSlot.childElementCount) return;

    const footer = root.querySelector(".form-footer");
    if (!footer) return;

    const move = (action, slot) => {
      const btn = footer.querySelector(`button[data-action="${action}"]`);
      if (btn) slot.appendChild(btn);
    };

    move("roll-1d6", diceSlot);
    move("roll-2d6", diceSlot);
    move("roll-3d6", diceSlot);
    move("luck-even", luckSlot);
    move("luck-odd", luckSlot);
  }

  // -----------------------------------------------
  // Sorte (par/ímpar) — rolagem de 1d2
  // -----------------------------------------------
  static async executeLuck(actor, options) {
    if (!MDTRoll.actorHasValidStyle(actor)) {
      ui.notifications?.warn(game.i18n.localize("MDT.styles.required"));
      return;
    }

    const { choice, onlyGM = false } = options;
    if (choice !== "even" && choice !== "odd") return;

    const actorStyle = actor.system.style;
    const styleLabel = game.i18n.localize(`MDT.styles.${actorStyle}`);

    const roll = await new Roll("1d2").evaluate({ allowInteractive: false });
    const face = roll.dice[0].results[0].result;
    const fate = face % 2 === 0 ? "even" : "odd";
    const success = choice === fate;

    const analysis = success
      ? { label: "MDT.roll.result.success", cssClass: "result-success" }
      : { label: "MDT.roll.result.failure", cssClass: "result-failure" };

    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/mad-dragon-turbo/templates/chat/luck-roll-result.hbs",
      {
        actorName: actor.name,
        styleLabel,
        choiceLabel: game.i18n.localize(`MDT.roll.luck.${choice}`),
        fateLabel: game.i18n.localize(`MDT.roll.luck.${fate}`),
        analysis,
      },
    );

    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      rolls: [roll],
    };

    if (onlyGM) ChatMessage.applyRollMode(messageData, "gmroll");
    await ChatMessage.create(messageData, onlyGM ? { rollMode: "gmroll" } : {});
  }

  // -----------------------------------------------
  // Executa a rolagem e manda para o chat
  // -----------------------------------------------
  static async execute(actor, options) {
    if (!MDTRoll.actorHasValidStyle(actor)) {
      ui.notifications?.warn(game.i18n.localize("MDT.styles.required"));
      return;
    }

    const { difficulty, diceCount, onlyGM = false } = options;
    if (!Object.hasOwn(MDTRoll.DIFFICULTIES, difficulty)) {
      ui.notifications?.warn(game.i18n.localize("MDT.roll.invalidDifficulty"));
      return;
    }

    const actorStyle = actor.system.style;
    const isHidden = difficulty === "hidden";

    const styleLabelKey = `MDT.styles.${actorStyle}`;
    const breakdown = game.i18n.localize(styleLabelKey);

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
      onlyGM: !!onlyGM,
      rolls: [roll],
      showRerollButton: canManualReroll,
      rollState: {
        actorId: actor.id,
        style: actorStyle,
        difficulty,
        isHidden,
        onlyGM: !!onlyGM,
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
      onlyGM = false,
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

    if (onlyGM) ChatMessage.applyRollMode(messageData, "gmroll");
    await ChatMessage.create(messageData, onlyGM ? { rollMode: "gmroll" } : {});
  }
}
