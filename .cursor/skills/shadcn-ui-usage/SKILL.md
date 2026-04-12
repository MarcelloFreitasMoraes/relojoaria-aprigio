---
name: shadcn-ui-usage
description: >-
  Garante que a UI do relojoaria-app usa apenas componentes shadcn/ui em
  src/components/ui, importados via @/components/ui. Use ao criar ou alterar
  ecrãs, formulários, tabelas, diálogos, botões, ou quando o utilizador menciona
  UI, componentes, shadcn, Tailwind, design system, botão, input, dialog, tabela,
  skeleton, loading, card, toast, ou relojoaria-app.
---

# Uso de componentes shadcn/ui (relojoaria-app)

## Objetivo

Em qualquer UI nova ou alterada neste projeto, usar os componentes em `@/components/ui/*`, alinhados à documentação oficial [shadcn/ui Components](https://ui.shadcn.com/docs/components). O código local segue o mesmo modelo de API e composição que a doc do componente correspondente.

## Imports

- Importar sempre a partir de `@/components/ui/<ficheiro>` (ex.: `import { Button } from "@/components/ui/button"`).
- Não introduzir outro design system de componentes (MUI, Chakra, Ant Design, etc.) sem decisão explícita da equipa.
- Utilitário de classes: `import { cn } from "@/lib/utils"` quando necessário, junto aos componentes UI.

## Mapeamento rápido (o que já existe no projeto)

| Necessidade | Componente | Doc shadcn |
|-------------|------------|------------|
| Botão | `Button` | [Button](https://ui.shadcn.com/docs/components/button) |
| Painel / cartão | `Card`, `CardHeader`, `CardTitle`, `CardContent`, … | [Card](https://ui.shadcn.com/docs/components/card) |
| Campo de texto curto | `Input` | [Input](https://ui.shadcn.com/docs/components/input) |
| Texto longo | `Textarea` | [Textarea](https://ui.shadcn.com/docs/components/textarea) |
| Rótulo | `Label` | [Label](https://ui.shadcn.com/docs/components/label) |
| Lista/select | `Select` | [Select](https://ui.shadcn.com/docs/components/select) |
| Calendário | `Calendar` | [Calendar](https://ui.shadcn.com/docs/components/calendar) |
| Popover | `Popover` | [Popover](https://ui.shadcn.com/docs/components/popover) |
| Diálogo/modal | `Dialog` | [Dialog](https://ui.shadcn.com/docs/components/dialog) |
| Tabela | `Table` | [Table](https://ui.shadcn.com/docs/components/table) |
| Paginação | `Pagination` | [Pagination](https://ui.shadcn.com/docs/components/pagination) |
| Placeholder de carregamento | `Skeleton` | [Skeleton](https://ui.shadcn.com/docs/components/skeleton) |
| Toasts | `Toaster` + API Sonner | [Sonner](https://ui.shadcn.com/docs/components/sonner) |

Para props, slots e padrões (ex.: `asChild`), seguir a página do componente na doc shadcn.

## Inventário instalado

Lista mantida em [reference.md](reference.md). Atualizar após `npx shadcn@latest add <componente>`.

## Componente em falta no repositório

1. Preferir adicionar o componente oficial ao projeto: `npx shadcn@latest add <nome>` (respeitar [`components.json`](../../../components.json) na raiz).
2. Evitar substituir por `<button className="…">`, `<input className="…">`, etc., quando existe componente shadcn para o caso — primeiro instalar, depois usar.

## Exceções (HTML nativo aceitável)

- Estrutura semântica: `main`, `section`, `article`, `nav`, `header`, `footer`, `aside`.
- `<form>` como contentor de campos (os controlos dentro usam `Input`, `Label`, `Button`, etc.).
- Listas quando não há componente de lista na lib: `ul`, `ol`, `li`.
- Links: para estilo de botão com navegação, preferir `Button` com `asChild` envolvendo `<a>` (ver doc do Button).

## Referência

- [reference.md](reference.md) — inventário atual de `src/components/ui`.
