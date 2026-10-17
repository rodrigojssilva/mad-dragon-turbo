# Mad Dragon Turbo 2.0.0

Este texto explica a atualização do sistema no Foundry e as regras como a ficha se comporta hoje. A primeira parte serve para quem joga. A segunda parte repete a mudança com o nome das peças do código, para quem mexe no sistema.

O pacote declara Foundry mínimo 13, verificado na 14 e máximo 16.

## O que a mesa vê

A ficha continua a mesma. Personagem, NPC e inimigo usam as mesmas abas, os mesmos campos e os mesmos botões. Vida, sanidade, estilo, magias, itens, diário e rolagens não mudam de regra.

Um mundo já em jogo abre com os valores que já estavam salvos. Não há passo de converter ficha e não há tela nova para preencher de novo.

O que some é o aviso vermelho no console ao abrir a ficha e ao postar mensagem no chat. Esse aviso é para quem desenvolve o sistema. Não é um erro de regra.

## O que não muda

- Os campos salvos do personagem, do NPC, do inimigo e dos itens.
- Os tipos: personagem, NPC, inimigo, especialidade, magia, equipamento e consumível.
- O nome das fichas no Foundry (`MadDragonActorSheet` e `MdtItemSheet`) e o id `mad-dragon-turbo`. A mesa continua abrindo a ficha que já estava escolhida.
- Os textos dos templates e o jeito de editar: lápis, salvar, cancelar, vida e sanidade ao sair do campo, estilo, e arrastar item com duplicar, sobrescrever ou somar quantidade.

## Linha do tempo do Foundry

O Foundry avisa antes de apagar uma forma antiga de programar.

- **Versão 12.** Passa a existir a forma nova de janelas, chamada Application V2. O autor da mensagem de chat muda de nome: deixa de ser `user` e passa a ser `author`. A forma antiga ainda funciona.
- **Versão 13.** As duas formas convivem. O console avisa que a forma antiga está marcada para sair. O Mad Dragon Turbo 1.8 ainda usava essa forma antiga, por isso o aviso aparecia mesmo com a ficha funcionando. A build de referência da mesa é a 13.351.
- **Versão 14.** A mais recente no momento desta migração é a 14.369. O atalho `user` das mensagens de chat deixa de existir. Quem ainda gravar a mensagem no nome antigo pode perder o autor. As janelas antigas ainda abrem, com aviso.
- **Versão 15.** O gancho antigo do chat, `renderChatMessage`, sai de vez. Só resta o gancho novo, que entrega o HTML direto, sem jQuery. Um gancho é o aviso que o Foundry manda ao sistema quando algo acontece, neste caso quando uma mensagem é desenhada no chat.
- **Versão 16.** As janelas da forma antiga, Application V1, saem de vez. Ficha que não tiver sido reescrita deixa de abrir.

Esta versão 2.0.0 adianta o que a 15 e a 16 vão exigir e corrige o que a 14 já quebra. O mesmo arquivo abre na 13 e na 14.

## Compatibilidade

Foundry 12 ou anterior fica de fora. O mínimo do pacote já era 13.

Quem ficar na 13, ou for para a 15 ou a 16, pode ver no setup o aviso de que o sistema não foi verificado para aquela build. A mesa continua abrindo. O máximo 16 evita que o Foundry bloqueie o sistema nessas versões. Não é um teste feito na 15 nem na 16. O verificado é a 14.

O máximo 16 cobre duas remoções já anunciadas: o gancho antigo do chat na 15 e a janela antiga na 16. Outra quebra que essas versões ainda não anunciaram continua possível.

## Como a ficha é montada

**Antes.** A ficha era uma janela do tipo antigo. O Foundry chamava `getData` para montar os dados, injetava um HTML só e depois chamava `activateListeners` com um objeto jQuery. O código fazia `html[0]` para chegar no elemento de verdade. Arrastar um item caía em `_onDropItemCreate`, que recebia um objeto solto, ainda sem ser o item criado.

