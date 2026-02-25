---
description: Guia de Deploy e Teste Local
---

# Como Testar e Publicar sua Aplicação

## 1. Teste Local (Recomendado para Desenvolvimento)
Enquanto você desenvolve, não precisa gastar recursos de nuvem (Netlify/Vercel). Rode tudo no seu computador:

1. Abra o terminal no diretório do projeto.
2. Execute o comando:
   ```bash
   npm run dev
   ```
3. Acesse o link mostrado (geralmente `http://localhost:5173`).
   - Esta versão reflete suas mudanças instantaneamente.
   - É grátis e ilimitado.

## 2. Publicar na Internet (Deploy)
Quando quiser que outras pessoas acessem, você precisa fazer o deploy. Se os créditos do Netlify acabaram, você tem alternativas:

### Opção A: Vercel (Gratuito e Similar ao Netlify)
1. Crie uma conta em [Vercel.com](https://vercel.com).
2. Conecte sua conta do GitHub.
3. Importe o repositório do projeto.
4. O Vercel fará o build e deploy automaticamente a cada `git push`.
   - Limites gratuitos são bem generosos para projetos pessoais.

### Opção B: Netlify Drop (Manual)
Se o build automático do Netlify estourou o limite de minutos, você ainda pode hospedar o site estático manualmente (se a conta não estiver bloqueada totalmente):

1. Gere a versão final no seu computador:
   ```bash
   npm run build
   ```
   (Isso cria uma pasta `dist`).
2. Vá para [app.netlify.com](https://app.netlify.com).
3. Na aba "Sites", arraste a pasta `dist` para a área de upload manual ("Drop folder to deploy").
   - Isso não consome "minutos de build" do Netlify, pois o build foi feito no seu PC.

### Opção C: GitHub Pages
Ideal se o projeto for público ou se você tiver GitHub Pro. Requer configuração adicional (`gh-pages`).

## Resumo
- **Desenvolvendo?** Use `npm run dev`.
- **Publicando versão final?** Use Vercel ou Netlify Drop se os minutos acabaram.
