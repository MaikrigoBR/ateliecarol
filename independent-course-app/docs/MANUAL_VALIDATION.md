# Validacao Manual do Training Hub Independente

Use este roteiro para validar o MVP standalone em navegador apos subir o servidor local.

## Preparacao

1. Inicie a aplicacao com `npm start` em `independent-course-app/`.
2. Abra `http://localhost:4174`.
3. Se quiser repetir os testes do zero, use `Resetar base independente` na area restrita.

## Credenciais demo

- Admin: `admin@traininghub.local` / `Admin@123`
- Operador: `operador@traininghub.local` / `Operador@123`
- Aluno: `aluno@traininghub.local` / `Aluno@123`

## Smoke inicial

1. Confirmar carregamento da tela de login com nome e subtitulo da aplicacao.
2. Testar os tres acessos rapidos (`Admin`, `Operador`, `Aluno`).
3. Confirmar que cada perfil entra apenas na propria area.
4. Confirmar que `logout` retorna para a tela de login.

## Fluxo do Operador

1. Entrar como operador.
2. Abrir `Configuracoes do Sistema`.
3. Alterar o nome da aplicacao, subtitulo e perfil de cores.
4. Salvar e confirmar:
   - o titulo visivel no sidebar muda;
   - o titulo da aba do navegador muda;
   - o tema visual e aplicado ao layout.
5. Abrir `Conteudos`.
6. Criar um novo curso.
7. Confirmar que o curso aparece na lista e pode entrar em edicao.
8. Criar um novo modulo de teste dentro desse curso.
9. Criar um conteudo de teste nesse modulo com:
   - texto no editor rico;
   - uma imagem por URL ou upload local;
   - um video incorporavel ou grafico didatico.
10. Confirmar que o conteudo salvo aparece imediatamente na listagem.
11. Editar o curso, o modulo criado e o conteudo criado, salvando cada alteracao.
12. Tentar excluir um modulo com dependencias e confirmar que a protecao impede exclusao incorreta.
13. Excluir um curso sem modulos nem matriculas e confirmar que a exclusao funciona.

## Fluxo de Turma e Liberacao

1. Ainda como operador, abrir `Turmas`.
2. Confirmar quais modulos estao liberados para a turma demo.
3. Liberar o modulo de teste, se necessario.
4. Confirmar que o status do modulo muda entre `Liberado` e `Bloqueado`.

## Fluxo de Questionarios

1. Abrir `Questionarios`.
2. Criar um questionario para um modulo liberado.
3. Adicionar ao menos uma questao manual.
4. Publicar o questionario.
5. Se houver texto suficiente no modulo, testar `Gerar rascunho automatico`.
6. Confirmar que o gabarito e as observacoes ficam visiveis apenas para operador.

## Fluxo do Aluno

1. Entrar como aluno.
2. Verificar `Visao Geral` com progresso, nota, tempo validado e status.
3. Abrir `Conteudos`.
4. Estudar um conteudo liberado e permanecer pelo menos 15 segundos com atividade real.
5. Clicar em `Finalizar leitura`.
6. Confirmar:
   - mensagem de sucesso ou alerta coerente;
   - conteudo marcado como concluido;
   - progresso atualizado.
7. Ainda no leitor do conteudo, confirmar que o `Questionario do modulo` aparece quando existir publicacao para aquele modulo.
8. Abrir o questionario pelo atalho do proprio modulo.
9. Confirmar que a leitura em andamento e encerrada antes da avaliacao.
10. Responder um questionario publicado.
11. Confirmar atualizacao de nota consolidada e limite de tentativas.
12. Abrir `Historico`.
13. Confirmar registro de:
   - sessoes de estudo;
   - tentativas de avaliacao;
   - tempos validados.

## Fluxo do Admin

1. Entrar como admin.
2. Abrir `Usuarios`.
3. Criar um novo usuario operador.
4. Inativar e reativar um usuario existente que nao seja a propria sessao.
5. Confirmar que o usuario inativo nao consegue autenticar.

## Resultado esperado do MVP

- RBAC funcional para admin, operador e aluno.
- Modulos liberados controlando o que o aluno enxerga.
- Historico registrando sessoes e tentativas.
- Avaliacao afetando nota e status final.
- Configuracoes do sistema refletidas sem editar codigo.
- Memoria operacional disponivel para registrar progresso, melhorias e bloqueios.

## Se algo falhar

1. Abra o console do navegador.
2. Registre o perfil usado, a tela, a acao executada e a mensagem de erro.
3. Anote se a base foi resetada antes do teste.
