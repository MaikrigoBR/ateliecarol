# Memory Card - Checklist da Aplicacao de Curso On-line

*Documento vivo para orientar a construcao e evolucao da plataforma. Se houver perda de contexto, este arquivo deve ser a referencia principal do produto.*

**Data de criacao:** Marco de 2026

---

## 1. Objetivo

Construir uma aplicacao de **Curso de Formacao / Treinamento** com:

- acesso restrito por perfil e autorizacao;
- matricula de alunos em turmas;
- liberacao de modulos por turma;
- historico evolutivo do aluno dentro do plano de estudos;
- registro de acesso, permanencia e desempenho;
- avaliacao dinamica parametrizavel;
- classificacao final do aluno como `Aprovado` ou `Reprovado`.

---

## 2. Objeto Principal

**Melhor modelagem logica:** o objeto principal deve ser o **Plano de Estudos**.

Motivos:

- o aluno consome uma trilha formativa, nao uma turma;
- a turma controla acesso e liberacao;
- a matricula conecta aluno, turma e plano;
- o historico evolutivo fica mais consistente quando medido sobre o plano e seus modulos.

**Relacao central:**

`Plano de Estudos -> Modulos -> Conteudos -> Avaliacoes`

`Turma -> libera -> Modulos`

`Aluno -> Matricula -> Turma`

`Matricula -> gera -> Historico, Progresso, Nota, Status final`

---

## 3. Perfis e Acessos

### Perfis

- [ ] `Administrador`: gerencia usuarios, permissoes, parametros globais e auditoria.
- [ ] `Operador`: cadastra conteudos, cria turmas, vincula modulos, acompanha progresso e ajusta parametros permitidos.
- [ ] `Aluno`: acessa apenas a `Area do Aluno`.

### Regras de seguranca

- [ ] Implementar autenticacao obrigatoria.
- [ ] Implementar autorizacao por perfil (`RBAC`).
- [ ] Proteger rotas, APIs e banco, nao apenas a interface.
- [ ] Bloquear acesso direto por URL a telas restritas.
- [ ] Registrar auditoria de operacoes criticas.

**Boa pratica:** usar `Firebase Auth` para autenticacao, `Firestore` para dados e `Cloud Functions` para operacoes sensiveis.

---

## 4. Areas da Aplicacao

### Area do Aluno

- [ ] Dashboard com trilha atual e progresso.
- [ ] Modulos liberados pela turma.
- [ ] Conteudos de estudo.
- [ ] Historico de estudos.
- [ ] Avaliacoes disponiveis e concluidas.
- [ ] Escore, nota parcial e status final.

### Area Restrita do Operador

- [ ] Cadastro de planos de estudos.
- [ ] Cadastro de modulos e conteudos.
- [ ] Criacao e gestao de turmas.
- [ ] Matricula e habilitacao de alunos.
- [ ] Parametrizacao dos criterios de avaliacao.
- [ ] Relatorios de desempenho e estatisticas.
- [ ] Gestao de operadores habilitados.

---

## 5. Modelo de Dados Recomendado

### Entidades principais

- [ ] `users`: perfil, status, dados basicos.
- [ ] `studyPlans`: titulo, descricao, carga horaria, versao.
- [ ] `modules`: plano, ordem, criterios minimos.
- [ ] `contents`: modulo, tipo, referencia, tempo estimado, status de publicacao.
- [ ] `classes`: turma, plano, periodo, status.
- [ ] `classModules`: vinculo entre turma e modulo com data de liberacao.
- [ ] `enrollments`: aluno, turma, plano, status, progresso, resultado final.
- [ ] `assessments`: avaliacao, peso, nota maxima, tentativas.
- [ ] `assessmentCriteria`: criterios e pesos parametrizaveis.
- [ ] `assessmentAttempts`: tentativas, nota, percentual, status.
- [ ] `studyEvents`: eventos brutos de acesso e estudo.
- [ ] `studySessions`: sessoes consolidadas com duracao validada.
- [ ] `progressSnapshots`: fotos de progresso por modulo.
- [ ] `auditLogs`: trilha de auditoria administrativa.

**Decisao importante:** `enrollments` deve ser a fonte principal do estado do aluno.

---

## 6. Regras de Matricula e Liberacao

- [ ] O aluno so acessa conteudos se a matricula estiver `ativa`.
- [ ] O aluno so visualiza modulos liberados para sua turma.
- [ ] Conteudos em rascunho nao aparecem na Area do Aluno.
- [ ] Aluno bloqueado ou com matricula cancelada perde acesso imediato.
- [ ] Operador nao pode elevar o proprio privilegio sem permissao administrativa.

**Fluxo recomendado:**

1. Administrador habilita operador.
2. Operador cria plano, modulos e conteudos.
3. Operador cria turma.
4. Operador vincula modulos liberados a turma.
5. Aluno e matriculado.
6. Sistema libera a Area do Aluno conforme regras da turma.

---

## 7. Historico Evolutivo do Aluno

### O que registrar

- [ ] data e hora de acesso;
- [ ] conteudo acessado;
- [ ] tempo validado de permanencia;
- [ ] modulo iniciado, pausado e concluido;
- [ ] avaliacoes iniciadas e finalizadas;
- [ ] notas por tentativa;
- [ ] evolucao percentual;
- [ ] mudancas de status da matricula.

### Melhor pratica para medir permanencia

- [ ] Registrar `view_start` ao entrar na pagina.
- [ ] Registrar `heartbeat` apenas com pagina visivel.
- [ ] Pausar contagem quando a aba estiver oculta ou sem atividade.
- [ ] Fechar sessao em saida, troca de pagina ou inatividade prolongada.
- [ ] Validar a duracao final no backend.

