# Assets da marca Capita Max

Logos referenciados em `lib/brand/capitamax.ts` (845×533):

| Arquivo | Status | Origem | Uso |
| --- | --- | --- | --- |
| `logo-full.png` | ✅ gerado | `_original-sem-slogan.png` com fundo branco removido | Logo colorido — header de funil/login/operador, marca em obrigado/privacidade |
| `logo-full-white.png` | ✅ gerado | silhueta branca do logo acima | Logo branco — rodapé e header da landing (fundos escuros) |
| `og-image.png` | ⬜ falta | — | Imagem de compartilhamento (1200×630), apontada em `seo.ogImage` |
| `app/favicon.ico` | ⬜ falta | — | Favicon é file-based no App Router; trocar exige build separado por marca |

`_original-sem-slogan.png` e `_original-com-slogan.png` são os arquivos oficiais
recebidos (referência; não usados diretamente pelo app). A versão branca é uma
**silhueta** (perde o laranja da seta) — se houver logo negativo oficial,
substitua `logo-full-white.png` por ele.

Para regenerar a partir de um novo logo colorido (fundo branco) em `ENTRADA.png`:
```
node -e "const s=require('sharp');(async()=>{const {data,info}=await s('ENTRADA.png').trim({threshold:5}).raw().ensureAlpha().toBuffer({resolveWithObject:true});const {width,height,channels}=info;const o=Buffer.from(data);for(let i=0;i<o.length;i+=channels){if(o[i]>238&&o[i+1]>238&&o[i+2]>238)o[i+3]=0}await s(o,{raw:{width,height,channels}}).png().toFile('public/capitamax/logo-full.png');const a=await s(o,{raw:{width,height,channels}}).extractChannel(3).raw().toBuffer();await s({create:{width,height,channels:3,background:'#fff'}}).joinChannel(a,{raw:{width,height,channels:1}}).png().toFile('public/capitamax/logo-full-white.png')})()"
```

Cores da marca (já configuradas em `app/globals.css`, bloco `[data-brand="capitamax"]`):
laranja `#ef900e`, azul escuro `#084988`, azul claro `#3a8fc3`, branco `#ffffff`.
