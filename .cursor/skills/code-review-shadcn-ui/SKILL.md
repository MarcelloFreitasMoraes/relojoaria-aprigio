---
name: code-review-shadcn-ui
description: >-
  Revisa alterações de UI no relojoaria-app para conformidade com shadcn/ui em
  @/components/ui. Use em pull requests, diffs, pedidos de revisão de código,
  ou quando o utilizador pergunta se o código respeita os componentes do projeto,
  shadcn, card, skeleton, loading, ou o design system local.
---

# Code review: conformidade shadcn/ui (relojoaria-app)

Este foco **complementa** revisão de lógica, segurança e testes; não os substitui.

## Política de referência

Critérios de implementação e exceções: ver a skill [shadcn-ui-usage](../shadcn-ui-usage/SKILL.md) e o inventário em [reference.md](../shadcn-ui-usage/reference.md).

## Checklist de conformidade UI

- [ ] **Imports:** componentes de interface vêm de `@/components/ui/*` (ou subpastas do mesmo design system sob `src/components/ui`), não de outras bibliotecas de UI.
- [ ] **HTML nativo vs componentes instalados:** onde já existem `Button`, `Card`, `Input`, `Textarea`, `Label`, `Select`, `Dialog`, `Table`, `Pagination`, `Popover`, `Calendar`, `Skeleton`, `Toaster`/Sonner, o diff não deve introduzir equivalentes “soltos” (`<button>`, `<input>`, `<textarea>`, `<select>`, etc.) salvo nas exceções documentadas na skill de uso (layout semântico, `<form>`, listas simples).
- [ ] **Painéis / cartões:** evitar `div` com bordas/sombra/`rounded-*` ad-hoc para blocos tipo “card” quando o padrão é coberto por `Card` e subcomponentes; usar `@/components/ui/card`.
- [ ] **Loading / skeleton:** evitar `div` com `animate-pulse` / `bg-muted` ad-hoc para estados de carregamento quando o padrão é coberto por `Skeleton`; usar `import { Skeleton } from "@/components/ui/skeleton"`.
- [ ] **Novos primitives:** se o código usa markup + classes Tailwind para um padrão que a [doc shadcn](https://ui.shadcn.com/docs/components) cobre (ex.: Checkbox) mas ainda não está em `src/components/ui`, recomendar `npx shadcn@latest add <nome>` e refactor em vez de duplicar estilos.
- [ ] **Outras libs de UI:** não adicionar dependências de componentes alternativos (MUI, Chakra, etc.) sem decisão explícita.

## Formato de feedback

Usar níveis claros:

- **Crítico:** deve ser corrigido antes de merge (viola política de componentes ou introduz inconsistência grave).
- **Sugestão:** melhoria recomendada (alinhamento com shadcn, menos duplicação).
- **Opcional:** nit ou melhoria menor.

Referência de API e padrões: [shadcn/ui Components](https://ui.shadcn.com/docs/components).