**Regra importante:** tempo de aba aberta sozinho nao deve contar como estudo valido. O ideal e combinar visibilidade, atividade real e desempenho.

---

## 8. Avaliacao Dinamica

### Requisitos

- [ ] Cada modulo pode ter uma ou mais avaliacoes.
- [ ] Cada avaliacao deve possuir criterios parametrizaveis manualmente.
- [ ] Cada criterio pode ter peso proprio.
- [ ] O sistema deve calcular nota bruta, percentual e nota ponderada.
- [ ] O sistema deve definir o status final do aluno com base em parametros configurados.

### Parametros sugeridos

- [ ] nota minima para aprovacao;
- [ ] percentual minimo por modulo;
- [ ] tempo minimo validado de estudo, se aplicavel;
- [ ] numero maximo de tentativas;
- [ ] peso de prova final;
- [ ] peso de atividades praticas;
- [ ] obrigatoriedade de concluir todos os modulos obrigatorios.

### Regra recomendada

`Aprovado` quando:

- todos os modulos obrigatorios estiverem concluidos;
- nota final ponderada for maior ou igual ao minimo parametrizado;
- requisitos adicionais obrigatorios forem satisfeitos.

Caso contrario:

- `Reprovado`, se a trilha estiver encerrada sem atingir criterios;
- `Em andamento`, enquanto houver pendencias.

**Boa pratica:** separar `motor de calculo`, `parametros da regra` e `resultado persistido`.

---

## 9. Estatisticas e Monitoramento

### Indicadores minimos

- [ ] taxa de acesso por aluno;
- [ ] tempo medio validado por conteudo;
- [ ] taxa de conclusao por modulo;
- [ ] nota media por turma;
- [ ] ranking de desempenho;
- [ ] taxa de aprovacao e reprovacao;
- [ ] alunos com risco de evasao;
- [ ] conteudos com maior abandono.

### Alertas recomendados

- [ ] aluno sem acesso ha X dias;
- [ ] aluno com baixo tempo e baixa nota;
- [ ] modulo com alto indice de abandono;
- [ ] turma com desempenho abaixo da meta.

**Boa pratica:** consolidar relatorios a partir de eventos brutos, gerando agregados periodicos para melhor performance.

---

## 10. Arquitetura Recomendada

### Stack aderente ao projeto atual

- [ ] `React + Vite` no front-end.
- [ ] `React Router` para separar `Area do Aluno` e `Area Restrita`.
- [ ] `Firebase Auth` para login.
- [ ] `Firestore` para dados transacionais.
- [ ] `Firebase Storage` para materiais.
- [ ] `Cloud Functions` para auditoria, calculo de notas e agregacoes.
- [ ] `Recharts` para dashboards e estatisticas.

### Boas praticas de UX

- [ ] mostrar ao aluno o que falta concluir;
- [ ] exibir nota parcial com transparencia;
- [ ] explicar claramente por que um modulo esta bloqueado;
- [ ] manter feedback objetivo apos avaliacao.

---

## 11. Melhores Praticas de Desenvolvimento

- [ ] modelar o dominio antes das telas;
- [ ] manter nomenclatura consistente;
- [ ] separar regras pedagogicas de regras tecnicas;
- [ ] versionar conteudos e criterios de avaliacao;
- [ ] validar dados no front e no backend;
- [ ] evitar logica critica somente no cliente;
- [ ] testar o motor de aprovacao;
- [ ] aplicar principios de LGPD para dados pessoais e historicos.

---

## 12. Roadmap Sugerido

### Fase 1 - Fundacao

- [ ] autenticacao
- [ ] perfis e permissoes
- [ ] modelo base de banco
- [ ] areas protegidas

### Fase 2 - Estrutura Academica

- [ ] planos de estudos
- [ ] modulos
- [ ] conteudos
- [ ] turmas
- [ ] matriculas
- [ ] liberacao de modulos por turma

### Fase 3 - Progresso e Historico

- [ ] tracking de acesso
- [ ] tracking de permanencia
- [ ] historico evolutivo
- [ ] dashboard do aluno

### Fase 4 - Avaliacao e Regras

- [ ] avaliacoes por modulo
- [ ] criterios parametrizaveis
- [ ] calculo de nota ponderada
- [ ] aprovado ou reprovado
- [ ] relatorios por turma e aluno

### Fase 5 - Inteligencia Operacional

- [ ] estatisticas agregadas
- [ ] alertas de risco
- [ ] indicadores gerenciais

---

## 13. Checklist de Aceite do MVP

- [ ] Aluno entra apenas na Area do Aluno.
- [ ] Operador entra apenas na Area Restrita conforme perfil.
- [ ] Apenas alunos matriculados acessam conteudos.
- [ ] Apenas modulos liberados aparecem para a turma.
- [ ] Historico registra acesso, permanencia e progresso.
- [ ] Avaliacao calcula nota automaticamente.
- [ ] Parametros definem aprovado ou reprovado.
- [ ] Operador consulta desempenho e estatisticas basicas.
- [ ] Sistema registra auditoria minima.

---

## 14. Direcao Recomendada

Para longevidade e governanca, tratar a plataforma como um sistema orientado a:

- `Matricula` como estado do aluno;
- `Plano de Estudos` como nucleo pedagogico;
- `Turma` como mecanismo de liberacao;
- `Eventos de estudo` como fonte de verdade para historico;
- `Motor de avaliacao parametrizavel` como nucleo de decisao academica.

Essa estrutura torna a aplicacao mais escalavel, auditavel e aderente a boas praticas de treinamento e educacao digital.
