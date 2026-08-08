# MoneyGo Simulador de Crédito

Site responsivo de simulação de crédito para a **MoneyGo Soluções em Crédito**.

## Stack
- Next.js 15 App Router + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Zustand, Framer Motion, react-hook-form + Zod, react-imask
- Vitest (testes), Vercel (hospedagem)

## Rodar localmente
```bash
npm install
cp .env.local.example .env.local
# edite .env.local com seus valores
npm run dev
```

## Testes
```bash
npm test
```

## Área do parceiro
Login em `/operador/login` (contas criadas pela administração no Supabase Auth).
A recuperação de senha depende de configuração no painel do Supabase — passo a
passo em [docs/recuperacao-senha.md](docs/recuperacao-senha.md).

## Variáveis de Ambiente
| Variável | Descrição |
|---|---|
| KOMMO_SUBDOMAIN | moneygo |
| KOMMO_LONG_LIVED_TOKEN | Token gerado em Kommo → Integrações → API |
| KOMMO_PIPELINE_ID | 12887799 |
| KOMMO_HOME_EQUITY_STAGE_ID | 99376387 (verificar) |
| KOMMO_AUTO_EQUITY_STAGE_ID | TODO |
| NEXT_PUBLIC_META_PIXEL_ID | ID do Meta Pixel |
| NEXT_PUBLIC_GTM_ID | GTM-XXXXXXX |

## Como gerar o token Kommo
1. Acesse https://moneygo.kommo.com
2. Configurações → Integrações → API
3. Gere o Long-lived token

## Deploy Vercel
```bash
npx vercel
```
Adicione todas as variáveis do .env.local.example no painel Vercel → Settings → Environment Variables.

## TODOs antes do go-live
- [ ] Logo SVG oficial em /public/logo.svg
- [ ] Confirmar KOMMO_AUTO_EQUITY_STAGE_ID
- [ ] WhatsApp nas páginas /obrigado e /nao-qualificado
- [ ] CNPJ e endereço no Footer e /privacidade
- [ ] Logos parceiros em /public/parceiros/
- [ ] OG image (1200x630px) em /public/og-image.png