**Agora.** A ficha é uma janela do tipo novo, o mesmo que o Foundry usa nas janelas dele desde a 13. Mudou o nome da estrutura, não o conteúdo da ficha.

- Largura, classes e abas saem de `defaultOptions` e vão para `DEFAULT_OPTIONS`, `PARTS` e `TABS`.
- `getData` vira `_prepareContext`. Continua devolvendo ator, sistema, magias, itens e o resto que o template já lê.
- `activateListeners` vira `_onRender`. O elemento já é HTML. Não há jQuery no meio.
- O template da ficha permanece. Os nomes dos campos, como `system.health.value` e `system.style`, permanecem. O que está salvo no mundo continua encaixando.
- Arrastar um item passa por `_onDropItem`, que recebe o item já resolvido. A pergunta de duplicar, sobrescrever ou somar quantidade continua igual.
- A ficha de item é um código só. Na hora de desenhar, ele escolhe o template de especialidade, magia, equipamento ou consumível.
- O clique no retrato continua gravando o campo `img`. A janela antiga fazia isso sozinha. A nova precisa de um listener.

A janela nova não usa a classe CSS `.window-app`. O fundo transparente da ficha também mira `.application.mad-dragon-turbo`, para o pergaminho padrão do Foundry não voltar.

## Como o chat é ligado

**Antes.** O sistema escutava dois avisos ao desenhar uma mensagem: `renderChatMessage` (jQuery) e `renderChatMessageHTML` (elemento HTML). Os dois disparavam. O antigo era o aviso do console.

**Agora.** Fica só o aviso novo. O botão de rerrolagem e a ocultação dos usos de magia continuam no mesmo lugar da mensagem.

O autor deixa de ser gravado como `user` e passa a ser `author`. É a mesma pessoa: quem rolou. Mensagens antigas ainda são lidas se tiverem o campo velho guardado. Mensagens novas já nascem no campo que a 14 exige.

## O que isto não é

Não é uma mudança de regras do Mad Dragon Turbo. Não é uma ficha nova. Não exige que todas as mesas atualizem o Foundry no mesmo dia. Quem ficar na 13 continua jogando. Quem for para a 14 também, com o mesmo pacote.

---

# Regras atuais

Cada bloco diz o que o jogador faz e, em seguida, como a ficha aplica isso. Onde o README do folheto e o código divergem, vale o código, e a diferença está escrita no bloco.

## Criação

O personagem tem um conceito em uma frase, um estilo e especialidades.

Os três estilos são:

- **Porradeiro/a.** Vida 5, sanidade 3. Foco físico. O ícone de informação da ficha diz: quantidade base de 4 especialidades, e magia de baixo nível.
- **Malandro/a.** Vida 3, sanidade 3. Foco social. Quantidade base de 5 especialidades, e magia de baixo nível. O folheto também chama este estilo de Malandrão.
- **Genial.** Vida 3, sanidade 5. Foco mental. Quantidade base de 6 especialidades. O ícone de informação diz que magia de alto nível é deste estilo.

Na ficha do personagem, escolher o estilo grava esses máximos de vida e sanidade e corta o valor atual se ele passar do novo máximo. A ficha mostra a quantidade base no texto do estilo. Ela não impede criar mais especialidades do que esse número.

NPC e inimigo usam a mesma ficha. Neles, o máximo de vida e sanidade não é forçado pelo estilo. Só esses dois tipos editam o máximo à mão.

## Testes

O jogador descreve a ação. A rolagem usa dados de seis faces (d6).

No folheto, o mestre soma bônus de possibilidade, estilo, especialidade e item, e cada bônus vira um dado. Na ficha, quem rola escolhe 1, 2 ou 3 dados no diálogo. A ficha não soma esses bônus sozinha.

Dificuldades no diálogo:

- Oculta: o mestre decide. A mensagem não mostra um número mínimo.
- Comum 2+ e comum 3+.
- Desafiadora 4+ e desafiadora 5+.
- Complexa: só o 6.

