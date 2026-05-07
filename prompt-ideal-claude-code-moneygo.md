# Prompt IDEAL — Site Simulador MoneyGo Soluções em Crédito

> Cole este prompt inteiro como **primeira mensagem** dentro do Claude Code, na pasta vazia onde quer que o projeto seja criado. O Claude Code lerá tudo, fará perguntas pontuais (se necessário) e começará a estruturar o projeto.

---

## [INTENÇÃO]

Construir um **site responsivo de simulação de crédito** para a empresa **MoneyGo Soluções em Crédito** (domínio: `www.moneygosolucoesemcredito.com.br`) que servirá como **landing page de conversão** para tráfego pago vindo de campanhas da META (Facebook/Instagram Ads). O objetivo final é **capturar leads qualificados** através de um funil de simulação interativo que permita ao usuário simular crédito com garantia de imóvel (**Home Equity**) ou crédito com garantia de veículo (**Auto Equity**), e ao final do funil, **enviar automaticamente o lead qualificado para o CRM Kommo** para atendimento humano.

O site precisa ser **rápido, mobile-first, com taxa de conversão otimizada**, seguindo a referência estrutural do simulador da Bext (`simulador.bext.vc`), porém com identidade visual própria da MoneyGo.

---

## [DETALHES]

### 1. Contexto de negócio

- **Empresa:** MoneyGo Soluções em Crédito (correspondente bancário multibanco)
- **Modelo de negócio:** Captação de leads via tráfego pago META → simulação online → qualificação → atendimento humano via CRM Kommo → fechamento
- **Produtos a simular nesta primeira versão:**
  1. **Home Equity** (crédito com garantia de imóvel)
  2. **Auto Equity** (crédito com garantia de veículo)
- **Origem do tráfego:** 100% META Ads (Facebook + Instagram). UTMs precisam ser preservadas em toda a jornada.
- **Destino do lead:** CRM Kommo (via API/webhook), criando um lead/lead-card com tags do produto e dados da simulação.

### 2. Stack técnico exigido

- **Framework:** Next.js 14+ com **App Router** e **TypeScript**
- **Estilização:** Tailwind CSS + **shadcn/ui** para componentes
- **Formulários:** `react-hook-form` + validação com `zod`
- **Animações/transições:** `framer-motion` (transições suaves entre etapas do funil)
- **Estado do funil:** Zustand ou Context API (persistir estado entre steps + sessionStorage para não perder se o usuário recarregar)
- **Máscaras de input:** `react-imask` ou `@react-input/mask` (CPF, telefone, valores monetários, CEP)
- **Validação de CPF:** algoritmo dos dígitos verificadores (não usar lib externa pesada)
- **Ícones:** `lucide-react`
- **Hospedagem alvo:** Vercel (otimizar para Edge Functions onde fizer sentido)
- **Tracking:** Meta Pixel + Google Tag Manager + GA4 (via componente client wrapper)

### 3. Estrutura de páginas e rotas

```
/                       → Landing (Hero + escolha do produto)
/home-equity            → Funil multi-step Home Equity
/auto-equity            → Funil multi-step Auto Equity
/obrigado               → Página de sucesso pós-envio
/nao-qualificado        → Página de "não qualificado" com CTA alternativo
/api/lead               → Endpoint que recebe o submit e envia ao Kommo
/api/health             → Healthcheck
```

### 4. Funil Home Equity (steps)

1. **Step 1 — Valor do imóvel**: input de valor (R$), com slider visual; valor mínimo R$ 250.000.
2. **Step 2 — Tipo do imóvel**: cards selecionáveis (Casa / Apartamento / Comercial / Terreno em condomínio).
3. **Step 3 — Situação**: Quitado / Financiado (se financiado, perguntar saldo devedor).
4. **Step 4 — Localização**: CEP (com auto-preenchimento via ViaCEP) + cidade/UF. Bloquear cidades com menos de 50.000 habitantes (regra de qualificação).
5. **Step 5 — Valor desejado de crédito**: slider entre R$ 50.000 e 60% do valor do imóvel; prazo (60, 120, 180, 240 meses).
6. **Step 6 — Resultado da simulação**: mostrar parcela estimada (SAC e Price), taxa indicativa, valor liberado. Botão "Quero falar com um especialista".
7. **Step 7 — Formulário de captura**: nome completo, **data de nascimento**, CPF, telefone (WhatsApp), e-mail, **endereço completo** (CEP com auto-preenchimento via ViaCEP, logradouro, número, **complemento**, bairro, cidade, UF), melhor horário para contato, aceite LGPD.
8. **Submit** → API `/api/lead` → Kommo → redireciona para `/obrigado`.

