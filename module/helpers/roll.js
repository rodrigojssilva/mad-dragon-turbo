export class MDTRoll {
  // Dificuldades e seus valores mínimos para sucesso
  static DIFFICULTIES = {
    hidden: { label: "MDT.roll.difficulties.hidden", min: null },
    common: { label: "MDT.roll.difficulties.common", min: 2 },
    challenging: { label: "MDT.roll.difficulties.challenging", min: 4 },
    complex: { label: "MDT.roll.difficulties.complex", min: 6 },
  };

  // Categorias de ação por estilo
  static STYLE_ACTIONS = {
    brawler: "MDT.roll.action.physical",
    genius: "MDT.roll.action.mental",
    trickster: "MDT.roll.action.social",
  };

  // -----------------------------------------------
  // Abre o popup e executa a rolagem
  // -----------------------------------------------
  static async prompt(actor) {
    const style = actor.system.style;

    // Prepara dados para o template do dialog
    const difficulties = Object.entries(MDTRoll.DIFFICULTIES).map(
      ([key, val]) => ({
        key,
        label: val.label,
      }),
    );

    // Label do estilo do personagem para mostrar no dialog
    const styleLabel = style
      ? game.i18n.localize(MDTRoll.STYLE_ACTIONS[style])
      : game.i18n.localize("MDT.roll.noStyle");

    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/mad-dragon-turbo/templates/dialogs/roll-dialog.hbs",
      { difficulties, styleLabel },
    );

    const result = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize("MDT.roll.title") },
      content,
      ok: {
        label: game.i18n.localize("MDT.roll.rollButton"),
        callback: (event, button) => {
          const fd = new foundry.applications.ux.FormDataExtended(button.form);
          return fd.object;
        },
      },
    });

    if (!result) return;
    await MDTRoll.execute(actor, result);
  }

  // -----------------------------------------------
  // Executa a rolagem e manda para o chat
  // -----------------------------------------------
  static async execute(actor, options) {
    const { difficulty, style, specialty, item } = options;
    const actorStyle = actor.system.style;
    const isHidden = difficulty === "hidden";

    // Ação possível sempre garante 1 dado fixo
    let diceCount = 1;
    const breakdownParts = [game.i18n.localize("MDT.roll.bonus.possible")];

    if (style && actorStyle) {
      diceCount++;
      breakdownParts.push(
        game.i18n.localize(MDTRoll.STYLE_ACTIONS[actorStyle]),
      );
    }

    if (specialty) {
      diceCount++;
      breakdownParts.push(game.i18n.localize("MDT.roll.bonus.specialty"));
    }

    if (item) {
      diceCount++;
      breakdownParts.push(game.i18n.localize("MDT.roll.bonus.item"));
    }

    // Máximo de 3 dados independente dos bônus
    diceCount = Math.min(3, diceCount);

    const roll = await new Roll(`${diceCount}d6`).evaluate();
    let results = roll.dice[0].results.map((r) => r.result);
    const originalResults = [...results];
    // console.log("MDT | Resultados:", results);
    // console.log("MDT | Tem 1?", results.includes(1));
    // console.log("MDT | Estilo:", actorStyle);

    // Somente para malandrão
    let rerolledResult = null;
    let rerolledIndex = null;
    if (actorStyle === "trickster" && results.includes(1)) {
      const reroll = await new Roll("1d6").evaluate();
      rerolledResult = reroll.dice[0].results[0].result;
      rerolledIndex = results.indexOf(1);

      // Substitui para análise correta do resultado
      results = [
        ...results.slice(0, rerolledIndex),
        rerolledResult,
        ...results.slice(rerolledIndex + 1),
      ];
    }

    const difficultyData = MDTRoll.DIFFICULTIES[difficulty];

    // Se oculta, analisa apenas resultados absolutos
    let analysis = isHidden
      ? MDTRoll.analyzeHidden(results, actorStyle)
      : MDTRoll.analyze(results, difficultyData.min, actorStyle);

    await MDTRoll.toChat(actor, {
      originalResults,
      results,
      rerolledResult,
      rerolledIndex,
      analysis,
      breakdown: breakdownParts.join(" + "),
      difficultyLabel: isHidden
        ? game.i18n.localize("MDT.roll.difficulties.hiddenLabel")
        : game.i18n.localize(difficultyData.label),
      diceCount,
      isHidden,
    });
  }

  static analyzeHidden(results, style) {
    const sixes = results.filter((r) => r === 6).length;
    const ones = results.filter((r) => r === 1).length;

    if (sixes === 3)
      return {
        label: "MDT.roll.result.spectacular",
        cssClass: "result-spectacular",
      };
    if (sixes === 2)
      return { label: "MDT.roll.result.superb", cssClass: "result-superb" };
    if (sixes === 1 && ones === 0)
      return { label: "MDT.roll.result.success", cssClass: "result-success" };
    if (ones > 0 && sixes === 0)
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
    const hits = results.filter((r) => r >= minSuccess && r !== 1).length;

    if (sixes > 0 && ones > 0)
      return {
        category: "partial",
        label: "MDT.roll.result.partial",
        cssClass: "result-partial",
      };
    if (sixes === 3)
      return {
        category: "spectacular",
        label: "MDT.roll.result.spectacular",
        cssClass: "result-spectacular",
      };
    if (sixes === 2)
      return {
        category: "superb",
        label: "MDT.roll.result.superb",
        cssClass: "result-superb",
      };
    if (sixes === 1)
      return {
        category: "success",
        label: "MDT.roll.result.success",
        cssClass: "result-success",
      };
    if (hits > 0 && ones === 0)
      return {
        category: "success",
        label: "MDT.roll.result.success",
        cssClass: "result-success",
      };
    if (ones > 0)
      return {
        category: "critical",
        label: "MDT.roll.result.critical",
        cssClass: "result-critical",
      };

    return {
      category: "failure",
      label: "MDT.roll.result.failure",
      cssClass: "result-failure",
    };
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
    },
  ) {
    // Renderiza o template do chat
    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/mad-dragon-turbo/templates/chat/roll-result.hbs",
      {
        actorName: actor.name,
        originalResults, // dados originais
        results, // dados finais
        rerolledResult,
        rerolledIndex,
        analysis,
        breakdown,
        difficultyLabel,
        diceCount,
        isHidden,
      },
    );

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      rolls: [],
    });
  }
}
