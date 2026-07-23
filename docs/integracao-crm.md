# Integração de Leads — Kommo CRM (primária) + Google Sheets (fallback)

Este documento descreve como os leads do simulador são persistidos e como
configurar as credenciais. A prioridade é o **Kommo CRM** (requisição de API
POST); o **Google Sheets** (Apps Script) é o fallback automático quando o Kommo
falha ou não está configurado.

Fluxo de envio (server-side, em `app/api/proposta/route.ts`):

```
proposta -> grava em Supabase (propostas)
         -> POST Kommo (lib/kommo.ts)      [primário]
         -> se Kommo falhar: POST Sheets   [fallback, lib/sheets.ts]
```

Nenhuma falha de CRM derruba a resposta ao cliente: o lead sempre fica ao menos
no Supabase, e a UI segue para a tela de resultado / agradecimento.

---

## 1. Kommo CRM (integração primária)

### 1.1. Gerar a API Key (token de longa duração)

1. No Kommo, acesse **Configurações → Integrações → API** (ou crie uma
   integração privada em **Desenvolvedores → Criar integração**).
2. Em uma integração privada, copie o **Token de longa duração**
   (*long-lived token*). É um JWT que não expira automaticamente.
3. Descubra o **subdomínio** da conta (`https://SUBDOMINIO.kommo.com`).
4. Pegue o **`pipeline_id`** e os **`status_id`** (etapas) do funil desejado em
   **Leads → Configurar funil** (o id aparece na URL ao editar a etapa).

Preencha em `.env.local` (ver `.env.local.example`):

```bash
KOMMO_SUBDOMAIN=moneygo
KOMMO_LONG_LIVED_TOKEN=eyJ0eXAiOiJKV1Qi...   # token privado, NUNCA versionar
KOMMO_PIPELINE_ID=12887799
KOMMO_HOME_EQUITY_STAGE_ID=99376387
```

> O token é lido apenas no server (sem `NEXT_PUBLIC_`). Ele autentica a chamada
> `Authorization: Bearer <token>` em `lib/kommo.ts`.

### 1.2. Como os campos são enviados

`lib/kommo.ts` monta o payload de `POST /api/v4/leads/complex` com o contato
embutido. O mapeamento essencial (Nome, E-mail, Telefone, Valor, Prazo):

| Campo do lead | Destino no Kommo                                    |
| ------------- | --------------------------------------------------- |
| Nome          | `name` do lead **e** `name` do contato              |
| Telefone      | contato → `custom_fields_values` code `PHONE`       |
| E-mail        | contato → `custom_fields_values` code `EMAIL`       |
| Valor         | lead → custom field `CF_VALOR_SOLICITADO`           |
| Prazo         | lead → custom field `CF_PRAZO_MESES`                |
| Parcela/Taxa  | `CF_PARCELA_PRICE`, `CF_TAXA_MENSAL`                |
| UTMs          | `CF_UTM_SOURCE`, `CF_UTM_CAMPAIGN`, ...             |

`PHONE` e `EMAIL` são *field codes* nativos do Kommo. Os `CF_*` são **códigos de
campos personalizados**: crie-os em **Leads → Configurar → Campos** e informe o
mesmo *code* (ou troque `field_code` por `field_id` em `buildCustomFields`).

### 1.3. Alternativa: Webhook de entrada (Salesbot / "Incoming webhook")

Se preferir não usar a API de leads diretamente, o Kommo aceita um **webhook de
entrada**:

1. **Configurações → Integrações → Webhooks → Adicionar webhook**, ou use um
   **formulário/Salesbot** com gatilho de webhook.
2. Copie a URL do webhook e envie um `POST` JSON com os mesmos campos.
3. Nesse caso, aponte `KOMMO_WEBHOOK_URL` (se optar por webhook em vez de API) e
   troque a implementação de `criarLeadKommo` para um `fetch` simples nessa URL.

A implementação atual usa a **API** (mais robusta: retorna o `lead_id` e permite
tags/etapas). O webhook é uma opção de menor esforço de setup.

---

## 2. Google Sheets (fallback via Apps Script)

Usado automaticamente quando o Kommo falha. Grava só o essencial
(`lib/sheets.ts` → `LeadSheetRow`).

### 2.1. Criar o Web App

1. Crie uma planilha no Google Sheets com o cabeçalho na primeira linha:

   ```
   data | nome | email | telefone | produto | valor | prazo_meses | qualificado | utm_source | utm_medium | utm_campaign
   ```

2. Em **Extensões → Apps Script**, cole:

   ```javascript
   function doPost(e) {
     const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Leads');
     const d = JSON.parse(e.postData.contents);
     sheet.appendRow([
       d.data, d.nome, d.email, d.telefone, d.produto,
       d.valor, d.prazo_meses, d.qualificado,
       d.utm_source || '', d.utm_medium || '', d.utm_campaign || '',
     ]);
     return ContentService
       .createTextOutput(JSON.stringify({ ok: true }))
       .setMimeType(ContentService.MimeType.JSON);
   }
   ```

3. **Implantar → Nova implantação → Tipo: App da Web**.
   - *Executar como*: **Eu**.
   - *Quem tem acesso*: **Qualquer pessoa**.
4. Copie a **URL do App da Web** (`https://script.google.com/macros/s/…/exec`).

### 2.2. Configurar

```bash
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/AKfy.../exec
```

Vazio = fallback desativado (`sheetsConfigurado()` retorna `false` e o envio é um
no-op). A URL é secreta: mantenha-a **somente no server** (sem `NEXT_PUBLIC_`).

---

## 3. Segurança (LGPD e dados sensíveis)

- Tokens e URLs de webhook ficam **apenas no server** (variáveis sem
  `NEXT_PUBLIC_`), nunca no bundle do browser.
- O envio ao CRM só ocorre com `consentimento_lgpd === true` (validado em
  `/api/lead` e `/api/proposta`).
- Logs de erro não imprimem PII em produção (ver os `console.error` guardados
  por `NODE_ENV !== "production"`).
- O CPF é validado no cliente e não é enviado ao Sheets (fallback carrega o
  mínimo necessário para recontato).