### 5. Funil Auto Equity (steps)

1. **Step 1 — Marca/Modelo/Ano**: input de texto livre nesta v1 (futuro: integração FIPE). **Apenas carros de passeio são aceitos** (motos, caminhonetes e utilitários ficam de fora desta modalidade). Exibir disclaimer visível no topo do step: "Atendemos apenas carros de passeio nesta modalidade".
2. **Step 2 — Valor do veículo (FIPE)**: input com slider; mínimo R$ 30.000, máximo R$ 500.000.
3. **Step 3 — Situação**: Quitado / Financiado.
4. **Step 4 — Valor desejado**: até **50% do valor do veículo**; prazo (12, 24, 36, 48, 60 meses).
5. **Step 5 — Resultado**: parcela estimada (SAC e Price), taxa indicativa.
6. **Step 6 — Formulário de captura**: idem Home Equity (mesmos campos: nome completo, data de nascimento, CPF, telefone, e-mail, endereço completo com complemento, melhor horário, aceite LGPD).
7. **Submit** → `/api/lead` → Kommo → `/obrigado`.

### 6. Lógica de qualificação (rodar antes do submit final)

Marcar lead como `qualificado: true` se TODAS as condições forem verdadeiras:

**Home Equity:**
- Valor do imóvel ≥ R$ 250.000
- Cidade com população ≥ 50.000 habitantes (usar lista IBGE estática em `/lib/ibge-cidades.json`)
- Tipo do imóvel ≠ "rural"
- Se financiado: saldo devedor ≤ 50% do valor do imóvel
- Valor solicitado ≤ 60% do valor do imóvel
- Idade do solicitante entre 18 e 75 anos (validar pelo CPF + data de nascimento)

**Auto Equity:**
- Valor do veículo ≥ R$ 30.000
- Ano do veículo ≥ ano atual − 15
- Valor solicitado ≤ 50% do valor do veículo

Se `qualificado: false` → redirecionar para `/nao-qualificado` mas **ainda enviar o lead ao Kommo** com a tag `nao_qualificado` (decisão de negócio: equipe pode reaproveitar).

### 7. Cálculo de simulação (lógica matemática)

Implementar duas tabelas em `/lib/simulacao.ts`:

- **Tabela Price** (parcela fixa): `PMT = PV × (i × (1+i)^n) / ((1+i)^n − 1)`
- **Tabela SAC** (amortização constante, parcela decrescente): retornar a primeira parcela e a última.

Taxas indicativas a usar (configuráveis em `/lib/config.ts`):
- Home Equity: **1,19% a.m. (pós-fixada)** — exibir disclaimer "taxa sujeita a análise; modalidade pós-fixada com correção monetária por indexador (IPCA/IGP-M)"
- Auto Equity: **1,59% a.m. (pré-fixada)** — exibir disclaimer "taxa sujeita a análise"

### 8. Integração com Kommo CRM

- Criar `POST /api/lead` que recebe o JSON do funil completo.
- Variáveis de ambiente: `KOMMO_SUBDOMAIN`, `KOMMO_LONG_LIVED_TOKEN`, `KOMMO_PIPELINE_ID`, `KOMMO_HOME_EQUITY_STAGE_ID`, `KOMMO_AUTO_EQUITY_STAGE_ID`.
- Endpoint Kommo: `https://{subdomain}.kommo.com/api/v4/leads/complex`
- Payload precisa incluir: nome do lead, contato (telefone + e-mail), pipeline_id, status_id (stage), tags (`home_equity` ou `auto_equity`, `qualificado`/`nao_qualificado`, `meta_ads`), e **custom fields** com todos os dados da simulação (valor do bem, valor solicitado, prazo, parcela estimada, UTMs).
- Tratar erros: retry com backoff exponencial (3 tentativas) e log estruturado em caso de falha.
- Resposta da API ao front: `{ ok: true, lead_id }` ou `{ ok: false, error }`.

### 9. Tracking e UTMs

- Capturar UTMs da URL na primeira visita: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `gclid`, `fbclid`.
- Persistir em `sessionStorage` E no estado do funil.
- Enviar todas as UTMs como custom fields no payload do Kommo.
- Disparar evento `Lead` do Meta Pixel quando o submit final for bem-sucedido.
- Configurar GTM com `dataLayer.push` em cada transição de step (`step_view`, `step_completed`).

### 10. Identidade visual

**REGRA CRÍTICA:** manter **estritamente** a identidade visual existente da MoneyGo Soluções em Crédito. **Não inventar paleta, tipografia, logo ou tom visual** — usar o que já está consolidado na marca.

