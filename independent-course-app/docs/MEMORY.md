# Memory Card - Evolucao do Training Hub Independente

## Objetivo

Construir um MVP funcional standalone para curso on-line com:

- controle de acesso;
- area do aluno;
- area do operador;
- historico evolutivo;
- avaliacao dinamica;
- monitoramento de acesso e permanencia;
- estatisticas e memoria de continuidade.

## Progresso

- [x] Definida a estrategia de isolamento da nova aplicacao.
- [x] Criada a memoria tecnica independente.
- [x] Implementada a base persistente local.
- [x] Implementada autenticacao por perfil.
- [x] Implementada Area do Aluno.
- [x] Implementada Area do Operador.
- [x] Implementado motor de avaliacao dinamica.
- [x] Implementado monitoramento de estudo e historicos.
- [x] Validacao sintatica do MVP (`node --check`).
- [x] Roteiro de validacao manual documentado em `docs/MANUAL_VALIDATION.md`.
- [ ] Validacao manual completa em navegador.

## Ultimo marco concluido

Aplicacao standalone entregue em `independent-course-app/` com:

- login por perfil (`admin`, `operator`, `student`);
- banco local persistente no navegador;
- Area do Aluno com trilha, conteudos, historico, avaliacoes e escore;
- Area Restrita com turmas, alunos, conteudos, configuracoes do sistema, memoria e usuarios;
- memoria operacional in-app para progresso, melhorias e bloqueios;
- calculo dinamico de aprovado, reprovado e em andamento;
- nome da aplicacao configuravel pelo operador;
- perfis de cores selecionaveis;
- conteudos com imagem, video incorporavel e grafico didatico;
- editor rico com imagem no corpo do texto por URL, upload local, colagem e arrastar/soltar;
- questionarios por modulo com publicacao controlada;
- gabarito restrito ao operador;
- geracao automatica experimental de rascunhos de questoes baseada no texto do modulo.

## Correcao recente

- [x] Tema visual passou a propagar para os principais blocos do layout.
- [x] Cores fixas do layout foram convertidas para variaveis dependentes do perfil selecionado.
- [x] Conteudos salvos passaram a aparecer imediatamente na area do operador, com listagem de modulos e conteudos.
- [x] Modulos e conteudos agora possuem edicao e exclusao na area do operador.
- [x] Exclusao de modulo foi protegida contra dependencias de conteudos e questionarios.
- [x] CRUD minimo de cursos (`studyPlans`) integrado a area restrita, sem dependencia de `plan-1` e com turma inicial automatica.
- [x] Visao de turmas removida do modelo fixo de turma unica e passou a listar todas as turmas por curso.
- [x] Questionarios publicados passaram a aparecer tambem dentro do fluxo do modulo estudado na Area do Aluno.
- [x] Parametros configurados pelo operador voltaram a ser usados nas mensagens e regras dependentes da nota minima.
- [x] Guards adicionais foram aplicados para evitar acoes em turmas, modulos e questionarios invalidados.

## Melhorias identificadas

- [ ] Migrar persistencia local para backend dedicado com banco remoto.
- [ ] Adicionar trilha de auditoria mais detalhada para mudancas em criterios e conteudos.
- [ ] Incluir dashboards comparativos por turma, periodo e modulo.
- [ ] Adicionar recuperacao de senha e MFA para perfis administrativos.
- [ ] Criar assistente de matricula em lote para operadores.
- [ ] Adicionar exportacao de relatorios de desempenho.
- [ ] Evoluir o editor de conteudo para suportar multiplos blocos visuais por item.
- [ ] Substituir o editor rico interno por uma solucao dedicada de mercado, com upload adapter, schemas e revisao estruturada.
- [ ] Substituir o gerador heuristico local de questoes por geracao assistida por IA com revisao humana obrigatoria.

## Regra de continuidade

Se houver interrupcao produtiva, este arquivo deve ser atualizado com:

- ultimo modulo concluido;
- pendencia tecnica imediata;
- melhoria descoberta;
- proximo passo executavel.

## Proximo passo executavel

1. Iniciar `npm start` em `independent-course-app/`.
2. Abrir `http://localhost:4174`.
3. Executar o roteiro de `docs/MANUAL_VALIDATION.md`, com foco em:
   - CRUD de cursos;
   - criacao e publicacao de questionarios;
   - exibicao do questionario dentro do modulo estudado;
   - bloqueios e exclusoes administrativas.
4. Registrar achados na memoria operacional da propria aplicacao ou em `docs/MEMORY.md`.
