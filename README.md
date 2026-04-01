# Mad Dragon Turbo (MDT)

Mad Dragon Turbo é um **RPG de panfleto**: sistema simples, direto e focado na narrativa. Se você já conhece jogos no estilo de *Cthulhu Dark*, *Guaxinins & Gambiarras* ou *Lasers & Feelings*, a proposta soa familiar.

**Este repositório** contém o **pacote de sistema para [Foundry Virtual Tabletop](https://foundryvtt.com/)** (fichas, itens, rolagens no chat, combate básico) além de uma **referência das regras do folheto** mais abaixo.

---

## Foundry VTT

### Requisitos

| Item | Versão |
|------|--------|
| Foundry VTT | **13** (mínimo, verificado e máximo no `system.json`) |

### Instalação manual

1. Copie a pasta do sistema para o diretório de dados do Foundry, por exemplo:
   - **Windows:** `%LOCALAPPDATA%\FoundryVTT\Data\systems\`
   - **Linux / macOS:** `Data/systems/` dentro da pasta de dados do Foundry
2. Renomeie a pasta para `mad-dragon-turbo` (deve coincidir com o `id` em `system.json`).
3. No Foundry: **Configuração do mundo → Sistema de jogo** e selecione **Mad Dragon Turbo**.

Quando houver `manifest` público no `system.json`, também será possível instalar pela URL de manifesto na aba de sistemas.

### Idioma da interface

- **Português (Brasil)** (`lang/pt-BR.json`) — único idioma incluído no MVP.

### O que o sistema faz no Foundry

- Fichas de **Personagem**, **NPC** e **Inimigo** com o mesmo layout; em NPC/Inimigo, **vida e sanidade máximas** são editáveis manualmente.
- Itens incorporados: **Especialidade**, **Magia/Poder**, **Equipamento**.
- **Rolagem de teste**, **descanso** e **uso de magias** exigem um **estilo** escolhido (Porradeiro, Malandro ou Genial).
- **Iniciativa** com ordem por tipo de personagem (ex.: inimigos em posição fixa na ordem).

### Estrutura do repositório (desenvolvimento)

```
module/
  mdt.js              # Registro do sistema, hooks init/ready
  actor/              # Classe de documento e ficha de personagem
  models/             # DataModels de personagem e item
  helpers/            # Rolagem (MDTRoll), helpers Handlebars
  combat/             # Documento de combate customizado
  templates/          # Registro de partials Handlebars
templates/
  actors/             # Ficha e partials (.hbs)
  chat/               # Templates de mensagens no chat
  dialogs/            # Diálogos (ex.: rolagem)
css/                  # Estilos por contexto (ficha, chat, combate, etc.)
lang/                 # Traduções
system.json           # Manifesto do sistema Foundry
```

### Autores

- Richard C. Bernardes — O Bardo  
- Rodrigo J. S. Silva — Capivara Tech  

---

## Referência: regras do folheto

O restante deste documento resume o **RPG** (dados, estilos, testes). A implementação no Foundry segue essa base, com ajustes onde a interface digital pede (ex.: botões de rolagem, usos de magia).

---

## O que você precisa

* 3 dados de seis faces (d6)
* Papel e lápis
* Imaginação
* Amigos para jogar

---

## Estrutura do Jogo

* **Mestre:** narra o mundo, interpreta NPCs e define consequências
* **Jogadores:** interpretam os protagonistas da história

> O que o Mestre narra, acontece.

---

# Criação de Personagem

A criação é feita em **3 passos simples**:

---

## 1) Conceito

Defina o personagem em uma única frase:

> Quem ele é? O que faz? Qual seu papel?

**Exemplo:**

> “Meu nome é Solomon J. Hunter, sou um Soldado/Marinheiro da Marinha Australiana.”

---

## 2) Estilo

Escolha um dos três arquétipos:

### Porradeiro

* Foco físico e combate
* +1 em desafios físicos, resistência e ataques
* **Vida:** 5 | **Sanidade:** 3

---

### Genial

* Foco mental e controle
* +1 em desafios mentais, controle e percepção
* **Vida:** 3 | **Sanidade:** 5

---

### Malandro

* Foco social e furtividade
* +1 em desafios sociais, agilidade e furtividade
* **Vida:** 3 | **Sanidade:** 3

---

## 3) Especialidades

Definem no que o personagem é bom.

* Porradeiro: 4
* Malandrão: 5
* Genial: 6

Cada especialidade concede **+1 dado** em testes.

---

## Resumo do Personagem

> “Sou Solomon J. Hunter, Marinheiro, Porradeiro, especialista em Armas de Fogo, Navegação, Sobrevivência e Artes Marciais.”

---

# Sistema de Testes

## Como funciona:

1. Jogador descreve a ação
2. Mestre define se é possível (+1 dado)
3. Soma bônus de Estilo (+1), Especialidade (+1) e Itens (+1)
4. Rola dados d6

---

## Resultados

* **6 → Sucesso (anula falhas)**
* **1 → Falha (anula acertos simples)**
* **2–5 → a depender do mestre**

---

## Dificuldades

* **Oculta:** O mestre decide
* **Comum:** 2+
* **Desafiadora:** 4+
* **Complexa:** apenas 6
* **Automático:** sem rolagem

---

## Categorias de Resultado

* **Falha Crítica:** nenhum sucesso + pelo menos um 1
* **Falha:** nenhum sucesso
* **Parcial:** sucesso com custo
* **Sucesso:** resultado positivo
* **Primoroso:** dois sucessos
* **Espetacular:** três sucessos

> Malandrões podem rerrolar um “1” por jogada.

---

# Combate, Debate e Embate

## Ações possíveis:

* Atacar
* Movimentar
* Executar outra ação

---

## Iniciativa

Ordem fixa:

**Malandrões → Inimigos → Porradeiros → Geniais**

---

## Dano

### Desarmado

* Malandrão/Genial: 1 (não letal)
* Porradeiro: 1 (letal ou não)

### Armas Brancas

* Malandrão/Genial: 1 letal
* Porradeiro: 2 letal

### Armas de Fogo

* Todos: 2 letal

---

## Vida e Sanidade

* 0 Vida → Crítico → dano adicional = morte
* 0 Sanidade → Abalado → dano adicional = insanidade

> Armaduras são narrativas (não reduzem dano diretamente)

---

## Debate

Conflitos sociais/mentais:

* Dificuldade padrão: 3
* Vence quem tiver mais sucessos (6)

---

# Magia e Poderes

Sistema modular definido pela mesa.

* Quantidade = Sanidade
* Geniais acessam magias mais poderosas

### Tipos:

* **Baixo nível:** 1 dano
* **Alto nível:** 2 dano (Geniais apenas)

Falhas ainda podem gerar custo.

---

# Universo e Regras da Casa

O sistema funciona em qualquer cenário.

A lógica do mundo depende da mesa

---

## Regras importantes:

* Regras da casa sempre vencem
* Tudo é definido na Sessão Zero
* O sistema é ideal para campanhas curtas (3–6 sessões)
* **Não há progressão de personagem**

---

# Resumo

Mad Dragon Turbo é um sistema:

* Simples
* Rápido
* Narrativo
* Flexível

Perfeito para quem quer jogar sem burocracia e focar na história.