**Antes de iniciar qualquer trabalho visual, solicitar ao usuário:**
- Logo oficial em SVG (preferencial) ou PNG de alta resolução (versão principal + versão monocromática se houver)
- **Paleta de cores oficial** (códigos HEX/RGB de primária, secundária, accent, background, texto)
- **Tipografia oficial** (nome das fontes principais e de apoio, com peso/tamanho de uso típico)
- Manual de marca / brandbook (se existir)
- Materiais de referência: site atual `www.moneygosolucoesemcredito.com.br`, posts de redes sociais, cartões de visita, banners

**Se o usuário não tiver os arquivos da identidade em mãos:** capturar a paleta e tipografia diretamente do site atual da MoneyGo (`www.moneygosolucoesemcredito.com.br`) ou de imagens de materiais oficiais que ele enviar. Confirmar o resultado capturado com o usuário antes de aplicar.

**Configuração técnica:** declarar a paleta como CSS variables no `tailwind.config.ts` e expor tokens de design em `app/globals.css`. Configurar a tipografia via `next/font` (preferencial) ou Google Fonts.

**Elementos obrigatórios na landing:**
- Hero com headline forte e CTA "Simule grátis"
- Cards dos 2 produtos lado a lado (Home Equity + Auto Equity)
- Seção "Como funciona" (3-4 passos)
- Seção de prova social / "+10 instituições parceiras" (placeholders se não houver dados)
- FAQ (componente accordion)
- Footer com CNPJ, endereço, política de privacidade, LGPD, redes sociais

### 11. LGPD e legal

- Banner de cookies (sugestão: lib `react-cookie-consent`).
- Checkbox obrigatório de aceite de termos no Step 7 (formulário de captura).
- Página `/privacidade` com política de privacidade básica.
- Não armazenar CPF em logs/console em produção.

---

## [EXEMPLOS]

### Estrutura de pastas esperada

```
moneygo-simulador/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Landing
│   ├── home-equity/
│   │   └── page.tsx                # Wrapper do funil HE
│   ├── auto-equity/
│   │   └── page.tsx                # Wrapper do funil AE
│   ├── obrigado/page.tsx
│   ├── nao-qualificado/page.tsx
│   ├── privacidade/page.tsx
│   └── api/
│       ├── lead/route.ts
│       └── health/route.ts
├── components/
│   ├── ui/                         # shadcn
│   ├── funnel/
│   │   ├── FunnelShell.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── StepWrapper.tsx
│   │   └── steps/
│   │       ├── home-equity/
│   │       │   ├── Step1ValorImovel.tsx
│   │       │   ├── Step2TipoImovel.tsx
│   │       │   └── ...
│   │       └── auto-equity/
│   │           └── ...
│   ├── landing/
│   │   ├── Hero.tsx
│   │   ├── ProductCards.tsx
│   │   ├── HowItWorks.tsx
│   │   └── Faq.tsx
│   └── tracking/
│       ├── MetaPixel.tsx
│       └── GTM.tsx
├── lib/
│   ├── simulacao.ts                # Cálculos SAC e Price
│   ├── kommo.ts                    # Cliente Kommo
│   ├── qualificacao.ts             # Regras de qualificação
│   ├── utm.ts                      # Captura/persistência de UTMs
│   ├── ibge-cidades.json
│   └── config.ts                   # Taxas, limites, configs
├── stores/
│   └── funnel-store.ts             # Zustand
├── types/
│   └── index.ts
├── public/
│   ├── logo.svg
│   └── og-image.png
├── .env.local.example
├── README.md
└── package.json
```

### Exemplo de payload enviado para `/api/lead`

```json
{
  "produto": "home_equity",
  "qualificado": true,
  "simulacao": {
    "valor_imovel": 450000,
    "tipo_imovel": "casa",
    "situacao": "quitado",
    "valor_solicitado": 200000,
    "prazo_meses": 180,
    "parcela_price": 2715.30,
    "primeira_parcela_sac": 3491.11,
    "ultima_parcela_sac": 1124.43,
    "taxa_mensal": 0.0119,
    "modalidade_taxa": "pos_fixada"
  },
  "contato": {
    "nome": "Sandro Limoli",
    "data_nascimento": "1980-05-15",
    "cpf": "000.000.000-00",
    "telefone": "(47) 9 0000-0000",
    "email": "exemplo@email.com",
    "endereco": {
      "cep": "89220-100",
      "logradouro": "Rua Exemplo",
      "numero": "123",
      "complemento": "Apto 401",
      "bairro": "Floresta",
      "cidade": "Joinville",
      "uf": "SC"
    },
    "melhor_horario": "tarde"
  },
  "tracking": {
    "utm_source": "facebook",
    "utm_medium": "cpc",
    "utm_campaign": "home-equity-conversao-jan",
    "utm_content": "criativo-01",
    "fbclid": "IwAR...",
    "referrer": "https://www.facebook.com/"
  },
  "consentimento_lgpd": true
}
```

