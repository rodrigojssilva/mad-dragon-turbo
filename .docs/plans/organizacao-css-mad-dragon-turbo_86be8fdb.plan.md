---
name: organizacao-css-mad-dragon-turbo
overview: Propor uma arquitetura de organização de arquivos CSS por contexto (fichas, itens, chat etc.) para o sistema Mad Dragon Turbo, mantendo CSS puro e facilitando manutenção futura.
todos:
  - id: mapear-blocos-css
    content: Mapear blocos de CSS atuais por contexto (layout de ficha, cabeçalho, recursos, itens, estilo, forms, chat, colapso).
    status: pending
  - id: definir-arquitetura-pastas
    content: Definir arquitetura de pastas dentro de `css/` (base, sheets, items, chat, ui) e nome dos arquivos por contexto.
    status: pending
  - id: definir-convencoes
    content: Definir convenções de nomenclatura para classes CSS (prefixos, contexto de uso).
    status: pending
  - id: planejar-migracao
    content: "Planejar migração futura: mover estilos de `mdt.css` e `mdt_collapse.css` para os novos arquivos, e atualizar manifesto do sistema para carregar os CSS na ordem correta."
    status: pending
isProject: false
---

### Objetivo

Definir uma **arquitetura clara de pastas e arquivos CSS**, separando estilos por contexto (fichas, itens, chat, efeitos colapsáveis etc.) para o sistema Mad Dragon Turbo, mantendo CSS puro e facilitando a evolução futura.

### Visão geral da arquitetura proposta

- **Pasta raiz de estilos**: manter `css/` como raiz.
- **Separação por contexto funcional**, mantendo arquivos pequenos e focados:
  - `css/base.css` — reset/ajustes globais específicos do sistema Mad Dragon Turbo (fonte padrão, cores básicas, helpers genéricos). Opcional se hoje tudo já estiver encapsulado em `.mad-dragon-turbo`.
  - `css/layout-sheet.css` — layout geral da ficha (`.sheet-header`, `.sheet-body`, `.sheet-columns`, `.col-left`, `.col-right`, `.sheet-section`, etc.).
  - `css/header-sheet.css` — tudo que for cabeçalho da ficha (`.header-left`, `.header-right`, `.profile-img`, `.roll-test`, `.resource-*` do cabeçalho).
  - `css/resources.css` — recursos (vida, mana, etc.) e rodapés de recursos (`.resource-row`, `.resource-block`, `.resources-footer`, etc.).
  - `css/items-list.css` — lista de itens da ficha (`.items-list`, `.item-row`, `.item-name`, `.item-delete`, `.empty-line`, etc.).
  - `css/style-options.css` — estilos específicos de “estilo”/build (`.style-option`, `.style-header`, `.style-desc`, `.style-stats`).
  - `css/forms.css` — inputs genéricos dentro da ficha (`textarea`, inputs de header e resources quando forem genéricos).
  - `css/collapse.css` — já existe (`mdt_collapse.css`); renomear para algo como `items-collapse.css` ou `collapse-items.css` e manter apenas comportamento visual de colapso de itens.
  - `css/chat-cards.css` — estilos de cards no chat (`.mdt-item-card`, `.item-card-*`).
  - Opcionalmente, no futuro: `css/actors-<tipo>.css` para fichas muito específicas (ex: monstros vs jogadores), se necessário.

### Correspondência com o CSS atual

Usando o conteúdo atual de `[css/mdt.css](css/mdt.css)` e `[css/mdt_collapse.css](css/mdt_collapse.css)`, a divisão ficaria aproximadamente assim (sem ainda aplicar, apenas como mapa):

- `**layout-sheet.css**` (layout geral da ficha)
  - `.mad-dragon-turbo.sheet`, `.mad-dragon-turbo .sheet-header` (L35–L51), `.mad-dragon-turbo .sheet-body` (L8–L10), `.sheet-columns`, `.col-left`, `.col-right` (L151–L164).
- `**header-sheet.css**` (cabeçalho da ficha)
  - `.header-left`, `.profile-img`, `.roll-test`, `.resource-value-row`, `.resource-input`, `.resource-sep`, `.resource-max`, `.header-right`, `.sheet-title`, `.header-field` e seus `label`/`input` (L53–L149, L114–L126).