Um resultado conta como acerto se for maior ou igual ao mínimo da dificuldade. Cada 1 anula um acerto. A ficha classifica assim:

- Três 6: Espetacular. A mensagem diz que o acerto espetacular dá uma vantagem e uma oportunidade.
- Dois 6 e nenhum 1: Primoroso. A mensagem diz que o acerto primoroso dá uma vantagem.
- Acerto líquido maior que zero: Sucesso.
- Um 6 junto com um 1, sem acerto líquido: Parcial.
- Nenhum acerto e pelo menos um 1: Falha crítica.
- Nenhum acerto, sem 1: Falha.

Na dificuldade oculta, a ficha não usa o mínimo. Ela mostra faixas de certeza e de dúvida para o mestre, em vez de um sucesso seco.

O diálogo também pode mandar a rolagem só para o mestre.

Sem estilo escolhido, a ficha recusa o teste.

## Rerrolagem e sorte

O Malandro/a pode rerrolar um único 1, uma vez por jogada. A ficha não faz isso sozinha. Se a rolagem tem um 1 e o estilo é Malandro/a, a mensagem ganha um botão. Quem aperta é o mestre, o autor da mensagem ou o dono do personagem. O folheto descreve a rerrolagem como parte da jogada. A diferença é que, na ficha, ela é manual.

A rolagem de sorte é um 1d2. O jogador escolhe par ou ímpar antes. Acerta se o resultado bater com a escolha.

## Combate

A ordem de iniciativa é fixa: Malandro/a, inimigo, Porradeiro/a, Genial. A ficha grava um número para o Foundry ordenar o turno e soma uma fração aleatória para desempatar quem está no mesmo grupo. O número fica oculto no rastreador. O botão de rolar a iniciativa de todos aparece só para o mestre.

Dano, quando a ficha usa um equipamento:

- Arma branca: Porradeiro/a causa 2. Malandro/a e Genial causam 1.
- Arma de fogo: 2 para todos os estilos.

O folheto também descreve dano desarmado (1, letal só para o Porradeiro/a). A ficha não tem um botão separado de ataque desarmado. Esse dano continua narrativo.

Vida 0 é a faixa crítica. Sanidade 0 é a faixa abalada. O ícone e o rótulo da ficha mudam conforme o valor. A ficha não mata o personagem nem aplica insanidade sozinha. Isso continua com o mestre.

Armadura não reduz dano na ficha. Continua narrativa.

## Magia e poder

Cada magia tem descrição, duração, nível baixo ou alto, usos, uso livre e a marca de pronta.

Uso livre deixa os usos infinitos. Sem isso, a ficha guarda o máximo e o quanto já foi usado, e mostra o restante só para o dono do personagem e para o mestre. Sem usos, ou sem estar pronta, a ficha recusa o uso.

Descansar, com um estilo escolhido, zera os usos gastos das magias daquele personagem.

O alto nível é uma opção da magia. O ícone do estilo lembra que ele é do Genial. A ficha não bloqueia o campo em outros estilos.

Ao usar, a ficha pede um alvo, com a opção de ficar sem alvo, e manda a carta para o chat com a duração. Se a duração estiver vazia, a carta diz que ela não foi informada.

## Equipamento e consumível

Equipamento e consumível têm tipo, quantidade e descrição. Arma pode controlar munição e ter uso livre. Uso livre ignora o estoque. Sem uso livre, arma sem quantidade ou sem munição não pode ser usada.

Consumível gasta quantidade, salvo uso livre. Dinheiro pede quanto usar antes de gastar.

Arrastar um item que já está na ficha pergunta: cancelar, duplicar, sobrescrever ou, se o item tem quantidade, somar uma unidade.

## Regras da casa

Regras da casa vencem. O que a mesa combinar na sessão zero fica acima deste texto. Não há progressão de personagem na ficha: nível e experiência não existem como campos.