---

## [AÇÃO]

Você (Claude Code) deve executar nesta ordem:

1. **Inicializar o projeto Next.js 14 com TypeScript, Tailwind e App Router.**
2. **Instalar todas as dependências** listadas em [DETALHES] item 2.
3. **Configurar shadcn/ui** com os componentes: `button`, `card`, `input`, `label`, `slider`, `progress`, `accordion`, `dialog`, `form`, `radio-group`, `select`, `toast`.
4. **Criar a estrutura de pastas** exatamente como em [EXEMPLOS].
5. **Implementar primeiro o `lib/simulacao.ts`** com os cálculos SAC e Price + testes simples (`__tests__/simulacao.test.ts`) usando Vitest.
6. **Implementar o `lib/qualificacao.ts`** com a lógica de regras.
7. **Implementar o store Zustand** com persistência em sessionStorage.
8. **Construir a landing page** (`app/page.tsx`) com Hero + ProductCards.
9. **Construir o funil Home Equity** completo (steps 1 ao 7) com transições Framer Motion.
10. **Construir o funil Auto Equity** completo (mesmo padrão).
11. **Implementar `/api/lead`** com integração Kommo (cliente em `lib/kommo.ts` com retry e logs).
12. **Implementar tracking** (Meta Pixel + GTM + UTMs).
13. **Criar `/obrigado` e `/nao-qualificado`.**
14. **Criar `.env.local.example`** com todas as variáveis necessárias.
15. **Escrever o `README.md`** com: como rodar localmente, como configurar Kommo, como obter token Kommo, como configurar Meta Pixel, como fazer deploy na Vercel.
16. **Abrir checkpoint** para revisão antes de partir para responsividade fina e polimento visual.

**Antes de codar:** apresente um plano resumido em até 10 bullets do que vai fazer no Step 1. Se houver qualquer ambiguidade técnica crítica, pergunte ANTES de começar a codar (ex.: "qual o stage_id no Kommo?", "tem logo da MoneyGo em SVG?"). Não invente valores que afetem produção (tokens, IDs de pipeline) — use placeholders com `TODO:`.

---

## [LIMITE]

- **Idioma:** todo o conteúdo visível ao usuário em **Português Brasileiro**. Código, nomes de variáveis, commits e comentários técnicos em **inglês**.
- **Sem CRA, sem Pages Router antigo:** somente Next.js App Router (15+ se disponível, mínimo 14).
- **Sem Material UI, sem Bootstrap, sem Chakra:** apenas Tailwind + shadcn/ui.
- **Sem placeholder Lorem Ipsum:** copy real, profissional, persuasiva — se faltar info, use placeholders explícitos com `{{TODO: copy a definir com cliente}}`.
- **Sem mock de integração:** o `/api/lead` deve realmente tentar bater no endpoint Kommo (mesmo que com token placeholder, falhando graciosamente).
- **Não criar conta na Vercel, Kommo ou Meta automaticamente.** Apenas deixe o setup pronto e instruções no README.
- **Não suba para repositório remoto** sem confirmação do usuário.
- **Performance:** Lighthouse mobile mínimo de 90 em Performance e Acessibilidade na build de produção. Imagens otimizadas com `next/image`. Lazy loading nos steps que não estão visíveis.
- **Acessibilidade:** todos os inputs com `<label>`, contraste AA, navegação por teclado funcional, foco visível.
- **Sem dados sensíveis em logs:** CPF e telefone só nos custom fields do Kommo, nunca em `console.log` em produção (usar flag `NODE_ENV`).
- **Tamanho do bundle:** evitar libs pesadas (sem moment, usar `date-fns` se precisar; sem lodash inteiro, importar funções específicas).
- **Comentários:** comentar APENAS lógica não óbvia (regras de qualificação, fórmulas financeiras). Não poluir com comentários redundantes.
- **Commits:** se for usar git, fazer commits pequenos e semânticos (Conventional Commits).
- **Não tentar SEO avançado nesta v1.** Foco é conversão de tráfego pago. Apenas meta tags básicas + OG image.

---

> **Pronto. Comece pelo Step 1 do [AÇÃO]: apresente o plano resumido em 10 bullets e aguarde meu OK para iniciar.**