- `**resources.css**`
  - `.resource-row`, `.resource-block`, `.resource-block label`, `.resources-footer` e filhos (L205–L223, L311–L329).
- `**items-list.css**`
  - `.items-list`, `.item-row`, `.item-name`, `.item-delete`, `.empty-line` (L224–L264).
- `**style-options.css**`
  - `.style-option`, `.style-header`, `.style-desc`, `.style-stats` (L266–L296).
- `**forms.css**`
  - `textarea` genérico de `.mad-dragon-turbo` (L298–L307) e eventuais outros campos genéricos.
- `**chat-cards.css**`
  - `.mdt-item-card` e seus elementos internos (L333–L368).
- `**collapse-items.css**` (a partir de `mdt_collapse.css`)
  - `.item-summary`, `.item-chevron`, `.item-description`, `.item-description.hidden`, `.item-name-input`, `.item-desc-input`, `.item-desc-content`, `.item-edit-desc`, `.item-to-chat` (L1–L86 de `mdt_collapse.css`).

Além disso, manteríamos `.mdt-initiative-btn` e `.mdt-roll` em um arquivo separado, algo como `rolls.css` ou `buttons.css`, pois são mais ligados à interação do que ao layout da ficha em si.

### Organização de pastas sugerida

Para deixar claro o contexto, podemos agrupar por tipo de contexto dentro de `css/`:

- `css/base/`
  - `base.css` (ou `core.css`) — configurações gerais do tema e helpers reutilizáveis.
- `css/sheets/`
  - `layout-sheet.css`
  - `header-sheet.css`
  - `resources.css`
  - `items-list.css`
  - `style-options.css`
  - `forms.css`
  - (futuros) `actors-player.css`, `actors-npc.css` etc., se precisar.
- `css/items/`
  - `items-collapse.css` (atual `mdt_collapse.css` reorganizado)
- `css/chat/`
  - `chat-cards.css`
- `css/ui/`
  - `rolls.css` (botões de iniciativa, dados rerolados etc.)

Essa estrutura mantém o **contexto funcional** bem claro: sheet, items, chat e UI.

### Como carregar os arquivos no FoundryVTT

Como estamos em **CSS puro**, a separação física em vários arquivos exige apenas que você:

- **Atualize o `system.json**` (ou arquivo de manifesto equivalente) para apontar todos os novos arquivos CSS em `styles`, mantendo a ordem lógica:
  - Primeiro `base/core`.
  - Depois `sheets` (layout, cabeçalho, recursos, itens, forms).
  - Depois `ui` (rolls, botões).
  - Depois `items` (collapse) e `chat` (cards).
- Opcionalmente, manter um arquivo "guia" (`css/README.md`) explicando:
  - Qual pasta usar para cada tipo de estilo.
  - Convenções de nome de classe (sempre prefixar com `.mad-dragon-turbo` ou `.mdt-` por exemplo).

### Convenções de nomenclatura recomendadas

- **Prefixos consistentes**:
  - `.mad-dragon-turbo ...` para layout e elementos da ficha.
  - `.mdt-...` para componentes de UI menores (botões, estados especiais, ícones).
- **Classes semânticas por contexto**:
  - `item-*` somente em arquivos de itens (`items-list.css`, `items-collapse.css`).
  - `resources-*` somente em `resources.css`.
  - `item-card-*` somente em `chat-cards.css`.

### Benefícios práticos dessa arquitetura

- **Manutenção mais fácil**: quando precisar mexer só no colapso dos itens, você vai direto em `css/items/items-collapse.css`, sem vasculhar um arquivo gigante.
- **Onboarding mais simples**: qualquer pessoa que abrir o projeto entende rapidamente onde estão estilos de ficha, chat, itens, etc.
- **Evolução controlada**: se surgir uma nova ficha ou tipo de ator, você pode criar um novo arquivo em `css/sheets/` sem misturar com o resto.

### Próximos passos quando você aprovar o plano

- Criar (ou renomear) os arquivos em `css/` conforme o mapa acima.
- Copiar/mover os blocos de CSS de `mdt.css` e `mdt_collapse.css` para os arquivos novos, removendo duplicações.
- Atualizar o manifesto do sistema para carregar todos os novos arquivos na ordem correta.
- Testar rapidamente no Foundry: abrir ficha, colapsar itens, rolar iniciativa, enviar card ao chat e ajustar qualquer detalhe que tiver escapado.

