# Training Hub Independente

Aplicacao standalone para gestao de curso on-line, criada de forma independente das aplicacoes ja existentes neste workspace.

## Premissas

- nao compartilha codigo com as demais aplicacoes;
- possui estrutura, memoria e persistencia proprias;
- usa banco local persistente no navegador para permitir execucao imediata sem dependencias externas.

## Acesso inicial

- Admin: `admin@traininghub.local` / `Admin@123`
- Operador: `operador@traininghub.local` / `Operador@123`
- Aluno: `aluno@traininghub.local` / `Aluno@123`

## Como executar

O modo mais confiavel para teste local e via servidor estatico:

```powershell
cd C:\Users\mrigo\.gemini\antigravity\scratch\stationery-manager\independent-course-app
npm start
```

Depois, abra:

- `http://localhost:4174`

Tambem existe o arquivo `index.html`, mas como a aplicacao usa `type="module"`, o servidor local e a opcao recomendada para evitar restricoes do navegador.

## Estrutura

- `index.html`: shell da aplicacao
- `server.js`: servidor estatico local sem dependencias externas
- `styles.css`: identidade visual da aplicacao
- `src/app.js`: logica, persistencia, autenticacao e renderizacao
- `docs/MEMORY.md`: memoria evolutiva do desenvolvimento
- `docs/MANUAL_VALIDATION.md`: roteiro objetivo para validar o MVP em navegador

## Recursos implementados

- modulo `Configuracoes do Sistema` para o operador
- nome da aplicacao configuravel sem editar codigo
- perfis de cores para identidade visual
- criacao de conteudo com imagem, video ou grafico didatico
- renderizacao imersiva desses recursos na Area do Aluno
- editor rico para o corpo do conteudo
- imagem dentro do corpo por URL, upload local, colagem e arrastar/soltar
- autoria manual de questionarios por modulo
- gabarito e observacoes do professor visiveis apenas na area do operador
- geracao automatica experimental de rascunhos de questoes a partir do conteudo do modulo
