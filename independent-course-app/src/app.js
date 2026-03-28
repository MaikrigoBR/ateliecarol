const STORAGE_KEY = "training-hub-independent-db-v1";
const SESSION_KEY = "training-hub-independent-session-v1";
const CONTENT_MIN_SECONDS = 15;

const appElement = document.getElementById("app");

const state = {
  page: null,
  selectedContentId: null,
  selectedAssessmentId: null,
  flash: null,
  tracker: null,
  activeEditorId: null,
  activeEditorRange: null,
  editingStudyPlanId: null,
  editingModuleId: null,
  editingContentId: null,
};

const THEME_PROFILES = {
  terracotta: {
    label: "Terracotta",
    description: "Quente, institucional e acolhedor.",
  },
  ocean: {
    label: "Ocean",
    description: "Mais frio, tecnico e moderno.",
  },
  forest: {
    label: "Forest",
    description: "Tom educacional e concentrado.",
  },
  graphite: {
    label: "Graphite",
    description: "Visual executivo com contraste mais sobrio.",
  },
};

const ACTION_LABELS = {
  seed_created: "Base inicial criada",
  session_login: "Login realizado",
  session_logout: "Logout realizado",
  database_reset: "Base resetada",
  study_plan_created: "Curso criado",
  study_plan_updated: "Curso atualizado",
  study_plan_deleted: "Curso excluido",
  student_created: "Aluno matriculado",
  module_created: "Modulo criado",
  module_updated: "Modulo atualizado",
  module_deleted: "Modulo excluido",
  content_created: "Conteudo criado",
  content_updated: "Conteudo atualizado",
  content_deleted: "Conteudo excluido",
  assessment_created: "Questionario criado",
  assessment_question_added: "Questao adicionada",
  assessment_auto_draft_created: "Rascunho automatico criado",
  assessment_publish_toggled: "Status de publicacao alterado",
  assessment_deleted: "Questionario excluido",
  settings_updated: "Configuracoes atualizadas",
  memory_registered: "Memoria registrada",
  user_created: "Usuario criado",
  user_status_toggled: "Status de usuario alterado",
  class_module_toggled: "Liberacao de modulo alterada",
};

const ENTITY_LABELS = {
  application: "Aplicacao",
  session: "Sessao",
  studyPlan: "Curso",
  module: "Modulo",
  content: "Conteudo",
  assessment: "Questionario",
  settings: "Configuracoes",
  memory: "Memoria",
  user: "Usuario",
  classModule: "Liberacao de modulo",
};

const PORTUGUESE_STOPWORDS = new Set([
  "para", "como", "mais", "menos", "sobre", "entre", "todos", "todas", "essa", "esse", "isso", "esta", "este",
  "ser", "sao", "com", "sem", "uma", "umas", "uns", "dos", "das", "que", "por", "não", "nao", "nos", "nas", "aos",
  "a", "o", "os", "as", "de", "do", "da", "e", "em", "no", "na", "um", "ao", "se", "ou", "é", "foi", "sua", "seu",
  "suas", "seus", "ele", "ela", "eles", "elas", "cada", "quando", "onde", "tambem", "também", "deve", "devem",
  "pelo", "pela", "pelos", "pelas", "apos", "após", "dentro", "fora", "muito", "muita", "muitos", "muitas",
]);

function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function round(value, precision = 0) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMonthLabel(monthKey) {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return "-";
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function formatPercent(value, precision = 1) {
  return `${round(Number(value) || 0, precision)}%`;
}

function formatDuration(totalSeconds = 0) {
  const seconds = Number(totalSeconds) || 0;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rem = seconds % 60;

  if (hours > 0) return `${hours}h ${minutes}min`;
  if (minutes > 0) return `${minutes}min ${rem}s`;
  return `${rem}s`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatCsvCell(value = "") {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function buildCsvLine(values = []) {
  return values.map((value) => formatCsvCell(value)).join(";");
}

function triggerDownload(filename, content, mimeType = "text/plain;charset=utf-8") {
  if (typeof document === "undefined") return false;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return true;
}

function getLatestTimestamp(values = []) {
  return values.reduce((latest, current) => {
    if (!current) return latest;
    if (!latest) return current;
    return new Date(current) > new Date(latest) ? current : latest;
  }, null);
}

function averageBy(items, mapper, precision = 1) {
  if (!items.length) return 0;
  return round(items.reduce((sum, item) => sum + (Number(mapper(item)) || 0), 0) / items.length, precision);
}

function formatAuditAction(action = "") {
  return ACTION_LABELS[action] || action.replaceAll("_", " ");
}

function formatAuditEntity(entity = "") {
  return ENTITY_LABELS[entity] || entity;
}

function setFlash(type, text) {
  state.flash = { type, text, at: Date.now() };
}

function consumeFlash() {
  if (!state.flash) return "";
  const flash = state.flash;
  if (Date.now() - flash.at > 8000) {
    state.flash = null;
    return "";
  }
  return `<div class="alert ${flash.type}">${escapeHtml(flash.text)}</div>`;
}

function getApplicationName(database) {
  return database.settings?.applicationName || database.meta?.name || "Training Hub Independente";
}

function getApplicationTagline(database) {
  return database.settings?.applicationTagline || "Curso on-line independente";
}

function applySystemTheme(database) {
  document.body.dataset.theme = database.settings?.themeProfile || "terracotta";
  document.title = getApplicationName(database);
}

function normalizeVideoUrl(url = "") {
  if (!url) return "";
  if (url.includes("youtube.com/watch?v=")) {
    return url.replace("watch?v=", "embed/");
  }
  if (url.includes("youtu.be/")) {
    return url.replace("youtu.be/", "www.youtube.com/embed/");
  }
  return url;
}

function parseChartData(rawValue = "") {
  if (!rawValue.trim()) return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .map((item) => ({
        label: String(item.label || "").trim(),
        value: Number(item.value) || 0,
      }))
      .filter((item) => item.label);
  } catch (error) {
    return null;
  }
}

function renderVisualBlocks(content) {
  const visuals = Array.isArray(content.visuals) ? content.visuals : [];
  if (!visuals.length) return "";

  return `
    <div class="visual-gallery">
      ${visuals.map((visual) => {
        if (visual.type === "image") {
          return `
            <figure class="media-panel">
              <img class="immersive-image" src="${escapeHtml(visual.url || "")}" alt="${escapeHtml(visual.title || content.title)}" />
              ${visual.caption ? `<figcaption class="footer-note">${escapeHtml(visual.caption)}</figcaption>` : ""}
            </figure>
          `;
        }

        if (visual.type === "video") {
          const videoUrl = normalizeVideoUrl(visual.url || "");
          return `
            <div class="media-panel">
              <div class="immersive-frame">
                <iframe src="${escapeHtml(videoUrl)}" title="${escapeHtml(visual.title || content.title)}" loading="lazy" allowfullscreen></iframe>
              </div>
              ${visual.caption ? `<p class="footer-note">${escapeHtml(visual.caption)}</p>` : ""}
            </div>
          `;
        }

        if (visual.type === "chart") {
          const chartData = Array.isArray(visual.data) ? visual.data : [];
          return `
            <div class="media-panel">
              <div class="panel-header">
                <div>
                  <strong>${escapeHtml(visual.title || "Grafico didatico")}</strong>
                  ${visual.caption ? `<p class="footer-note">${escapeHtml(visual.caption)}</p>` : ""}
                </div>
              </div>
              <div class="chart-bars">
                ${chartData.map((item) => `
                  <div class="chart-row">
                    <span class="chart-label">${escapeHtml(item.label)}</span>
                    <div class="chart-track"><div class="chart-fill" style="width:${Math.min(100, Math.max(0, Number(item.value) || 0))}%"></div></div>
                    <span class="chart-value">${Number(item.value) || 0}</span>
                  </div>
                `).join("")}
              </div>
            </div>
          `;
        }

        return "";
      }).join("")}
    </div>
  `;
}

function convertPlainTextToHtml(text = "") {
  return String(text)
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`)
    .join("");
}

function sanitizeRichHtml(rawHtml = "") {
  if (!rawHtml.trim() || typeof document === "undefined") return "";

  const template = document.createElement("template");
  template.innerHTML = rawHtml;

  template.content.querySelectorAll("script, style").forEach((node) => node.remove());
  template.content.querySelectorAll("*").forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith("on")) node.removeAttribute(attribute.name);
      if ((name === "src" || name === "href") && value.startsWith("javascript:")) {
        node.removeAttribute(attribute.name);
      }
    });
  });

  return template.innerHTML;
}

function extractPlainTextFromHtml(html = "") {
  if (typeof document === "undefined") return html;
  const container = document.createElement("div");
  container.innerHTML = html;
  return (container.textContent || container.innerText || "").trim();
}

function shuffleArray(items = []) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

function createDefaultAssessmentCriteria(prefix) {
  return [
    { id: `${prefix}-criterion-1`, label: "Compreensao", weight: 40 },
    { id: `${prefix}-criterion-2`, label: "Aplicacao", weight: 35 },
    { id: `${prefix}-criterion-3`, label: "Retencao", weight: 25 },
  ];
}

function getStudyPlanById(database, studyPlanId) {
  return database.studyPlans.find((item) => item.id === studyPlanId) || null;
}

function getEditingStudyPlan(database) {
  return state.editingStudyPlanId ? getStudyPlanById(database, state.editingStudyPlanId) : null;
}

function getModuleById(database, moduleId) {
  return database.modules.find((item) => item.id === moduleId) || null;
}

function getEditingModule(database) {
  return state.editingModuleId ? getModuleById(database, state.editingModuleId) : null;
}

function getContentById(database, contentId) {
  return database.contents.find((item) => item.id === contentId) || null;
}

function getEditingContent(database) {
  return state.editingContentId ? getContentById(database, state.editingContentId) : null;
}

function getClassById(database, classId) {
  return database.classes.find((item) => item.id === classId) || null;
}

function getPrimaryVisual(content) {
  return Array.isArray(content?.visuals) && content.visuals.length ? content.visuals[0] : null;
}

function getVisibleAssessments(database, enrollment) {
  const releasedModuleIds = getReleasedModules(database, enrollment.classId).map((module) => module.id);
  return database.assessments.filter((assessment) =>
    releasedModuleIds.includes(assessment.moduleId) && assessment.published !== false && Array.isArray(assessment.questions) && assessment.questions.length > 0,
  );
}

function getReleaseSummaryForModule(database, module) {
  const studyPlanClasses = database.classes.filter((item) => item.studyPlanId === module.studyPlanId);
  if (!studyPlanClasses.length) return "Sem turmas";
  const releasedCount = studyPlanClasses.filter((studyClass) => getClassModuleRelease(database, studyClass.id, module.id)?.released).length;
  return `${releasedCount}/${studyPlanClasses.length} turma(s) liberadas`;
}

function tokenizeKeywords(text = "") {
  return (text.match(/[A-Za-zÀ-ÿ]{4,}/g) || [])
    .map((token) => token.toLowerCase())
    .filter((token) => !PORTUGUESE_STOPWORDS.has(token));
}

function buildAutomaticQuestionsForModule(database, moduleId, assessmentId) {
  const module = getModuleById(database, moduleId);
  if (!module) return [];

  const moduleContents = database.contents.filter((content) => content.moduleId === moduleId);
  const fullText = moduleContents.map((content) => `${content.title}. ${content.summary}. ${content.body || ""}`).join(" ");
  const sentences = fullText
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 45)
    .slice(0, 3);

  const frequencies = tokenizeKeywords(fullText).reduce((accumulator, token) => {
    accumulator[token] = (accumulator[token] || 0) + 1;
    return accumulator;
  }, {});
  const keywordPool = Object.entries(frequencies)
    .sort((left, right) => right[1] - left[1])
    .map(([token]) => token);

  const criteria = createDefaultAssessmentCriteria(assessmentId);

  return sentences.map((sentence, index) => {
    const words = tokenizeKeywords(sentence);
    const answerToken = words.find((word) => keywordPool.includes(word)) || keywordPool[index] || module.title.toLowerCase();
    const distractors = keywordPool.filter((word) => word !== answerToken).slice(index * 3, index * 3 + 3);
    while (distractors.length < 3) {
      distractors.push(`conceito ${distractors.length + 1}`);
    }

    const maskedSentence = sentence.replace(new RegExp(answerToken, "i"), "_____");
    const options = shuffleArray([
      { id: `${assessmentId}-question-${index + 1}-option-1`, label: answerToken.charAt(0).toUpperCase() + answerToken.slice(1), correct: true },
      ...distractors.slice(0, 3).map((label, optionIndex) => ({
        id: `${assessmentId}-question-${index + 1}-option-${optionIndex + 2}`,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        correct: false,
      })),
    ]);

    return {
      id: `${assessmentId}-question-${index + 1}`,
      criterionId: criteria[index % criteria.length].id,
      prompt: `De acordo com o conteudo do modulo, qual termo completa melhor a afirmacao: "${maskedSentence}"?`,
      options,
      explanation: sentence,
      generated: true,
    };
  });
}

function renderContentBody(content) {
  const html = content.bodyHtml
    ? sanitizeRichHtml(content.bodyHtml)
    : convertPlainTextToHtml(content.body || "");

  return `<div class="reader-body rich-body">${html}</div>`;
}

function syncRichEditors(scope = document) {
  scope.querySelectorAll(".rich-editor").forEach((editor) => {
    const hiddenInput = scope.querySelector(`[name="${editor.dataset.target}"]`);
    if (hiddenInput) hiddenInput.value = editor.innerHTML;
  });
}

function getEditorById(editorId) {
  return document.querySelector(`.rich-editor[data-editor-id="${editorId}"]`);
}

function placeCursorAtEnd(editor) {
  if (!editor) return;
  editor.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  state.activeEditorRange = range.cloneRange();
  state.activeEditorId = editor.dataset.editorId || null;
}

function rememberEditorSelection(editor) {
  if (!editor) return;
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return;
  state.activeEditorRange = range.cloneRange();
  state.activeEditorId = editor.dataset.editorId || null;
}

function restoreEditorSelection(editor) {
  if (!editor) return;
  editor.focus();

  const selection = window.getSelection();
  selection.removeAllRanges();

  if (state.activeEditorRange && state.activeEditorId === editor.dataset.editorId) {
    selection.addRange(state.activeEditorRange);
    return;
  }

  placeCursorAtEnd(editor);
}

function insertHtmlIntoEditor(editor, html) {
  if (!editor) return;
  restoreEditorSelection(editor);

  const selection = window.getSelection();
  if (!selection.rangeCount) {
    editor.insertAdjacentHTML("beforeend", html);
    syncRichEditors(editor.closest("form") || document);
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();

  const template = document.createElement("template");
  template.innerHTML = html;
  const fragment = template.content.cloneNode(true);
  const lastNode = fragment.lastChild;
  range.insertNode(fragment);

  if (lastNode) {
    const nextRange = document.createRange();
    nextRange.setStartAfter(lastNode);
    nextRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(nextRange);
    state.activeEditorRange = nextRange.cloneRange();
  }

  syncRichEditors(editor.closest("form") || document);
}

function handleEditorCommand(editorId, command) {
  const editor = getEditorById(editorId);
  if (!editor) return;

  restoreEditorSelection(editor);

  if (command === "paragraph") {
    document.execCommand("formatBlock", false, "p");
  } else if (command === "heading") {
    document.execCommand("formatBlock", false, "h2");
  } else if (command === "bullets") {
    document.execCommand("insertUnorderedList", false);
  } else if (command === "numbered") {
    document.execCommand("insertOrderedList", false);
  } else if (command === "bold" || command === "italic") {
    document.execCommand(command, false);
  } else if (command === "link") {
    const url = window.prompt("Informe a URL do link:");
    if (url) document.execCommand("createLink", false, url.trim());
  } else if (command === "image-url") {
    const url = window.prompt("Informe a URL da imagem:");
    if (url) insertHtmlIntoEditor(editor, `<img src="${escapeHtml(url.trim())}" alt="Imagem do conteudo" />`);
  }

  rememberEditorSelection(editor);
  syncRichEditors(editor.closest("form") || document);
}

function insertImageFileIntoEditor(editorId, file) {
  const editor = getEditorById(editorId);
  if (!editor || !file) return;

  if (!file.type.startsWith("image/")) {
    window.alert("Apenas arquivos de imagem podem ser inseridos no corpo do conteudo.");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    insertHtmlIntoEditor(editor, `<img src="${reader.result}" alt="${escapeHtml(file.name)}" />`);
    rememberEditorSelection(editor);
  };
  reader.readAsDataURL(file);
}

function createSeedDatabase() {
  const createdAt = nowIso();

  return {
    meta: {
      name: "Training Hub Independente",
      version: "1.0.0",
      createdAt,
      storageMode: "local-browser-database",
    },
    settings: {
      applicationName: "Training Hub Independente",
      applicationTagline: "Curso on-line independente",
      themeProfile: "terracotta",
      heartbeatSeconds: 5,
      minOverallScore: 70,
      minValidatedStudySeconds: 60,
      requireAllMandatory: true,
    },
    users: [
      { id: "user-admin", name: "Renata Gestora", email: "admin@traininghub.local", password: "Admin@123", role: "admin", active: true, createdAt },
      { id: "user-operator", name: "Marcos Operador", email: "operador@traininghub.local", password: "Operador@123", role: "operator", active: true, createdAt },
      { id: "user-student-1", name: "Lucia Martins", email: "aluno@traininghub.local", password: "Aluno@123", role: "student", active: true, createdAt },
      { id: "user-student-2", name: "Joao Souza", email: "joao@traininghub.local", password: "Aluno@123", role: "student", active: true, createdAt },
    ],
    studyPlans: [
      {
        id: "plan-1",
        title: "Formacao Comercial e Atendimento",
        description: "Trilha para onboarding comercial, atendimento consultivo e governanca de rotina.",
        workloadHours: 24,
        version: "1.0",
        createdAt,
      },
    ],
    modules: [
      { id: "module-1", studyPlanId: "plan-1", title: "Fundamentos da Jornada", description: "Visao geral da trilha, papeis e criterios de registro.", order: 1, mandatory: true },
      { id: "module-2", studyPlanId: "plan-1", title: "Atendimento Consultivo", description: "Diagnostico, comunicacao e conducoes orientadas a valor.", order: 2, mandatory: true },
      { id: "module-3", studyPlanId: "plan-1", title: "Compliance e Encerramento", description: "Padroes de auditoria, evidencia e encerramento de jornada.", order: 3, mandatory: true },
    ],
    contents: [
      { id: "content-1", moduleId: "module-1", title: "Boas-vindas e objetivos", type: "texto", summary: "Entenda a estrutura da formacao, metas e forma de avaliacao.", body: "Esta trilha foi criada para garantir consistencia operacional e leitura progressiva da jornada.\n\nO aluno deve compreender como os modulos se conectam, quais evidencias contam para progresso e como a pontuacao final e consolidada.", timeEstimateMinutes: 5, visuals: [{ type: "image", title: "Mapa da trilha", caption: "Visao macro da jornada do aluno.", url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 420'><rect width='800' height='420' rx='34' fill='%23b85c38'/><circle cx='120' cy='210' r='56' fill='%23f8efe4'/><circle cx='400' cy='210' r='56' fill='%23f8efe4'/><circle cx='680' cy='210' r='56' fill='%23f8efe4'/><path d='M176 210h168M456 210h168' stroke='%23f8efe4' stroke-width='18' stroke-linecap='round'/><text x='400' y='98' font-family='Trebuchet MS' font-size='42' text-anchor='middle' fill='%23fff8f0'>Jornada Formativa</text><text x='120' y='220' font-family='Trebuchet MS' font-size='24' text-anchor='middle' fill='%23543f2a'>Inicio</text><text x='400' y='220' font-family='Trebuchet MS' font-size='24' text-anchor='middle' fill='%23543f2a'>Pratica</text><text x='680' y='220' font-family='Trebuchet MS' font-size='24' text-anchor='middle' fill='%23543f2a'>Avaliacao</text></svg>" }] },
      { id: "content-2", moduleId: "module-1", title: "Regras de acesso e matricula", type: "texto", summary: "Entenda o papel da turma, da matricula ativa e dos modulos liberados.", body: "A turma organiza a liberacao de modulos, enquanto a matricula representa o estado do aluno na trilha.\n\nSem matricula ativa, o acesso ao conteudo deve ser imediatamente interrompido.", timeEstimateMinutes: 6 },
      { id: "content-3", moduleId: "module-2", title: "Escuta consultiva", type: "texto", summary: "Perguntas abertas, contexto do cliente e validacao de necessidade.", body: "Atendimento consultivo depende de escuta ativa, reconstrucao do problema e sintese antes da oferta.\n\nUma conversa forte documenta contexto, necessidade e proximo passo de forma rastreavel.", timeEstimateMinutes: 7, visuals: [{ type: "chart", title: "Elementos da conversa consultiva", caption: "Distribuicao sugerida de foco durante uma conversa de diagnostico.", data: [{ label: "Escuta", value: 40 }, { label: "Perguntas", value: 30 }, { label: "Sintese", value: 20 }, { label: "Oferta", value: 10 }] }] },
      { id: "content-4", moduleId: "module-2", title: "Registro de interacoes", type: "texto", summary: "Como gerar historico util e auditavel da relacao com o aluno ou cliente.", body: "O registro deve guardar data, canal, conteudo da interacao e responsabilidade.\n\nHistorico sem contexto nao gera estatistica de qualidade e prejudica a leitura evolutiva.", timeEstimateMinutes: 6 },
      { id: "content-5", moduleId: "module-3", title: "Governanca de evidencias", type: "texto", summary: "Padroes minimos de evidencia para provar conclusao e aderencia.", body: "Para fechar uma jornada com consistencia, o operador precisa garantir evidencias, regras claras e rastreabilidade.\n\nA auditoria deve conseguir entender quem liberou, quem concluiu e com qual resultado.", timeEstimateMinutes: 8 },
      { id: "content-6", moduleId: "module-3", title: "Criterios de encerramento", type: "texto", summary: "Como determinar quando a trilha pode gerar aprovacao ou reprovacao.", body: "Aprovacao exige criterios pedagogicos e tecnicos.\n\nNao basta abrir a aba do conteudo: e preciso combinar permanencia validada, progresso concluido e desempenho minimo nas avaliacoes.", timeEstimateMinutes: 7 },
    ],
    classes: [
      { id: "class-1", studyPlanId: "plan-1", name: "Turma Marco 2026", startDate: "2026-03-01", endDate: "2026-05-30", status: "active" },
    ],
    classModules: [
      { id: "class-module-1", classId: "class-1", moduleId: "module-1", released: true, releasedAt: createdAt },
      { id: "class-module-2", classId: "class-1", moduleId: "module-2", released: true, releasedAt: createdAt },
      { id: "class-module-3", classId: "class-1", moduleId: "module-3", released: false, releasedAt: null },
    ],
    enrollments: [
      { id: "enrollment-1", studentId: "user-student-1", classId: "class-1", studyPlanId: "plan-1", status: "active", completedContentIds: ["content-1"], progressPercent: 0, score: 0, finalStatus: "Em andamento", validatedStudySeconds: 0, lastAccessAt: null },
      { id: "enrollment-2", studentId: "user-student-2", classId: "class-1", studyPlanId: "plan-1", status: "active", completedContentIds: ["content-1", "content-2", "content-3"], progressPercent: 0, score: 0, finalStatus: "Em andamento", validatedStudySeconds: 0, lastAccessAt: createdAt },
    ],
    assessments: [
      {
        id: "assessment-1",
        moduleId: "module-1",
        title: "Avaliacao de Fundamentos",
        weight: 35,
        attemptsAllowed: 2,
        published: true,
        criteria: [
          { id: "assessment-1-criterion-1", label: "Compreensao da trilha", weight: 40 },
          { id: "assessment-1-criterion-2", label: "Controle de acesso", weight: 35 },
          { id: "assessment-1-criterion-3", label: "Registro evolutivo", weight: 25 },
        ],
        questions: [
          { id: "assessment-1-question-1", criterionId: "assessment-1-criterion-1", prompt: "Qual entidade conecta aluno, turma e plano de estudos?", options: [{ id: "assessment-1-question-1-option-1", label: "Matricula", correct: true }, { id: "assessment-1-question-1-option-2", label: "Modulo", correct: false }, { id: "assessment-1-question-1-option-3", label: "Conteudo", correct: false }] },
          { id: "assessment-1-question-2", criterionId: "assessment-1-criterion-2", prompt: "Quando um aluno deve perder acesso ao conteudo?", options: [{ id: "assessment-1-question-2-option-1", label: "Somente ao final do curso", correct: false }, { id: "assessment-1-question-2-option-2", label: "Quando a matricula ficar inativa ou cancelada", correct: true }, { id: "assessment-1-question-2-option-3", label: "Quando terminar o dia", correct: false }] },
          { id: "assessment-1-question-3", criterionId: "assessment-1-criterion-3", prompt: "Qual combinacao representa melhor um historico evolutivo confiavel?", options: [{ id: "assessment-1-question-3-option-1", label: "Apenas ultima nota", correct: false }, { id: "assessment-1-question-3-option-2", label: "Acesso, permanencia, progresso e tentativas", correct: true }, { id: "assessment-1-question-3-option-3", label: "Somente data de login", correct: false }] },
        ],
      },
      {
        id: "assessment-2",
        moduleId: "module-2",
        title: "Avaliacao de Atendimento Consultivo",
        weight: 35,
        attemptsAllowed: 2,
        published: true,
        criteria: [
          { id: "assessment-2-criterion-1", label: "Diagnostico", weight: 35 },
          { id: "assessment-2-criterion-2", label: "Comunicacao", weight: 35 },
          { id: "assessment-2-criterion-3", label: "Registro", weight: 30 },
        ],
        questions: [
          { id: "assessment-2-question-1", criterionId: "assessment-2-criterion-1", prompt: "Qual atitude demonstra escuta consultiva?", options: [{ id: "assessment-2-question-1-option-1", label: "Responder antes de ouvir o contexto", correct: false }, { id: "assessment-2-question-1-option-2", label: "Investigar causa, objetivo e restricao", correct: true }, { id: "assessment-2-question-1-option-3", label: "Apresentar preco imediatamente", correct: false }] },
          { id: "assessment-2-question-2", criterionId: "assessment-2-criterion-2", prompt: "Qual postura melhora a conducao da conversa?", options: [{ id: "assessment-2-question-2-option-1", label: "Sintetizar o que foi entendido antes de propor acao", correct: true }, { id: "assessment-2-question-2-option-2", label: "Ignorar objecoes", correct: false }, { id: "assessment-2-question-2-option-3", label: "Mudar de assunto rapidamente", correct: false }] },
          { id: "assessment-2-question-3", criterionId: "assessment-2-criterion-3", prompt: "O registro minimo de uma interacao deve incluir:", options: [{ id: "assessment-2-question-3-option-1", label: "Data, canal, contexto e proximo passo", correct: true }, { id: "assessment-2-question-3-option-2", label: "Apenas a data", correct: false }, { id: "assessment-2-question-3-option-3", label: "Somente o nome do cliente", correct: false }] },
        ],
      },
      {
        id: "assessment-3",
        moduleId: "module-3",
        title: "Avaliacao de Compliance",
        weight: 30,
        attemptsAllowed: 1,
        published: true,
        criteria: [
          { id: "assessment-3-criterion-1", label: "Governanca", weight: 45 },
          { id: "assessment-3-criterion-2", label: "Evidencia", weight: 30 },
          { id: "assessment-3-criterion-3", label: "Encerramento", weight: 25 },
        ],
        questions: [
          { id: "assessment-3-question-1", criterionId: "assessment-3-criterion-1", prompt: "Por que o backend deve proteger operacoes criticas?", options: [{ id: "assessment-3-question-1-option-1", label: "Para evitar manipulacao apenas visual da permissao", correct: true }, { id: "assessment-3-question-1-option-2", label: "Somente por estilo", correct: false }, { id: "assessment-3-question-1-option-3", label: "Nao precisa proteger", correct: false }] },
          { id: "assessment-3-question-2", criterionId: "assessment-3-criterion-2", prompt: "O que precisa existir para uma conclusao auditavel?", options: [{ id: "assessment-3-question-2-option-1", label: "Somente aprovacao verbal", correct: false }, { id: "assessment-3-question-2-option-2", label: "Evidencias, logs e criterio aplicado", correct: true }, { id: "assessment-3-question-2-option-3", label: "Apenas um print sem contexto", correct: false }] },
          { id: "assessment-3-question-3", criterionId: "assessment-3-criterion-3", prompt: "Quando o aluno pode receber status final?", options: [{ id: "assessment-3-question-3-option-1", label: "Ao concluir criterios obrigatorios e nota minima parametrizada", correct: true }, { id: "assessment-3-question-3-option-2", label: "Sempre no primeiro login", correct: false }, { id: "assessment-3-question-3-option-3", label: "Sem necessidade de avaliacao", correct: false }] },
        ],
      },
    ],
    assessmentAttempts: [
      {
        id: "attempt-seed-1",
        assessmentId: "assessment-1",
        enrollmentId: "enrollment-2",
        userId: "user-student-2",
        answers: { "assessment-1-question-1": "assessment-1-question-1-option-1", "assessment-1-question-2": "assessment-1-question-2-option-2", "assessment-1-question-3": "assessment-1-question-3-option-2" },
        score: 100,
        criteriaBreakdown: [{ label: "Compreensao da trilha", score: 100 }, { label: "Controle de acesso", score: 100 }, { label: "Registro evolutivo", score: 100 }],
        createdAt,
      },
      {
        id: "attempt-seed-2",
        assessmentId: "assessment-2",
        enrollmentId: "enrollment-2",
        userId: "user-student-2",
        answers: { "assessment-2-question-1": "assessment-2-question-1-option-2", "assessment-2-question-2": "assessment-2-question-2-option-1", "assessment-2-question-3": "assessment-2-question-3-option-1" },
        score: 100,
        criteriaBreakdown: [{ label: "Diagnostico", score: 100 }, { label: "Comunicacao", score: 100 }, { label: "Registro", score: 100 }],
        createdAt,
      },
    ],
    studyEvents: [
      { id: "event-seed-1", enrollmentId: "enrollment-2", contentId: "content-1", type: "view_end", timestamp: createdAt, metadata: { validatedStudySeconds: 180, origin: "seed" } },
      { id: "event-seed-2", enrollmentId: "enrollment-2", contentId: "content-2", type: "view_end", timestamp: createdAt, metadata: { validatedStudySeconds: 150, origin: "seed" } },
      { id: "event-seed-3", enrollmentId: "enrollment-2", contentId: "content-3", type: "view_end", timestamp: createdAt, metadata: { validatedStudySeconds: 220, origin: "seed" } },
    ],
    studySessions: [
      { id: "session-seed-1", enrollmentId: "enrollment-2", contentId: "content-1", startedAt: createdAt, endedAt: createdAt, validatedStudySeconds: 180, origin: "seed" },
      { id: "session-seed-2", enrollmentId: "enrollment-2", contentId: "content-2", startedAt: createdAt, endedAt: createdAt, validatedStudySeconds: 150, origin: "seed" },
      { id: "session-seed-3", enrollmentId: "enrollment-2", contentId: "content-3", startedAt: createdAt, endedAt: createdAt, validatedStudySeconds: 220, origin: "seed" },
    ],
    auditLogs: [
      { id: "audit-seed-1", actorUserId: "user-admin", action: "seed_created", entity: "application", entityId: "training-hub", timestamp: createdAt, details: "Base inicial standalone criada." },
    ],
    memoryLog: [
      { id: "memory-seed-1", kind: "progress", title: "Aplicacao independente iniciada", details: "Estrutura isolada criada para nao compartilhar codigo com os sistemas existentes.", createdAt },
      { id: "memory-seed-2", kind: "improvement", title: "Migracao futura de banco", details: "Substituir persistencia local por backend dedicado com banco remoto e autenticacao forte.", createdAt },
    ],
  };
}

function saveDatabase(database) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
}

function loadDatabase() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = recalculateDatabase(createSeedDatabase());
    saveDatabase(seeded);
    return seeded;
  }

  try {
    return recalculateDatabase(JSON.parse(raw));
  } catch (error) {
    const fallback = recalculateDatabase(createSeedDatabase());
    saveDatabase(fallback);
    return fallback;
  }
}

function persistDatabase(mutator) {
  const database = clone(loadDatabase());
  mutator(database);
  const normalized = recalculateDatabase(database);
  saveDatabase(normalized);
  return normalized;
}

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function getCurrentUser(database) {
  const session = getSession();
  if (!session) return null;
  const user = database.users.find((item) => item.id === session.userId);
  if (!user || !user.active) return null;
  return user;
}

function getClassModuleRelease(database, classId, moduleId) {
  return database.classModules.find((item) => item.classId === classId && item.moduleId === moduleId);
}

function getReleasedModules(database, classId) {
  const releasedIds = database.classModules.filter((item) => item.classId === classId && item.released).map((item) => item.moduleId);
  return database.modules.filter((module) => releasedIds.includes(module.id)).sort((left, right) => left.order - right.order);
}

function getReleasedContents(database, enrollment) {
  const releasedModules = getReleasedModules(database, enrollment.classId).map((module) => module.id);
  return database.contents.filter((content) => releasedModules.includes(content.moduleId));
}
function getEnrollmentAttempts(database, enrollmentId) {
  return database.assessmentAttempts.filter((attempt) => attempt.enrollmentId === enrollmentId);
}

function getBestAttemptMap(database, enrollmentId) {
  return getEnrollmentAttempts(database, enrollmentId).reduce((accumulator, attempt) => {
    const current = accumulator[attempt.assessmentId];
    if (!current || attempt.score > current.score) {
      accumulator[attempt.assessmentId] = attempt;
    }
    return accumulator;
  }, {});
}

function computeAssessmentScore(assessment, answers) {
  const criterionPoints = {};
  const criterionTotals = {};

  assessment.criteria.forEach((criterion) => {
    criterionPoints[criterion.id] = 0;
    criterionTotals[criterion.id] = 0;
  });

  assessment.questions.forEach((question) => {
    criterionTotals[question.criterionId] += 1;
    const selected = answers[question.id];
    const correct = question.options.find((option) => option.correct);
    if (selected && correct && selected === correct.id) {
      criterionPoints[question.criterionId] += 1;
    }
  });

  const criteriaBreakdown = assessment.criteria.map((criterion) => {
    const total = criterionTotals[criterion.id] || 1;
    const score = round((criterionPoints[criterion.id] / total) * 100, 2);
    return { label: criterion.label, score, weight: criterion.weight };
  });

  const weightedScore = round(criteriaBreakdown.reduce((sum, item) => sum + (item.score * item.weight) / 100, 0), 2);
  return { weightedScore, criteriaBreakdown };
}

function computeEnrollmentStats(database, enrollment) {
  const releasedModules = getReleasedModules(database, enrollment.classId);
  const releasedModuleIds = releasedModules.map((module) => module.id);
  const releasedContents = getReleasedContents(database, enrollment);
  const completedContentIds = Array.from(new Set(enrollment.completedContentIds || []));
  const completedReleasedCount = releasedContents.filter((content) => completedContentIds.includes(content.id)).length;
  const progressPercent = releasedContents.length ? round((completedReleasedCount / releasedContents.length) * 100, 1) : 0;
  const sessions = database.studySessions.filter((session) => session.enrollmentId === enrollment.id);
  const validatedStudySeconds = sessions.reduce((sum, session) => sum + (Number(session.validatedStudySeconds) || 0), 0);
  const attemptsMap = getBestAttemptMap(database, enrollment.id);
  const relevantAssessments = database.assessments.filter((assessment) =>
    releasedModuleIds.includes(assessment.moduleId) && assessment.published !== false && Array.isArray(assessment.questions) && assessment.questions.length > 0,
  );
  const totalWeight = relevantAssessments.reduce((sum, assessment) => sum + assessment.weight, 0) || 1;
  const score = round(relevantAssessments.reduce((sum, assessment) => {
    const bestAttempt = attemptsMap[assessment.id];
    const bestScore = bestAttempt ? bestAttempt.score : 0;
    return sum + (bestScore * assessment.weight) / totalWeight;
  }, 0), 2);

  const planModules = database.modules.filter((module) => module.studyPlanId === enrollment.studyPlanId);
  const mandatoryModules = planModules.filter((module) => module.mandatory);
  const allMandatoryReleased = mandatoryModules.every((module) => {
    const classModule = getClassModuleRelease(database, enrollment.classId, module.id);
    return classModule && classModule.released;
  });
  const allMandatoryContents = database.contents.filter((content) => mandatoryModules.some((module) => module.id === content.moduleId));
  const allMandatoryCompleted = allMandatoryContents.every((content) => completedContentIds.includes(content.id));
  const allReleasedContentsCompleted = releasedContents.length > 0 && releasedContents.every((content) => completedContentIds.includes(content.id));

  let finalStatus = "Em andamento";
  if (allMandatoryReleased && allReleasedContentsCompleted && (!database.settings.requireAllMandatory || allMandatoryCompleted)) {
    finalStatus = score >= database.settings.minOverallScore && validatedStudySeconds >= database.settings.minValidatedStudySeconds ? "Aprovado" : "Reprovado";
  }

  return {
    progressPercent,
    validatedStudySeconds,
    score,
    finalStatus,
    lastAccessAt: sessions.length ? sessions[sessions.length - 1].endedAt : enrollment.lastAccessAt || null,
  };
}

function recalculateDatabase(database) {
  database.enrollments = database.enrollments.map((enrollment) => ({ ...enrollment, ...computeEnrollmentStats(database, enrollment) }));
  return database;
}

function findEnrollmentByStudent(database, studentId) {
  return database.enrollments.find((enrollment) => enrollment.studentId === studentId && enrollment.status === "active");
}

function recordAudit(database, actorUserId, action, entity, entityId, details) {
  database.auditLogs.push({ id: uid("audit"), actorUserId, action, entity, entityId, details, timestamp: nowIso() });
}
function getDefaultPageForRole(role) {
  if (role === "student") return "dashboard";
  if (role === "admin") return "overview";
  return "overview";
}

function ensurePageForRole(user) {
  const studentPages = ["dashboard", "contents", "assessments", "history"];
  const staffPages = ["overview", "relatorios", "turmas", "alunos", "conteudos", "questionarios", "regras", "memoria", "auditoria", "usuarios"];
  const allowedPages = user.role === "student" ? studentPages : staffPages;
  const adminOnlyPages = new Set(["usuarios", "auditoria"]);
  if (!state.page || !allowedPages.includes(state.page) || (adminOnlyPages.has(state.page) && user.role !== "admin")) {
    state.page = getDefaultPageForRole(user.role);
  }
}

function login(email, password) {
  const database = loadDatabase();
  const user = database.users.find((item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password);
  if (!user || !user.active) {
    setFlash("error", "Credenciais invalidas ou usuario inativo.");
    renderApp();
    return;
  }

  const nextDatabase = persistDatabase((draft) => {
    recordAudit(draft, user.id, "session_login", "session", user.id, `Login realizado com perfil ${user.role}.`);
  });
  setSession({ userId: user.id, role: user.role, loggedAt: nowIso() });
  state.page = getDefaultPageForRole(user.role);
  state.selectedAssessmentId = null;
  state.selectedContentId = null;
  state.editingStudyPlanId = null;
  state.editingModuleId = null;
  state.editingContentId = null;
  setFlash("success", `Bem-vindo, ${user.name}.`);
  renderApp(nextDatabase);
}

function logout() {
  const session = getSession();
  stopTracking("logout");
  const database = session?.userId
    ? persistDatabase((draft) => {
      const currentUser = draft.users.find((item) => item.id === session.userId);
      recordAudit(draft, session.userId, "session_logout", "session", session.userId, `Sessao encerrada por ${currentUser?.name || session.userId}.`);
    })
    : loadDatabase();
  clearSession();
  state.page = null;
  state.selectedAssessmentId = null;
  state.selectedContentId = null;
  state.editingStudyPlanId = null;
  state.editingModuleId = null;
  state.editingContentId = null;
  setFlash("info", "Sessao encerrada com seguranca.");
  renderApp(database);
}

function markActivity() {
  if (state.tracker) state.tracker.lastActivityAt = Date.now();
}

function startTracking(contentId) {
  const database = loadDatabase();
  const user = getCurrentUser(database);
  if (!user || user.role !== "student") return;
  const enrollment = findEnrollmentByStudent(database, user.id);
  if (!enrollment) return;

  if (state.tracker && state.tracker.contentId === contentId) return;
  stopTracking("switch-content", false);

  persistDatabase((draft) => {
    draft.studyEvents.push({
      id: uid("event"),
      enrollmentId: enrollment.id,
      contentId,
      type: "view_start",
      timestamp: nowIso(),
      metadata: { origin: "student-reader" },
    });
  });

  const heartbeatSeconds = database.settings.heartbeatSeconds || 5;
  state.tracker = {
    id: uid("session"),
    enrollmentId: enrollment.id,
    contentId,
    startedAt: nowIso(),
    validSeconds: 0,
    lastActivityAt: Date.now(),
    timer: window.setInterval(() => {
      if (!state.tracker) return;
      if (document.visibilityState !== "visible") return;
      if (Date.now() - state.tracker.lastActivityAt > 15000) return;
      state.tracker.validSeconds += heartbeatSeconds;
      persistDatabase((draft) => {
        draft.studyEvents.push({
          id: uid("event"),
          enrollmentId: state.tracker.enrollmentId,
          contentId: state.tracker.contentId,
          type: "heartbeat",
          timestamp: nowIso(),
          metadata: { validatedSeconds: state.tracker.validSeconds },
        });
      });
      renderApp();
    }, heartbeatSeconds * 1000),
  };
}

function stopTracking(reason = "manual", shouldRender = true, forceComplete = false) {
  if (!state.tracker) return;
  const tracker = state.tracker;
  window.clearInterval(tracker.timer);

  persistDatabase((draft) => {
    draft.studyEvents.push({
      id: uid("event"),
      enrollmentId: tracker.enrollmentId,
      contentId: tracker.contentId,
      type: "view_end",
      timestamp: nowIso(),
      metadata: { validatedStudySeconds: tracker.validSeconds, reason },
    });
    draft.studySessions.push({
      id: tracker.id,
      enrollmentId: tracker.enrollmentId,
      contentId: tracker.contentId,
      startedAt: tracker.startedAt,
      endedAt: nowIso(),
      validatedStudySeconds: tracker.validSeconds,
      origin: "student-reader",
    });

    if (tracker.validSeconds >= CONTENT_MIN_SECONDS || forceComplete) {
      const enrollment = draft.enrollments.find((item) => item.id === tracker.enrollmentId);
      if (enrollment && !enrollment.completedContentIds.includes(tracker.contentId)) {
        enrollment.completedContentIds.push(tracker.contentId);
      }
    }
  });

  if (reason === "manual-finish") {
    if (tracker.validSeconds >= CONTENT_MIN_SECONDS || forceComplete) {
      setFlash("success", "Leitura validada e historico atualizado.");
    } else {
      setFlash("warning", `Leitura registrada, mas ainda abaixo do minimo de ${CONTENT_MIN_SECONDS}s para conclusao.`);
    }
  }

  state.tracker = null;
  if (shouldRender) renderApp();
}

function createStudyPlan(formData) {
  const editingStudyPlanId = formData.get("editingStudyPlanId");
  const title = formData.get("title").trim();
  const description = formData.get("description").trim();
  const workloadHours = Number(formData.get("workloadHours") || 0);
  const version = formData.get("version").trim() || "1.0";

  if (!title || !description) {
    setFlash("warning", "Informe titulo e descricao do curso.");
    return renderApp();
  }

  const database = persistDatabase((draft) => {
    if (editingStudyPlanId) {
      const studyPlan = draft.studyPlans.find((item) => item.id === editingStudyPlanId);
      if (!studyPlan) return;
      studyPlan.title = title;
      studyPlan.description = description;
      studyPlan.workloadHours = workloadHours;
      studyPlan.version = version;
      recordAudit(draft, getSession().userId, "study_plan_updated", "studyPlan", editingStudyPlanId, `Curso ${title} atualizado.`);
      return;
    }

    const studyPlanId = uid("plan");
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (90 * 24 * 60 * 60 * 1000));
    const classId = uid("class");

    draft.studyPlans.push({
      id: studyPlanId,
      title,
      description,
      workloadHours,
      version,
      createdAt: nowIso(),
    });
    draft.classes.push({
      id: classId,
      studyPlanId,
      name: `${title} - Turma Inicial`,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      status: "active",
    });
    recordAudit(draft, getSession().userId, "study_plan_created", "studyPlan", studyPlanId, `Curso ${title} criado com turma inicial automatica.`);
  });

  state.editingStudyPlanId = null;
  setFlash("success", editingStudyPlanId ? "Curso atualizado com sucesso." : "Curso criado com sucesso.");
  renderApp(database);
}

function startStudyPlanEdit(studyPlanId) {
  state.editingModuleId = null;
  state.editingContentId = null;
  state.editingStudyPlanId = studyPlanId;
  renderApp();
}

function cancelStudyPlanEdit() {
  state.editingStudyPlanId = null;
  renderApp();
}

function deleteStudyPlan(studyPlanId) {
  const current = loadDatabase();
  const studyPlan = getStudyPlanById(current, studyPlanId);
  if (!studyPlan) return;

  const hasModules = current.modules.some((module) => module.studyPlanId === studyPlanId);
  const planClasses = current.classes.filter((item) => item.studyPlanId === studyPlanId);
  const classIds = planClasses.map((item) => item.id);
  const hasEnrollments = current.enrollments.some((item) => classIds.includes(item.classId));

  if (hasModules || hasEnrollments) {
    setFlash("warning", "Nao e possivel excluir o curso enquanto existirem modulos ou matriculas vinculadas.");
    return renderApp(current);
  }

  if (!window.confirm(`Excluir o curso "${studyPlan.title}"?`)) return;

  const database = persistDatabase((draft) => {
    draft.studyPlans = draft.studyPlans.filter((item) => item.id !== studyPlanId);
    draft.classes = draft.classes.filter((item) => item.studyPlanId !== studyPlanId);
    draft.classModules = draft.classModules.filter((item) => !classIds.includes(item.classId));
    recordAudit(draft, getSession().userId, "study_plan_deleted", "studyPlan", studyPlanId, `Curso ${studyPlan.title} excluido.`);
  });

  if (state.editingStudyPlanId === studyPlanId) state.editingStudyPlanId = null;
  setFlash("success", "Curso excluido com sucesso.");
  renderApp(database);
}

function createStudent(formData) {
  const name = formData.get("name").trim();
  const email = formData.get("email").trim().toLowerCase();
  const classId = formData.get("classId");
  const current = loadDatabase();

  if (!name || !email || !classId) {
    setFlash("warning", "Preencha nome, email e turma do aluno.");
    return renderApp(current);
  }

  if (current.users.some((user) => user.email === email)) {
    setFlash("warning", "Ja existe um usuario com este email.");
    return renderApp(current);
  }

  const selectedClass = getClassById(current, classId);
  if (!selectedClass) {
    setFlash("warning", "A turma selecionada nao existe mais.");
    return renderApp(current);
  }

  const database = persistDatabase((draft) => {
    const studentId = uid("user-student");
    draft.users.push({ id: studentId, name, email, password: "Aluno@123", role: "student", active: true, createdAt: nowIso() });
    draft.enrollments.push({ id: uid("enrollment"), studentId, classId, studyPlanId: selectedClass.studyPlanId, status: "active", completedContentIds: [], progressPercent: 0, score: 0, finalStatus: "Em andamento", validatedStudySeconds: 0, lastAccessAt: null });
    recordAudit(draft, getSession().userId, "student_created", "user", studentId, `Aluno ${name} matriculado em ${selectedClass.name}.`);
  });
  setFlash("success", "Aluno criado com senha inicial Aluno@123.");
  renderApp(database);
}

function createModule(formData) {
  const editingModuleId = formData.get("editingModuleId");
  const studyPlanId = formData.get("studyPlanId");
  const title = formData.get("title").trim();
  const description = formData.get("description").trim();
  const mandatory = formData.get("mandatory") === "on";
  if (!studyPlanId || !title || !description) {
    setFlash("warning", "Informe curso, titulo e descricao do modulo.");
    return renderApp();
  }

  const database = persistDatabase((draft) => {
    if (editingModuleId) {
      const module = draft.modules.find((item) => item.id === editingModuleId);
      if (!module) return;
      const previousPlanId = module.studyPlanId;
      const planChanged = previousPlanId !== studyPlanId;
      module.title = title;
      module.description = description;
      module.mandatory = mandatory;
      module.studyPlanId = studyPlanId;
      if (planChanged) {
        draft.classModules = draft.classModules.filter((item) => item.moduleId !== editingModuleId);
        draft.classes
          .filter((item) => item.studyPlanId === studyPlanId)
          .forEach((item) => {
            draft.classModules.push({ id: uid("class-module"), classId: item.id, moduleId: editingModuleId, released: false, releasedAt: null });
          });
      }
      recordAudit(draft, getSession().userId, "module_updated", "module", editingModuleId, `Modulo ${title} atualizado.`);
      return;
    }

    const order = draft.modules.filter((item) => item.studyPlanId === studyPlanId).length + 1;
    const moduleId = uid("module");
    draft.modules.push({ id: moduleId, studyPlanId, title, description, order, mandatory });
    draft.classes.filter((item) => item.studyPlanId === studyPlanId).forEach((item) => {
      draft.classModules.push({ id: uid("class-module"), classId: item.id, moduleId, released: false, releasedAt: null });
    });
    recordAudit(draft, getSession().userId, "module_created", "module", moduleId, `Modulo ${title} criado.`);
  });
  state.editingModuleId = null;
  setFlash("success", editingModuleId ? "Modulo atualizado com sucesso." : "Modulo criado com liberacao inicial bloqueada.");
  renderApp(database);
}

function createContent(formData) {
  const editingContentId = formData.get("editingContentId");
  const moduleId = formData.get("moduleId");
  const title = formData.get("title").trim();
  const summary = formData.get("summary").trim();
  const bodyHtml = sanitizeRichHtml(formData.get("bodyHtml") || "");
  const body = extractPlainTextFromHtml(bodyHtml);
  const timeEstimateMinutes = Number(formData.get("timeEstimateMinutes") || 5);
  const visualType = formData.get("visualType");
  const visualTitle = formData.get("visualTitle").trim();
  const visualUrl = formData.get("visualUrl").trim();
  const visualCaption = formData.get("visualCaption").trim();
  const visualChartData = formData.get("visualChartData").trim();
  if (!moduleId || !title || !summary || !bodyHtml) {
    setFlash("warning", "Preencha modulo, titulo, resumo e corpo do conteudo.");
    return renderApp();
  }

  if (!getModuleById(loadDatabase(), moduleId)) {
    setFlash("warning", "O modulo selecionado nao existe mais.");
    return renderApp();
  }

  let visuals = [];
  if (visualType && visualType !== "none") {
    if ((visualType === "image" || visualType === "video") && !visualUrl) {
      setFlash("warning", "Informe a URL do recurso visual.");
      return renderApp();
    }

    if (visualType === "chart") {
      const parsedChartData = parseChartData(visualChartData);
      if (!parsedChartData) {
        setFlash("warning", "O grafico precisa de um JSON valido no formato indicado.");
        return renderApp();
      }

      visuals = [{
        type: "chart",
        title: visualTitle || "Grafico didatico",
        caption: visualCaption,
        data: parsedChartData,
      }];
    } else {
      visuals = [{
        type: visualType,
        title: visualTitle || title,
        caption: visualCaption,
        url: visualUrl,
      }];
    }
  }

  const database = persistDatabase((draft) => {
    if (editingContentId) {
      const content = draft.contents.find((item) => item.id === editingContentId);
      if (!content) return;
      content.moduleId = moduleId;
      content.title = title;
      content.summary = summary;
      content.body = body;
      content.bodyHtml = bodyHtml;
      content.timeEstimateMinutes = timeEstimateMinutes;
      content.visuals = visuals;
      content.type = visuals.length ? "multimidia" : "texto";
      recordAudit(draft, getSession().userId, "content_updated", "content", editingContentId, `Conteudo ${title} atualizado.`);
      return;
    }

    const contentId = uid("content");
    draft.contents.push({ id: contentId, moduleId, title, type: visuals.length ? "multimidia" : "texto", summary, body, bodyHtml, timeEstimateMinutes, visuals });
    recordAudit(draft, getSession().userId, "content_created", "content", contentId, `Conteudo ${title} criado.`);
  });
  state.editingContentId = null;
  setFlash("success", editingContentId ? "Conteudo atualizado com sucesso." : "Conteudo criado com sucesso.");
  renderApp(database);
}

function createAssessment(formData) {
  const moduleId = formData.get("moduleId");
  const title = formData.get("title").trim();
  const weight = Number(formData.get("weight") || 20);
  const attemptsAllowed = Number(formData.get("attemptsAllowed") || 1);

  if (!moduleId || !title || weight <= 0 || attemptsAllowed <= 0) {
    setFlash("warning", "Informe modulo, titulo, peso valido e numero de tentativas.");
    return renderApp();
  }

  const database = persistDatabase((draft) => {
    const assessmentId = uid("assessment");
    draft.assessments.push({
      id: assessmentId,
      moduleId,
      title,
      weight,
      attemptsAllowed,
      published: false,
      criteria: createDefaultAssessmentCriteria(assessmentId),
      questions: [],
    });
    recordAudit(draft, getSession().userId, "assessment_created", "assessment", assessmentId, `Questionario ${title} criado como rascunho.`);
  });

  setFlash("success", "Questionario criado como rascunho. Agora adicione as questoes e publique quando estiver pronto.");
  renderApp(database);
}

function startModuleEdit(moduleId) {
  state.editingStudyPlanId = null;
  state.editingContentId = null;
  state.editingModuleId = moduleId;
  renderApp();
}

function cancelModuleEdit() {
  state.editingModuleId = null;
  renderApp();
}

function deleteModule(moduleId) {
  const current = loadDatabase();
  const module = getModuleById(current, moduleId);
  if (!module) return;

  const hasContents = current.contents.some((content) => content.moduleId === moduleId);
  const hasAssessments = current.assessments.some((assessment) => assessment.moduleId === moduleId);
  if (hasContents || hasAssessments) {
    setFlash("warning", "Nao e possivel excluir o modulo enquanto existirem conteudos ou questionarios vinculados.");
    return renderApp(current);
  }

  if (!window.confirm(`Excluir o modulo "${module.title}"?`)) return;

  const database = persistDatabase((draft) => {
    draft.modules = draft.modules.filter((item) => item.id !== moduleId);
    draft.classModules = draft.classModules.filter((item) => item.moduleId !== moduleId);
    recordAudit(draft, getSession().userId, "module_deleted", "module", moduleId, `Modulo ${module.title} excluido.`);
  });

  if (state.editingModuleId === moduleId) state.editingModuleId = null;
  setFlash("success", "Modulo excluido com sucesso.");
  renderApp(database);
}

function startContentEdit(contentId) {
  state.editingStudyPlanId = null;
  state.editingModuleId = null;
  state.editingContentId = contentId;
  renderApp();
}

function cancelContentEdit() {
  state.editingContentId = null;
  renderApp();
}

function deleteContent(contentId) {
  const current = loadDatabase();
  const content = getContentById(current, contentId);
  if (!content) return;

  if (!window.confirm(`Excluir o conteudo "${content.title}"?`)) return;

  if (state.tracker?.contentId === contentId) {
    stopTracking("content-delete", false);
  }

  const database = persistDatabase((draft) => {
    draft.contents = draft.contents.filter((item) => item.id !== contentId);
    draft.studyEvents = draft.studyEvents.filter((item) => item.contentId !== contentId);
    draft.studySessions = draft.studySessions.filter((item) => item.contentId !== contentId);
    draft.enrollments.forEach((enrollment) => {
      enrollment.completedContentIds = (enrollment.completedContentIds || []).filter((item) => item !== contentId);
    });
    recordAudit(draft, getSession().userId, "content_deleted", "content", contentId, `Conteudo ${content.title} excluido.`);
  });

  if (state.editingContentId === contentId) state.editingContentId = null;
  if (state.selectedContentId === contentId) state.selectedContentId = null;
  setFlash("success", "Conteudo excluido com sucesso.");
  renderApp(database);
}

function addQuestionToAssessment(formData) {
  const assessmentId = formData.get("assessmentId");
  const criterionId = formData.get("criterionId");
  const prompt = formData.get("prompt").trim();
  const explanation = formData.get("explanation").trim();
  const optionA = formData.get("optionA").trim();
  const optionB = formData.get("optionB").trim();
  const optionC = formData.get("optionC").trim();
  const optionD = formData.get("optionD").trim();
  const correctOption = formData.get("correctOption");

  if (!assessmentId || !criterionId || !prompt || !optionA || !optionB || !optionC || !optionD || !correctOption) {
    setFlash("warning", "Preencha a questao, as quatro alternativas, o criterio e o gabarito.");
    return renderApp();
  }

  const optionMap = {
    A: optionA,
    B: optionB,
    C: optionC,
    D: optionD,
  };

  const current = loadDatabase();
  const currentAssessment = current.assessments.find((item) => item.id === assessmentId);
  if (!currentAssessment) {
    setFlash("warning", "Questionario nao encontrado.");
    return renderApp(current);
  }

  if (!currentAssessment.criteria.some((item) => item.id === criterionId)) {
    setFlash("warning", "O criterio selecionado nao pertence ao questionario informado.");
    return renderApp(current);
  }

  const database = persistDatabase((draft) => {
    const assessment = draft.assessments.find((item) => item.id === assessmentId);
    if (!assessment) return;
    const criterion = assessment.criteria.find((item) => item.id === criterionId);
    const questionId = `${assessmentId}-question-${assessment.questions.length + 1}`;
    assessment.questions.push({
      id: questionId,
      criterionId: criterion.id,
      prompt,
      explanation,
      generated: false,
      options: Object.entries(optionMap).map(([letter, label], index) => ({
        id: `${questionId}-option-${index + 1}`,
        label,
        correct: correctOption === letter,
      })),
    });
    recordAudit(draft, getSession().userId, "assessment_question_added", "assessment", assessmentId, `Questao adicionada ao questionario ${assessment.title}.`);
  });

  setFlash("success", "Questao adicionada com gabarito restrito ao operador.");
  renderApp(database);
}

function generateAssessmentDraft(formData) {
  const moduleId = formData.get("moduleId");
  if (!moduleId) {
    setFlash("warning", "Selecione o modulo para gerar o rascunho.");
    return renderApp();
  }

  const current = loadDatabase();
  const module = getModuleById(current, moduleId);
  if (!module) {
    setFlash("warning", "Modulo nao encontrado para geracao do rascunho.");
    return renderApp(current);
  }
  const assessmentId = uid("assessment");
  const questions = buildAutomaticQuestionsForModule(current, moduleId, assessmentId);

  if (!questions.length) {
    setFlash("warning", "Nao houve base textual suficiente para gerar questoes automaticamente. Use insercao manual.");
    return renderApp(current);
  }

  const database = persistDatabase((draft) => {
    draft.assessments.push({
      id: assessmentId,
      moduleId,
      title: `Rascunho automatico - ${module.title}`,
      weight: Number(formData.get("weight") || 20),
      attemptsAllowed: 1,
      published: false,
      criteria: createDefaultAssessmentCriteria(assessmentId),
      questions,
      autoGenerated: true,
    });
    recordAudit(draft, getSession().userId, "assessment_auto_draft_created", "assessment", assessmentId, `Rascunho automatico gerado para o modulo ${module.title}.`);
  });

  setFlash("warning", "Rascunho automatico criado. Revise o gabarito antes de publicar, pois a geracao e experimental.");
  renderApp(database);
}

function toggleAssessmentPublished(assessmentId) {
  const current = loadDatabase();
  const currentAssessment = current.assessments.find((item) => item.id === assessmentId);
  if (!currentAssessment || !currentAssessment.questions.length) {
    setFlash("warning", "O questionario precisa ter ao menos uma questao antes da publicacao.");
    return renderApp(current);
  }

  const database = persistDatabase((draft) => {
    const assessment = draft.assessments.find((item) => item.id === assessmentId);
    if (!assessment) return;
    assessment.published = !assessment.published;
    recordAudit(
      draft,
      getSession().userId,
      "assessment_publish_toggled",
      "assessment",
      assessmentId,
      `Questionario ${assessment.title} ficou ${assessment.published ? "publicado" : "em rascunho"}.`,
    );
  });
  setFlash("success", "Status do questionario atualizado.");
  renderApp(database);
}

function deleteAssessment(assessmentId) {
  const current = loadDatabase();
  const assessment = current.assessments.find((item) => item.id === assessmentId);
  if (!assessment) return;

  if (!window.confirm(`Excluir o questionario "${assessment.title}"?`)) return;

  const database = persistDatabase((draft) => {
    draft.assessments = draft.assessments.filter((item) => item.id !== assessmentId);
    draft.assessmentAttempts = draft.assessmentAttempts.filter((item) => item.assessmentId !== assessmentId);
    draft.studyEvents = draft.studyEvents.filter((item) => item.metadata?.assessmentId !== assessmentId);
    recordAudit(draft, getSession().userId, "assessment_deleted", "assessment", assessmentId, `Questionario ${assessment.title} excluido.`);
  });

  if (state.selectedAssessmentId === assessmentId) state.selectedAssessmentId = null;
  setFlash("success", "Questionario excluido com sucesso.");
  renderApp(database);
}

function updateSettings(formData) {
  const applicationName = formData.get("applicationName").trim();
  const applicationTagline = formData.get("applicationTagline").trim();
  const themeProfile = formData.get("themeProfile");
  const heartbeatSeconds = Number(formData.get("heartbeatSeconds") || 5);
  const minOverallScore = Number(formData.get("minOverallScore") || 70);
  const minValidatedStudySeconds = Number(formData.get("minValidatedStudySeconds") || 60);
  const requireAllMandatory = formData.get("requireAllMandatory") === "on";

  if (!applicationName) {
    setFlash("warning", "Informe o nome da aplicacao.");
    return renderApp();
  }

  const database = persistDatabase((draft) => {
    draft.settings.applicationName = applicationName;
    draft.settings.applicationTagline = applicationTagline;
    draft.settings.themeProfile = themeProfile || "terracotta";
    draft.settings.heartbeatSeconds = heartbeatSeconds;
    draft.settings.minOverallScore = minOverallScore;
    draft.settings.minValidatedStudySeconds = minValidatedStudySeconds;
    draft.settings.requireAllMandatory = requireAllMandatory;
    recordAudit(draft, getSession().userId, "settings_updated", "settings", "global", "Configuracoes do sistema atualizadas.");
  });

  setFlash("success", "Configuracoes do sistema atualizadas.");
  renderApp(database);
}

function createMemoryNote(formData) {
  const kind = formData.get("kind");
  const title = formData.get("title").trim();
  const details = formData.get("details").trim();
  if (!title || !details) {
    setFlash("warning", "Informe titulo e descricao para registrar memoria.");
    return renderApp();
  }

  const database = persistDatabase((draft) => {
    draft.memoryLog.unshift({ id: uid("memory"), kind, title, details, createdAt: nowIso() });
    recordAudit(draft, getSession().userId, "memory_registered", "memory", title, `Registro ${kind}: ${title}`);
  });

  setFlash("success", "Memoria registrada para continuidade operacional.");
  renderApp(database);
}

function createUser(formData) {
  const currentSession = getSession();
  if (!currentSession || currentSession.role !== "admin") return;
  const name = formData.get("name").trim();
  const email = formData.get("email").trim().toLowerCase();
  const role = formData.get("role");
  const current = loadDatabase();

  if (!name || !email || !role) {
    setFlash("warning", "Preencha nome, email e perfil.");
    return renderApp(current);
  }

  if (current.users.some((user) => user.email === email)) {
    setFlash("warning", "Ja existe um usuario com este email.");
    return renderApp(current);
  }

  const database = persistDatabase((draft) => {
    const userId = uid("user");
    const password = role === "admin" ? "Admin@123" : "Operador@123";
    draft.users.push({ id: userId, name, email, password, role, active: true, createdAt: nowIso() });
    recordAudit(draft, currentSession.userId, "user_created", "user", userId, `Usuario ${name} criado com perfil ${role}.`);
  });

  setFlash("success", "Usuario criado com sucesso.");
  renderApp(database);
}

function toggleModuleRelease(classModuleId) {
  const current = loadDatabase();
  if (!current.classModules.some((item) => item.id === classModuleId)) {
    setFlash("warning", "O vinculo de liberacao selecionado nao existe mais.");
    return renderApp(current);
  }

  const database = persistDatabase((draft) => {
    const classModule = draft.classModules.find((item) => item.id === classModuleId);
    classModule.released = !classModule.released;
    classModule.releasedAt = classModule.released ? nowIso() : null;
    recordAudit(draft, getSession().userId, "class_module_toggled", "classModule", classModuleId, `Modulo ${classModule.moduleId} teve liberacao alterada.`);
  });
  setFlash("success", "Liberacao de modulo atualizada.");
  renderApp(database);
}

function toggleUserStatus(userId) {
  const currentSession = getSession();
  if (!currentSession || currentSession.role !== "admin" || currentSession.userId === userId) return;
  const database = persistDatabase((draft) => {
    const user = draft.users.find((item) => item.id === userId);
    if (!user) return;
    user.active = !user.active;
    recordAudit(draft, currentSession.userId, "user_status_toggled", "user", userId, `Usuario ${user.name} ficou ${user.active ? "ativo" : "inativo"}.`);
  });
  setFlash("success", "Status do usuario atualizado.");
  renderApp(database);
}

function submitAssessment(formData) {
  const assessmentId = formData.get("assessmentId");
  const database = loadDatabase();
  const user = getCurrentUser(database);
  if (!user) return;
  const enrollment = findEnrollmentByStudent(database, user.id);
  const assessment = database.assessments.find((item) => item.id === assessmentId);
  if (!assessment || !enrollment || assessment.published === false) return;
  const visibleAssessmentIds = getVisibleAssessments(database, enrollment).map((item) => item.id);
  if (!visibleAssessmentIds.includes(assessmentId)) {
    setFlash("warning", "Esta avaliacao nao esta disponivel para a sua turma.");
    return renderApp(database);
  }
  const attempts = database.assessmentAttempts.filter((attempt) => attempt.enrollmentId === enrollment.id && attempt.assessmentId === assessmentId);
  if (attempts.length >= assessment.attemptsAllowed) {
    setFlash("warning", "Limite de tentativas atingido para esta avaliacao.");
    return renderApp();
  }

  const answers = {};
  assessment.questions.forEach((question) => {
    answers[question.id] = formData.get(question.id) || "";
  });

  const unanswered = assessment.questions.some((question) => !answers[question.id]);
  if (unanswered) {
    setFlash("warning", "Responda todas as perguntas antes de enviar.");
    return renderApp();
  }

  const result = computeAssessmentScore(assessment, answers);
  const nextDatabase = persistDatabase((draft) => {
    draft.assessmentAttempts.push({
      id: uid("attempt"),
      assessmentId,
      enrollmentId: enrollment.id,
      userId: user.id,
      answers,
      score: result.weightedScore,
      criteriaBreakdown: result.criteriaBreakdown,
      createdAt: nowIso(),
    });
    draft.studyEvents.push({ id: uid("event"), enrollmentId: enrollment.id, contentId: assessment.moduleId, type: "quiz_submit", timestamp: nowIso(), metadata: { assessmentId, score: result.weightedScore } });
  });

  state.selectedAssessmentId = null;
  const minimumScore = Number(database.settings?.minOverallScore) || 70;
  setFlash(result.weightedScore >= minimumScore ? "success" : "warning", `Avaliacao enviada com nota ${result.weightedScore}.`);
  renderApp(nextDatabase);
}

function resetStandaloneDatabase() {
  const session = getSession();
  stopTracking("reset", false);
  const resetDatabase = recalculateDatabase(createSeedDatabase());
  if (session?.userId) {
    recordAudit(resetDatabase, session.userId, "database_reset", "application", "training-hub", "Base independente resetada para o estado inicial.");
  }
  saveDatabase(resetDatabase);
  clearSession();
  state.page = null;
  state.selectedContentId = null;
  state.selectedAssessmentId = null;
  state.editingStudyPlanId = null;
  state.editingModuleId = null;
  state.editingContentId = null;
  setFlash("info", "Base independente resetada para o estado inicial.");
  renderApp(resetDatabase);
}

function buildStudentContext(database, user) {
  const enrollment = findEnrollmentByStudent(database, user.id);
  if (!enrollment) return { user, enrollment: null };
  const releasedModules = getReleasedModules(database, enrollment.classId);
  const releasedContents = getReleasedContents(database, enrollment);
  const attempts = getEnrollmentAttempts(database, enrollment.id).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  const sessions = database.studySessions.filter((session) => session.enrollmentId === enrollment.id).sort((left, right) => new Date(right.endedAt) - new Date(left.endedAt));
  const nextContent = releasedContents.find((content) => !(enrollment.completedContentIds || []).includes(content.id)) || null;
  const assessments = getVisibleAssessments(database, enrollment).map((assessment) => ({
    ...assessment,
    module: getModuleById(database, assessment.moduleId),
  }));
  return { user, settings: database.settings, enrollment, releasedModules, releasedContents, attempts, sessions, nextContent, assessments };
}

function buildStaffContext(database) {
  const enrollments = database.enrollments.map((enrollment) => {
    const student = database.users.find((user) => user.id === enrollment.studentId);
    const studyClass = getClassById(database, enrollment.classId);
    return { ...enrollment, student, studyClass };
  });
  const approvedCount = enrollments.filter((item) => item.finalStatus === "Aprovado").length;
  const averageScore = enrollments.length ? round(enrollments.reduce((sum, item) => sum + item.score, 0) / enrollments.length, 1) : 0;
  const averageProgress = enrollments.length ? round(enrollments.reduce((sum, item) => sum + item.progressPercent, 0) / enrollments.length, 1) : 0;
  const riskScoreFloor = Number(database.settings?.minOverallScore) || 0;
  const riskStudents = enrollments.filter((item) => item.progressPercent < 50 || item.score < riskScoreFloor).sort((left, right) => left.progressPercent - right.progressPercent);
  const studyPlans = database.studyPlans
    .slice()
    .sort((left, right) => left.title.localeCompare(right.title))
    .map((studyPlan) => {
      const planModules = database.modules.filter((module) => module.studyPlanId === studyPlan.id);
      const planModuleIds = planModules.map((module) => module.id);
      const planClasses = database.classes.filter((studyClass) => studyClass.studyPlanId === studyPlan.id);
      return {
        ...studyPlan,
        modulesCount: planModules.length,
        contentsCount: database.contents.filter((content) => planModuleIds.includes(content.moduleId)).length,
        classesCount: planClasses.length,
        activeEnrollmentsCount: enrollments.filter((item) => item.studyPlanId === studyPlan.id).length,
      };
    });
  const assessments = database.assessments.map((assessment) => ({
    ...assessment,
    module: getModuleById(database, assessment.moduleId),
    attemptsCount: database.assessmentAttempts.filter((attempt) => attempt.assessmentId === assessment.id).length,
  }));
  const modules = database.modules
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((module) => ({
      ...module,
      studyPlan: getStudyPlanById(database, module.studyPlanId),
      contentsCount: database.contents.filter((content) => content.moduleId === module.id).length,
      releaseStatus: getReleaseSummaryForModule(database, module),
    }));
  const contents = database.contents
    .slice()
    .sort((left, right) => left.title.localeCompare(right.title))
    .map((content) => ({
      ...content,
      module: getModuleById(database, content.moduleId),
      studyPlan: getStudyPlanById(database, getModuleById(database, content.moduleId)?.studyPlanId),
      visualsCount: Array.isArray(content.visuals) ? content.visuals.length : 0,
    }));
  return { settings: database.settings, enrollments, approvedCount, averageScore, averageProgress, riskStudents, studyPlans, assessments, modules, contents };
}
function getStatusClass(status) {
  if (status === "Aprovado") return "approved";
  if (status === "Reprovado") return "reproved";
  return "progress";
}

function renderProgressBar(value) {
  return `<div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100, Math.max(0, value))}%"></div></div>`;
}

function renderMetric(title, value, helper) {
  return `
    <article class="metric">
      <p class="muted">${escapeHtml(title)}</p>
      <strong>${escapeHtml(String(value))}</strong>
      <p class="helper-text">${escapeHtml(helper)}</p>
    </article>
  `;
}

function renderPageHeader(title, subtitle, actions = "") {
  return `
    <section class="page-header">
      <div class="panel-header">
        <div>
          <h1 class="page-title">${escapeHtml(title)}</h1>
          <p class="panel-subtitle">${escapeHtml(subtitle)}</p>
        </div>
        <div class="header-actions">${actions}</div>
      </div>
      ${consumeFlash()}
    </section>
  `;
}

function renderLogin(database) {
  return `
    <main class="login-shell app-shell">
      <section class="hero-panel">
        <div>
          <span class="hero-badge">${escapeHtml(getApplicationTagline(database))}</span>
          <h1 class="hero-title">${escapeHtml(getApplicationName(database))}</h1>
          <p class="hero-copy">Aplicacao standalone para cursos e treinamentos com controle de acesso, historico evolutivo, avaliacao dinamica e monitoramento de permanencia validada.</p>
        </div>
        <div class="hero-grid">
          <div class="hero-stat"><span>Controle</span><strong>RBAC</strong><small>Aluno, operador e admin</small></div>
          <div class="hero-stat"><span>Historico</span><strong>Tempo real</strong><small>Eventos, sessoes e tentativas</small></div>
          <div class="hero-stat"><span>Memoria</span><strong>Continua</strong><small>Notas de progresso e melhorias</small></div>
        </div>
      </section>
      <section class="form-panel">
        <div>
          <h2 class="panel-title">Entrar na aplicacao</h2>
          <p class="panel-subtitle">A base e local ao navegador e ja vem com perfis demo prontos.</p>
          ${consumeFlash()}
        </div>
        <form class="auth-form" data-form="login">
          <div class="field">
            <label for="email">Email</label>
            <input id="email" name="email" type="email" placeholder="voce@traininghub.local" required />
          </div>
          <div class="field">
            <label for="password">Senha</label>
            <input id="password" name="password" type="password" placeholder="Sua senha" required />
          </div>
          <button class="primary-btn" type="submit">Entrar</button>
        </form>
        <div class="demo-access">
          <div class="demo-card">
            <div><strong>Admin</strong><div class="helper-text">Governanca, usuarios e liberacoes.</div></div>
            <button class="ghost-btn" data-action="quick-login" data-email="admin@traininghub.local" data-password="Admin@123">Acessar</button>
          </div>
          <div class="demo-card">
            <div><strong>Operador</strong><div class="helper-text">Turmas, alunos, conteudos e parametros.</div></div>
            <button class="ghost-btn" data-action="quick-login" data-email="operador@traininghub.local" data-password="Operador@123">Acessar</button>
          </div>
          <div class="demo-card">
            <div><strong>Aluno</strong><div class="helper-text">Area do Aluno com trilha, historico e notas.</div></div>
            <button class="ghost-btn" data-action="quick-login" data-email="aluno@traininghub.local" data-password="Aluno@123">Acessar</button>
          </div>
        </div>
      </section>
    </main>
  `;
}

function renderStudentDashboard(context) {
  if (!context.enrollment) return `<section class="empty-card"><h2 class="section-title">Sem matricula ativa</h2><p>O aluno nao possui matricula ativa neste momento.</p></section>`;
  return `
    <div class="metrics-grid">
      ${renderMetric("Progresso", `${context.enrollment.progressPercent}%`, "Conteudos concluidos na trilha liberada.")}
      ${renderMetric("Nota consolidada", `${context.enrollment.score}`, "Pontuacao ponderada pelas avaliacoes liberadas.")}
      ${renderMetric("Tempo validado", formatDuration(context.enrollment.validatedStudySeconds), "Tempo com aba visivel e atividade real.")}
      ${renderMetric("Status", context.enrollment.finalStatus, "Calculado com base nas regras parametrizadas.")}
    </div>
    <div class="two-column-grid">
      <section class="timeline-card">
        <div class="panel-header">
          <div>
            <h2 class="section-title">Trilha liberada</h2>
            <p class="panel-subtitle">Modulos ativos para a sua turma.</p>
          </div>
          <span class="status-pill ${getStatusClass(context.enrollment.finalStatus)}">${escapeHtml(context.enrollment.finalStatus)}</span>
        </div>
        <div class="timeline-list">
          ${context.releasedModules.map((module) => {
            const moduleContents = context.releasedContents.filter((content) => content.moduleId === module.id);
            const completed = moduleContents.filter((content) => (context.enrollment.completedContentIds || []).includes(content.id)).length;
            const moduleProgress = moduleContents.length ? round((completed / moduleContents.length) * 100, 1) : 0;
            return `<div class="timeline-item"><strong>${escapeHtml(module.title)}</strong><p>${escapeHtml(module.description)}</p>${renderProgressBar(moduleProgress)}<p class="footer-note">${completed}/${moduleContents.length} conteudos concluidos</p></div>`;
          }).join("")}
        </div>
      </section>
      <section class="activity-card">
        <h2 class="section-title">Proximo melhor passo</h2>
        ${context.nextContent ? `
          <div class="activity-item">
            <strong>${escapeHtml(context.nextContent.title)}</strong>
            <p>${escapeHtml(context.nextContent.summary)}</p>
            <div class="inline-actions">
              <button class="primary-btn" data-action="open-content" data-content-id="${context.nextContent.id}">Continuar estudo</button>
              <span class="tag">${context.nextContent.timeEstimateMinutes} min estimados</span>
            </div>
          </div>
        ` : `<div class="activity-item"><strong>Trilha liberada concluida</strong><p>Aguarde novos modulos ou revise suas avaliacoes e historico.</p></div>`}
        <div class="activity-item">
          <strong>Critérios atuais</strong>
          <p>Nota minima: ${context.enrollment.score >= 0 ? `${context.settings?.minOverallScore ?? "-"}` : "-"} | Tempo minimo: ${formatDuration(context.settings?.minValidatedStudySeconds || 0)}</p>
        </div>
      </section>
    </div>
  `;
}

function renderStudentContents(context) {
  if (!context.enrollment) return `<section class="empty-card"><h2 class="section-title">Sem conteudos</h2><p>Nenhuma matricula ativa encontrada.</p></section>`;
  const activeContent = context.releasedContents.find((content) => content.id === state.selectedContentId) || null;
  const trackerInfo = state.tracker && activeContent && state.tracker.contentId === activeContent.id ? state.tracker : null;
  const completedContentIds = context.enrollment.completedContentIds || [];
  const relatedAssessments = activeContent ? context.assessments.filter((assessment) => assessment.moduleId === activeContent.moduleId) : [];
  const relatedModuleContents = activeContent ? context.releasedContents.filter((content) => content.moduleId === activeContent.moduleId) : [];
  const completedRelatedModuleContents = relatedModuleContents.filter((content) => completedContentIds.includes(content.id)).length;
  return `
    <div class="two-column-grid">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2 class="section-title">Conteudos liberados</h2>
            <p class="panel-subtitle">A conclusao exige pelo menos ${CONTENT_MIN_SECONDS}s validados de permanencia ativa.</p>
          </div>
        </div>
        <div class="content-grid">
          ${context.releasedContents.length ? context.releasedContents.map((content) => {
            const completed = (context.enrollment.completedContentIds || []).includes(content.id);
            const moduleAssessmentsCount = context.assessments.filter((assessment) => assessment.moduleId === content.moduleId).length;
            return `
              <article class="content-card">
                <div class="inline-actions">
                  <span class="tag">${escapeHtml(content.type)}</span>
                  ${Array.isArray(content.visuals) && content.visuals.length ? `<span class="tag">imersivo</span>` : ""}
                  ${moduleAssessmentsCount ? `<span class="tag">${moduleAssessmentsCount} questionario(s)</span>` : ""}
                  <span class="status-pill ${completed ? "approved" : "progress"}">${completed ? "Concluido" : "Pendente"}</span>
                </div>
                <div>
                  <h3>${escapeHtml(content.title)}</h3>
                  <p>${escapeHtml(content.summary)}</p>
                </div>
                <div class="inline-actions">
                  <button class="secondary-btn" data-action="open-content" data-content-id="${content.id}">${activeContent && activeContent.id === content.id ? "Reabrir" : "Estudar"}</button>
                  <span class="score-pill">${content.timeEstimateMinutes} min</span>
                </div>
              </article>
            `;
          }).join("") : `<div class="empty-card"><p>Nenhum conteudo liberado para a sua turma neste momento.</p></div>`}
        </div>
      </section>
      <section class="panel content-reader">
        ${activeContent ? `
          <div class="panel-header">
            <div>
              <h2 class="section-title">${escapeHtml(activeContent.title)}</h2>
              <p class="panel-subtitle">${escapeHtml(activeContent.summary)}</p>
            </div>
            <span class="tag">${trackerInfo ? `Leitura em andamento: ${formatDuration(trackerInfo.validSeconds)}` : "Leitura pronta"}</span>
          </div>
          <div class="info-grid">
            <div class="info-item"><strong>Tempo estimado</strong><p>${activeContent.timeEstimateMinutes} minutos</p></div>
            <div class="info-item"><strong>Conclusao valida</strong><p>${CONTENT_MIN_SECONDS}s com atividade e aba visivel.</p></div>
          </div>
          ${renderVisualBlocks(activeContent)}
          ${renderContentBody(activeContent)}
          <div class="assessment-list">
            <div class="panel-header">
              <div>
                <h3 class="section-title">Questionarios deste modulo</h3>
                <p class="panel-subtitle">${completedRelatedModuleContents}/${relatedModuleContents.length} conteudos do modulo concluidos.</p>
              </div>
            </div>
            ${relatedAssessments.length ? relatedAssessments.map((assessment) => {
              const attempts = context.attempts.filter((attempt) => attempt.assessmentId === assessment.id);
              const best = attempts.reduce((max, item) => Math.max(max, item.score), 0);
              const attemptsReached = attempts.length >= assessment.attemptsAllowed;
              return `
                <div class="assessment-item">
                  <div class="panel-header">
                    <div>
                      <strong>${escapeHtml(assessment.title)}</strong>
                      <p class="helper-text">${escapeHtml(assessment.module?.title || "Modulo")} | Peso ${assessment.weight} | ${attempts.length}/${assessment.attemptsAllowed} tentativas</p>
                    </div>
                    <span class="score-pill">Melhor nota ${best}</span>
                  </div>
                  <button class="secondary-btn" data-action="open-assessment" data-assessment-id="${assessment.id}" ${attemptsReached ? "disabled" : ""}>${attemptsReached ? "Limite atingido" : "Responder questionario"}</button>
                </div>
              `;
            }).join("") : `<div class="empty-card"><p>Nenhum questionario publicado para este modulo ainda.</p></div>`}
          </div>
          <div class="card-actions">
            <button class="primary-btn" data-action="finalize-reading">Registrar leitura</button>
            <button class="ghost-btn" data-action="close-content">Fechar leitor</button>
          </div>
        ` : `
          <div class="empty-card">
            <h2 class="section-title">Selecione um conteudo</h2>
            <p>Ao abrir o conteudo, a aplicacao inicia o rastreamento de permanencia e registra eventos de estudo em tempo real.</p>
          </div>
        `}
      </section>
    </div>
  `;
}
function renderStudentAssessments(context) {
  if (!context.enrollment) return `<section class="empty-card"><h2 class="section-title">Sem avaliacoes</h2><p>Nenhuma matricula ativa encontrada.</p></section>`;
  const selected = context.assessments.find((assessment) => assessment.id === state.selectedAssessmentId) || null;
  return `
    <div class="two-column-grid">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2 class="section-title">Avaliacoes liberadas</h2>
            <p class="panel-subtitle">A melhor nota por avaliacao compoe a pontuacao consolidada.</p>
          </div>
        </div>
        <div class="assessment-list">
          ${context.assessments.length ? context.assessments.map((assessment) => {
            const attempts = context.attempts.filter((attempt) => attempt.assessmentId === assessment.id);
            const best = attempts.reduce((max, item) => Math.max(max, item.score), 0);
            return `
              <div class="assessment-item">
                <div class="panel-header">
                  <div>
                    <strong>${escapeHtml(assessment.title)}</strong>
                    <p class="helper-text">${escapeHtml(assessment.module?.title || "Modulo")} | Peso ${assessment.weight} | ${attempts.length}/${assessment.attemptsAllowed} tentativas</p>
                  </div>
                  <span class="score-pill">Melhor nota ${best}</span>
                </div>
                <button class="secondary-btn" data-action="open-assessment" data-assessment-id="${assessment.id}" ${attempts.length >= assessment.attemptsAllowed ? "disabled" : ""}>${attempts.length >= assessment.attemptsAllowed ? "Limite atingido" : "Responder agora"}</button>
              </div>
            `;
          }).join("") : `<div class="empty-card"><p>Nenhuma avaliacao publicada para os modulos liberados neste momento.</p></div>`}
        </div>
      </section>
      <section class="evaluation-card">
        ${selected ? `
          <div class="panel-header">
            <div>
              <h2 class="section-title">${escapeHtml(selected.title)}</h2>
              <p class="panel-subtitle">Critérios dinamicos com pesos por eixo de aprendizagem.</p>
            </div>
          </div>
          <div class="criteria-list">
            ${selected.criteria.map((criterion) => `<div class="criteria-item"><strong>${escapeHtml(criterion.label)}</strong><p>Peso ${criterion.weight}</p></div>`).join("")}
          </div>
          <form class="stacked-form" data-form="assessment-submit">
            <input type="hidden" name="assessmentId" value="${selected.id}" />
            <div class="question-list">
              ${selected.questions.map((question, index) => `
                <div class="question-item">
                  <strong>${index + 1}. ${escapeHtml(question.prompt)}</strong>
                  <div class="option-group">
                    ${question.options.map((option) => `
                      <label class="option-card">
                        <input type="radio" name="${question.id}" value="${option.id}" />
                        <span>${escapeHtml(option.label)}</span>
                      </label>
                    `).join("")}
                  </div>
                </div>
              `).join("")}
            </div>
            <div class="card-actions">
              <button class="primary-btn" type="submit">Enviar avaliacao</button>
              <button class="ghost-btn" type="button" data-action="cancel-assessment">Cancelar</button>
            </div>
          </form>
        ` : `
          <div class="empty-card">
            <h2 class="section-title">Selecione uma avaliacao</h2>
            <p>A nota e calculada por criterios ponderados e influencia diretamente o status final do aluno.</p>
          </div>
        `}
      </section>
    </div>
  `;
}

function renderStudentHistory(context) {
  if (!context.enrollment) return `<section class="empty-card"><h2 class="section-title">Sem historico</h2><p>Nenhuma matricula ativa encontrada.</p></section>`;
  return `
    <div class="two-column-grid">
      <section class="table-card">
        <div class="panel-header">
          <div>
            <h2 class="section-title">Sessoes de estudo</h2>
            <p class="panel-subtitle">Acessos validados por tempo de permanencia e atividade.</p>
          </div>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Conteudo</th><th>Inicio</th><th>Fim</th><th>Tempo validado</th></tr></thead>
            <tbody>
              ${context.sessions.length ? context.sessions.map((session) => {
                const content = context.releasedContents.find((item) => item.id === session.contentId) || loadDatabase().contents.find((item) => item.id === session.contentId);
                return `<tr><td>${escapeHtml(content ? content.title : session.contentId)}</td><td>${formatDateTime(session.startedAt)}</td><td>${formatDateTime(session.endedAt)}</td><td>${formatDuration(session.validatedStudySeconds)}</td></tr>`;
              }).join("") : `<tr><td colspan="4">Nenhuma sessao registrada ainda.</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>
      <section class="table-card">
        <div class="panel-header">
          <div>
            <h2 class="section-title">Tentativas de avaliacao</h2>
            <p class="panel-subtitle">Historico consolidado da pontuacao do aluno.</p>
          </div>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Avaliacao</th><th>Data</th><th>Nota</th><th>Detalhe</th></tr></thead>
            <tbody>
              ${context.attempts.length ? context.attempts.map((attempt) => {
                const assessment = context.assessments.find((item) => item.id === attempt.assessmentId) || loadDatabase().assessments.find((item) => item.id === attempt.assessmentId);
                return `<tr><td>${escapeHtml(assessment ? assessment.title : attempt.assessmentId)}</td><td>${formatDateTime(attempt.createdAt)}</td><td>${attempt.score}</td><td>${escapeHtml(attempt.criteriaBreakdown.map((item) => `${item.label}: ${item.score}`).join(" | "))}</td></tr>`;
              }).join("") : `<tr><td colspan="4">Nenhuma tentativa registrada ainda.</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function renderStudentMain(context) {
  if (state.page === "contents") return renderStudentContents(context);
  if (state.page === "assessments") return renderStudentAssessments(context);
  if (state.page === "history") return renderStudentHistory(context);
  return renderStudentDashboard(context);
}

function renderStudentShell(database, user) {
  ensurePageForRole(user);
  const context = buildStudentContext(database, user);
  const navItems = [
    { id: "dashboard", label: "Visao Geral" },
    { id: "contents", label: "Conteudos" },
    { id: "assessments", label: "Avaliacoes" },
    { id: "history", label: "Historico" },
  ];

  return `
    <main class="dashboard-shell app-shell">
      <aside class="sidebar">
        <div>
          <h2 class="brand-title">${escapeHtml(getApplicationName(database))}</h2>
          <p class="brand-copy">${escapeHtml(getApplicationTagline(database))}</p>
        </div>
        <div class="user-summary">
          <span class="role-pill">${escapeHtml(user.role)}</span>
          <strong>${escapeHtml(user.name)}</strong>
          <p class="brand-copy">${escapeHtml(user.email)}</p>
        </div>
        <div class="nav-list">
          ${navItems.map((item) => `<button class="nav-button ${state.page === item.id ? "active" : ""}" data-action="nav-page" data-page="${item.id}">${escapeHtml(item.label)}</button>`).join("")}
        </div>
        <button class="ghost-btn" data-action="logout">Sair</button>
      </aside>
      <section class="main-column">
        ${renderPageHeader("Area do Aluno", "Acompanhe trilha, tempo validado, historico e desempenho dinamico.", `<span class="status-pill ${context.enrollment ? getStatusClass(context.enrollment.finalStatus) : "progress"}">${escapeHtml(context.enrollment ? context.enrollment.finalStatus : "Sem matricula")}</span>`)}
        ${renderStudentMain(context)}
      </section>
    </main>
  `;
}
function renderStaffOverview(database, context) {
  return `
    <div class="metrics-grid">
      ${renderMetric("Alunos ativos", `${context.enrollments.length}`, "Matriculas ativas na base independente.")}
      ${renderMetric("Media de nota", `${context.averageScore}`, "Consolidada pelas melhores tentativas.")}
      ${renderMetric("Media de progresso", `${context.averageProgress}%`, "Conteudos concluidos na trilha liberada.")}
      ${renderMetric("Aprovados", `${context.approvedCount}`, "Status final conforme regras parametrizadas.")}
    </div>
    <div class="two-column-grid">
      <section class="table-card">
        <div class="panel-header"><div><h2 class="section-title">Alunos em risco</h2><p class="panel-subtitle">Baixo progresso ou nota abaixo do esperado.</p></div></div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Aluno</th><th>Turma</th><th>Progresso</th><th>Nota</th><th>Status</th></tr></thead>
            <tbody>
              ${context.riskStudents.length ? context.riskStudents.map((item) => `<tr><td>${escapeHtml(item.student?.name || "-")}</td><td>${escapeHtml(item.studyClass?.name || "-")}</td><td>${item.progressPercent}%</td><td>${item.score}</td><td>${escapeHtml(item.finalStatus)}</td></tr>`).join("") : `<tr><td colspan="5">Nenhum aluno em risco no momento.</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>
      <section class="memory-card">
        <div class="panel-header"><div><h2 class="section-title">Memoria operacional</h2><p class="panel-subtitle">Registros de progresso e melhorias em tempo real.</p></div></div>
        <div class="memory-list">
          ${database.memoryLog.slice(0, 4).map((item) => `<div class="memory-item"><span class="tag">${escapeHtml(item.kind)}</span><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.details)}</p><p class="footer-note">${formatDateTime(item.createdAt)}</p></div>`).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderStaffClasses(database) {
  const classes = database.classes
    .slice()
    .sort((left, right) => new Date(left.startDate) - new Date(right.startDate))
    .map((studyClass) => ({
      ...studyClass,
      studyPlan: getStudyPlanById(database, studyClass.studyPlanId),
      modules: database.modules
        .filter((module) => module.studyPlanId === studyClass.studyPlanId)
        .slice()
        .sort((left, right) => left.order - right.order)
        .map((module) => ({
          ...module,
          release: getClassModuleRelease(database, studyClass.id, module.id),
        })),
      enrollmentsCount: database.enrollments.filter((item) => item.classId === studyClass.id).length,
    }));

  return `
    <div class="assessment-list">
      ${classes.map((studyClass) => `
        <section class="table-card">
          <div class="panel-header">
            <div>
              <h2 class="section-title">${escapeHtml(studyClass.name)}</h2>
              <p class="panel-subtitle">${escapeHtml(studyClass.studyPlan?.title || "Curso nao encontrado")} | ${formatDate(studyClass.startDate)} ate ${formatDate(studyClass.endDate)}</p>
            </div>
            <span class="tag">${studyClass.enrollmentsCount} matricula(s)</span>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Modulo</th><th>Descricao</th><th>Liberacao</th><th>Acao</th></tr></thead>
              <tbody>
                ${studyClass.modules.length ? studyClass.modules.map((module) => `
                  <tr>
                    <td>${escapeHtml(module.title)}</td>
                    <td>${escapeHtml(module.description)}</td>
                    <td>${module.release?.released ? `Liberado em ${formatDateTime(module.release.releasedAt)}` : "Bloqueado"}</td>
                    <td>${module.release ? `<button class="secondary-btn" data-action="toggle-release" data-class-module-id="${module.release.id}">${module.release.released ? "Bloquear" : "Liberar"}</button>` : "Sem vinculo"}</td>
                  </tr>
                `).join("") : `<tr><td colspan="4">Nenhum modulo vinculado a esta turma ainda.</td></tr>`}
              </tbody>
            </table>
          </div>
        </section>
      `).join("") || `<div class="empty-card"><p>Nenhuma turma cadastrada ainda.</p></div>`}
    </div>
  `;
}

function renderStaffStudents(database, context) {
  return `
    <div class="two-column-grid">
      <section class="table-card">
        <div class="panel-header"><div><h2 class="section-title">Matriculas ativas</h2><p class="panel-subtitle">Progresso, nota e status por aluno.</p></div></div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Aluno</th><th>Progresso</th><th>Nota</th><th>Tempo</th><th>Status</th></tr></thead>
            <tbody>
              ${context.enrollments.map((item) => `<tr><td>${escapeHtml(item.student?.name || "-")}</td><td>${item.progressPercent}%</td><td>${item.score}</td><td>${formatDuration(item.validatedStudySeconds)}</td><td>${escapeHtml(item.finalStatus)}</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
      </section>
      <section class="panel">
        <h2 class="section-title">Cadastrar aluno</h2>
        <p class="panel-subtitle">Senha inicial padrao: Aluno@123.</p>
        <form class="stacked-form" data-form="student-create">
          <div class="field"><label>Nome</label><input name="name" required /></div>
          <div class="field"><label>Email</label><input name="email" type="email" required /></div>
          <div class="field"><label>Turma</label><select name="classId">${database.classes.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("")}</select></div>
          <button class="primary-btn" type="submit">Criar aluno</button>
        </form>
      </section>
    </div>
  `;
}

function renderStaffContents(database, context) {
  const editingStudyPlan = getEditingStudyPlan(database);
  const editingModule = getEditingModule(database);
  const editingContent = getEditingContent(database);
  const editingVisual = getPrimaryVisual(editingContent);
  const editorHtml = editingContent
    ? sanitizeRichHtml(editingContent.bodyHtml || convertPlainTextToHtml(editingContent.body || ""))
    : "";
  const selectedStudyPlanId = editingModule?.studyPlanId || context.studyPlans[0]?.id || "";
  const sortedModules = database.modules
    .slice()
    .sort((left, right) => {
      if (left.studyPlanId === right.studyPlanId) return left.order - right.order;
      const leftPlan = getStudyPlanById(database, left.studyPlanId)?.title || "";
      const rightPlan = getStudyPlanById(database, right.studyPlanId)?.title || "";
      return leftPlan.localeCompare(rightPlan);
    });

  return `
    <div class="two-column-grid">
      <section class="panel">
        <h2 class="section-title">${editingStudyPlan ? "Editar curso" : "Criar curso"}</h2>
        <form class="stacked-form" data-form="study-plan-create">
          <input type="hidden" name="editingStudyPlanId" value="${editingStudyPlan ? editingStudyPlan.id : ""}" />
          <div class="field"><label>Titulo do curso</label><input name="title" value="${editingStudyPlan ? escapeHtml(editingStudyPlan.title) : ""}" required /></div>
          <div class="field"><label>Descricao</label><textarea name="description" required>${editingStudyPlan ? escapeHtml(editingStudyPlan.description) : ""}</textarea></div>
          <div class="field"><label>Carga horaria (h)</label><input name="workloadHours" type="number" min="0" value="${editingStudyPlan ? editingStudyPlan.workloadHours : 0}" /></div>
          <div class="field"><label>Versao</label><input name="version" value="${editingStudyPlan ? escapeHtml(editingStudyPlan.version || "1.0") : "1.0"}" /></div>
          <div class="inline-actions">
            <button class="primary-btn" type="submit">${editingStudyPlan ? "Salvar curso" : "Adicionar curso"}</button>
            ${editingStudyPlan ? `<button class="ghost-btn" type="button" data-action="cancel-study-plan-edit">Cancelar edicao</button>` : ""}
          </div>
        </form>
      </section>
      <section class="panel">
        <h2 class="section-title">${editingModule ? "Editar modulo" : "Criar modulo"}</h2>
        <form class="stacked-form" data-form="module-create">
          <input type="hidden" name="editingModuleId" value="${editingModule ? editingModule.id : ""}" />
          <div class="field"><label>Curso</label><select name="studyPlanId">${context.studyPlans.map((item) => `<option value="${item.id}" ${selectedStudyPlanId === item.id ? "selected" : ""}>${escapeHtml(item.title)}</option>`).join("")}</select></div>
          <div class="field"><label>Titulo do modulo</label><input name="title" value="${editingModule ? escapeHtml(editingModule.title) : ""}" required /></div>
          <div class="field"><label>Descricao</label><textarea name="description" required>${editingModule ? escapeHtml(editingModule.description) : ""}</textarea></div>
          <label class="option-card"><input type="checkbox" name="mandatory" ${editingModule ? (editingModule.mandatory ? "checked" : "") : "checked"} />Modulo obrigatorio</label>
          <div class="field">
            <p class="helper-text">O modulo passa a ser vinculado ao curso escolhido e herda sua malha de turmas automaticamente.</p>
          </div>
          <div class="inline-actions">
            <button class="primary-btn" type="submit" ${context.studyPlans.length ? "" : "disabled"}>${editingModule ? "Salvar modulo" : "Adicionar modulo"}</button>
            ${editingModule ? `<button class="ghost-btn" type="button" data-action="cancel-module-edit">Cancelar edicao</button>` : ""}
          </div>
        </form>
      </section>
    </div>
    <div class="two-column-grid">
      <section class="panel">
        <h2 class="section-title">${editingContent ? "Editar conteudo" : "Criar conteudo"}</h2>
        <form class="stacked-form" data-form="content-create">
          <input type="hidden" name="editingContentId" value="${editingContent ? editingContent.id : ""}" />
          <div class="field"><label>Modulo</label><select name="moduleId">${sortedModules.map((item) => `<option value="${item.id}" ${editingContent?.moduleId === item.id ? "selected" : ""}>${escapeHtml(getStudyPlanById(database, item.studyPlanId)?.title || "Curso")} -> ${escapeHtml(item.title)}</option>`).join("")}</select></div>
          <div class="field"><label>Titulo</label><input name="title" value="${editingContent ? escapeHtml(editingContent.title) : ""}" required /></div>
          <div class="field"><label>Resumo</label><input name="summary" value="${editingContent ? escapeHtml(editingContent.summary) : ""}" required /></div>
          <div class="field">
            <label>Corpo do conteudo</label>
            <div class="editor-toolbar">
              <button class="ghost-btn" type="button" data-editor-command="paragraph" data-editor-id="content-body-editor">Paragrafo</button>
              <button class="ghost-btn" type="button" data-editor-command="heading" data-editor-id="content-body-editor">Titulo</button>
              <button class="ghost-btn" type="button" data-editor-command="bold" data-editor-id="content-body-editor">Negrito</button>
              <button class="ghost-btn" type="button" data-editor-command="italic" data-editor-id="content-body-editor">Italico</button>
              <button class="ghost-btn" type="button" data-editor-command="bullets" data-editor-id="content-body-editor">Lista</button>
              <button class="ghost-btn" type="button" data-editor-command="numbered" data-editor-id="content-body-editor">Numerada</button>
              <button class="ghost-btn" type="button" data-editor-command="link" data-editor-id="content-body-editor">Link</button>
              <button class="ghost-btn" type="button" data-editor-command="image-url" data-editor-id="content-body-editor">Imagem por URL</button>
              <button class="ghost-btn" type="button" data-editor-file-trigger="content-body-image-upload">Imagem do computador</button>
            </div>
            <div class="rich-editor" contenteditable="true" data-editor-id="content-body-editor" data-target="bodyHtml" data-placeholder="Escreva o conteudo aqui. Cole, arraste ou insira imagens diretamente no corpo do texto.">${editorHtml}</div>
            <input type="hidden" name="bodyHtml" />
            <input class="editor-file-input" id="content-body-image-upload" type="file" accept="image/*" data-editor-id="content-body-editor" />
            <p class="helper-text">O editor aceita texto formatado, imagem por URL, upload de imagem do computador, colagem e arrastar/soltar.</p>
          </div>
          <div class="field"><label>Tempo estimado (min)</label><input name="timeEstimateMinutes" type="number" min="1" value="${editingContent ? editingContent.timeEstimateMinutes : 5}" /></div>
          <div class="field"><label>Recurso visual</label><select name="visualType"><option value="none" ${!editingVisual ? "selected" : ""}>Sem recurso adicional</option><option value="image" ${editingVisual?.type === "image" ? "selected" : ""}>Imagem</option><option value="video" ${editingVisual?.type === "video" ? "selected" : ""}>Video</option><option value="chart" ${editingVisual?.type === "chart" ? "selected" : ""}>Grafico</option></select></div>
          <div class="field"><label>Titulo do recurso</label><input name="visualTitle" value="${editingVisual?.title ? escapeHtml(editingVisual.title) : ""}" placeholder="Ex.: Mapa da jornada" /></div>
          <div class="field"><label>URL do recurso</label><input name="visualUrl" value="${editingVisual?.url ? escapeHtml(editingVisual.url) : ""}" placeholder="Imagem ou video incorporavel" /></div>
          <div class="field"><label>Legenda do recurso</label><input name="visualCaption" value="${editingVisual?.caption ? escapeHtml(editingVisual.caption) : ""}" placeholder="Contexto didatico do recurso" /></div>
          <div class="field"><label>Dados do grafico (JSON)</label><textarea name="visualChartData" placeholder='[{ "label": "Escuta", "value": 40 }, { "label": "Oferta", "value": 20 }]' >${editingVisual?.type === "chart" ? escapeHtml(JSON.stringify(editingVisual.data || [], null, 2)) : ""}</textarea></div>
          <p class="helper-text">Para imagem e video, informe a URL. Para grafico, informe um JSON com os campos label e value.</p>
          <div class="inline-actions">
            <button class="primary-btn" type="submit" ${sortedModules.length ? "" : "disabled"}>${editingContent ? "Salvar conteudo" : "Adicionar conteudo"}</button>
            ${editingContent ? `<button class="ghost-btn" type="button" data-action="cancel-content-edit">Cancelar edicao</button>` : ""}
          </div>
        </form>
      </section>
      <section class="table-card">
        <div class="panel-header">
          <div>
            <h2 class="section-title">Cursos cadastrados</h2>
            <p class="panel-subtitle">Toda trilha criada precisa ficar administravel por aqui, inclusive para edicao e exclusao.</p>
          </div>
        </div>
        <div class="assessment-list">
          ${context.studyPlans.map((studyPlan) => `
            <div class="assessment-item">
              <div class="panel-header">
                <div>
                  <strong>${escapeHtml(studyPlan.title)}</strong>
                  <p class="helper-text">Versao ${escapeHtml(studyPlan.version || "1.0")} | ${studyPlan.workloadHours || 0}h | ${studyPlan.modulesCount} modulos | ${studyPlan.contentsCount} conteudos</p>
                </div>
                <span class="tag">${studyPlan.classesCount} turma(s)</span>
              </div>
              <p>${escapeHtml(studyPlan.description)}</p>
              <p class="helper-text">${studyPlan.activeEnrollmentsCount} matricula(s) vinculadas.</p>
              <div class="inline-actions">
                <button class="secondary-btn" data-action="edit-study-plan" data-study-plan-id="${studyPlan.id}">Editar</button>
                <button class="danger-btn" data-action="delete-study-plan" data-study-plan-id="${studyPlan.id}">Excluir</button>
              </div>
            </div>
          `).join("") || `<div class="empty-card"><p>Nenhum curso cadastrado ainda.</p></div>`}
        </div>
      </section>
    </div>
    <div class="two-column-grid">
      <section class="table-card">
        <div class="panel-header">
          <div>
            <h2 class="section-title">Modulos cadastrados</h2>
            <p class="panel-subtitle">Todo modulo criado aparece aqui imediatamente apos o salvamento.</p>
          </div>
        </div>
        <div class="assessment-list">
          ${context.modules.map((module) => `
            <div class="assessment-item">
              <div class="panel-header">
                <div>
                  <strong>${escapeHtml(module.title)}</strong>
                  <p class="helper-text">${escapeHtml(module.studyPlan?.title || "Curso nao encontrado")} | Ordem ${module.order} | ${module.contentsCount} conteudos | ${module.releaseStatus}</p>
                </div>
                <span class="tag">${module.mandatory ? "obrigatorio" : "opcional"}</span>
              </div>
              <p>${escapeHtml(module.description)}</p>
              <div class="inline-actions">
                <button class="secondary-btn" data-action="edit-module" data-module-id="${module.id}">Editar</button>
                <button class="danger-btn" data-action="delete-module" data-module-id="${module.id}">Excluir</button>
              </div>
            </div>
          `).join("") || `<div class="empty-card"><p>Nenhum modulo cadastrado ainda.</p></div>`}
        </div>
      </section>
      <section class="table-card">
        <div class="panel-header">
          <div>
            <h2 class="section-title">Conteudos salvos</h2>
            <p class="panel-subtitle">Se o item foi salvo, ele precisa aparecer nesta lista. Alunos so enxergam conteudos de modulos liberados.</p>
          </div>
        </div>
        <div class="assessment-list">
          ${context.contents.map((content) => `
            <div class="assessment-item">
              <div class="panel-header">
                <div>
                  <strong>${escapeHtml(content.title)}</strong>
                  <p class="helper-text">${escapeHtml(content.studyPlan?.title || "Curso nao encontrado")} -> ${escapeHtml(content.module?.title || "Modulo nao encontrado")} | ${content.timeEstimateMinutes} min | tipo ${escapeHtml(content.type)}</p>
                </div>
                <span class="score-pill">${content.visualsCount ? `${content.visualsCount} recurso(s)` : "texto"}</span>
              </div>
              <p>${escapeHtml(content.summary)}</p>
              <div class="inline-actions">
                <button class="secondary-btn" data-action="edit-content" data-content-id="${content.id}">Editar</button>
                <button class="danger-btn" data-action="delete-content" data-content-id="${content.id}">Excluir</button>
              </div>
            </div>
          `).join("") || `<div class="empty-card"><p>Nenhum conteudo salvo ainda.</p></div>`}
        </div>
      </section>
    </div>
  `;
}

function renderStaffAssessments(database, context) {
  const draftAssessments = context.assessments
    .slice()
    .sort((left, right) => (left.published === right.published ? left.title.localeCompare(right.title) : left.published ? 1 : -1));
  const sortedModules = database.modules.slice().sort((left, right) => {
    if (left.studyPlanId === right.studyPlanId) return left.order - right.order;
    const leftPlan = getStudyPlanById(database, left.studyPlanId)?.title || "";
    const rightPlan = getStudyPlanById(database, right.studyPlanId)?.title || "";
    return leftPlan.localeCompare(rightPlan);
  });

  return `
    <div class="two-column-grid">
      <section class="panel">
        <h2 class="section-title">Criar questionario do modulo</h2>
        <p class="panel-subtitle">O aluno responde apenas o questionario publicado. O gabarito fica restrito ao operador.</p>
        <form class="stacked-form" data-form="assessment-create">
          <div class="field"><label>Modulo</label><select name="moduleId">${sortedModules.map((item) => `<option value="${item.id}">${escapeHtml(getStudyPlanById(database, item.studyPlanId)?.title || "Curso")} -> ${escapeHtml(item.title)}</option>`).join("")}</select></div>
          <div class="field"><label>Titulo do questionario</label><input name="title" placeholder="Ex.: Verificacao de absorcao do modulo" required /></div>
          <div class="field"><label>Peso na nota final</label><input name="weight" type="number" min="1" max="100" value="20" /></div>
          <div class="field"><label>Tentativas permitidas</label><input name="attemptsAllowed" type="number" min="1" max="10" value="1" /></div>
          <button class="primary-btn" type="submit" ${sortedModules.length ? "" : "disabled"}>Criar rascunho</button>
        </form>
      </section>
      <section class="panel">
        <h2 class="section-title">Geracao automatica experimental</h2>
        <p class="panel-subtitle">Gera um rascunho com perguntas sugeridas a partir do texto do modulo. Exige revisao humana antes da publicacao.</p>
        <form class="stacked-form" data-form="assessment-generate">
          <div class="field"><label>Modulo-base</label><select name="moduleId">${sortedModules.map((item) => `<option value="${item.id}">${escapeHtml(getStudyPlanById(database, item.studyPlanId)?.title || "Curso")} -> ${escapeHtml(item.title)}</option>`).join("")}</select></div>
          <div class="field"><label>Peso sugerido</label><input name="weight" type="number" min="1" max="100" value="20" /></div>
          <button class="secondary-btn" type="submit" ${sortedModules.length ? "" : "disabled"}>Gerar rascunho automatico</button>
        </form>
        <p class="helper-text">Nesta versao offline, a geracao usa heuristica local. Ela e util como apoio, nao como publicacao automatica confiavel.</p>
      </section>
    </div>
    <div class="two-column-grid">
      <section class="panel">
        <h2 class="section-title">Adicionar questao manualmente</h2>
        <form class="stacked-form" data-form="assessment-question-create">
          <div class="field"><label>Questionario</label><select name="assessmentId">${draftAssessments.map((assessment) => `<option value="${assessment.id}">${escapeHtml(assessment.title)} - ${escapeHtml(assessment.module?.title || "Modulo")}</option>`).join("")}</select></div>
          <div class="field"><label>Criterio</label><select name="criterionId">${draftAssessments.flatMap((assessment) => assessment.criteria.map((criterion) => `<option value="${criterion.id}">${escapeHtml(assessment.title)} -> ${escapeHtml(criterion.label)}</option>`)).join("")}</select></div>
          <div class="field"><label>Pergunta</label><textarea name="prompt" required></textarea></div>
          <div class="field"><label>Alternativa A</label><input name="optionA" required /></div>
          <div class="field"><label>Alternativa B</label><input name="optionB" required /></div>
          <div class="field"><label>Alternativa C</label><input name="optionC" required /></div>
          <div class="field"><label>Alternativa D</label><input name="optionD" required /></div>
          <div class="field"><label>Gabarito correto</label><select name="correctOption"><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select></div>
          <div class="field"><label>Observacao do professor / explicacao</label><textarea name="explanation" placeholder="Visivel apenas ao operador."></textarea></div>
          <button class="primary-btn" type="submit" ${draftAssessments.length ? "" : "disabled"}>Adicionar questao</button>
        </form>
      </section>
      <section class="table-card">
        <div class="panel-header">
          <div>
            <h2 class="section-title">Questionarios do sistema</h2>
            <p class="panel-subtitle">Revise gabaritos, questoes e publique quando o material estiver pronto.</p>
          </div>
        </div>
        <div class="assessment-list">
          ${draftAssessments.length ? draftAssessments.map((assessment) => `
            <div class="assessment-item">
              <div class="panel-header">
                <div>
                  <strong>${escapeHtml(assessment.title)}</strong>
                  <p class="helper-text">${escapeHtml(getStudyPlanById(database, assessment.module?.studyPlanId)?.title || "Curso")} -> ${escapeHtml(assessment.module?.title || "Modulo")} | Peso ${assessment.weight} | ${assessment.questions.length} questoes | ${assessment.attemptsCount} tentativas registradas</p>
                </div>
                <span class="status-pill ${assessment.published ? "approved" : "progress"}">${assessment.published ? "Publicado" : "Rascunho"}</span>
              </div>
              <div class="inline-actions">
                <button class="secondary-btn" data-action="toggle-assessment-published" data-assessment-id="${assessment.id}" ${assessment.questions.length ? "" : "disabled"}>${assessment.published ? "Voltar para rascunho" : "Publicar questionario"}</button>
                <button class="danger-btn" data-action="delete-assessment" data-assessment-id="${assessment.id}">Excluir</button>
                ${assessment.autoGenerated ? `<span class="tag">gerado automaticamente</span>` : `<span class="tag">manual</span>`}
              </div>
              <div class="criteria-list">
                ${assessment.questions.length ? assessment.questions.map((question) => {
                  const correctOption = question.options.find((option) => option.correct);
                  return `
                    <div class="criteria-item">
                      <strong>${escapeHtml(question.prompt)}</strong>
                      <p class="helper-text">Gabarito: ${escapeHtml(correctOption ? correctOption.label : "-")}</p>
                      ${question.explanation ? `<p class="footer-note">Professor: ${escapeHtml(question.explanation)}</p>` : ""}
                    </div>
                  `;
                }).join("") : `<div class="empty-card"><p>Sem questoes ainda. Adicione manualmente antes de publicar.</p></div>`}
              </div>
            </div>
          `).join("") : `<div class="empty-card"><p>Nenhum questionario criado ainda.</p></div>`}
        </div>
      </section>
    </div>
  `;
}

function renderStaffRules(database) {
  return `
    <div class="two-column-grid">
      <section class="panel">
        <h2 class="section-title">Configuracoes do Sistema</h2>
        <form class="stacked-form" data-form="settings-update">
          <div class="field"><label>Nome da aplicacao</label><input name="applicationName" value="${escapeHtml(getApplicationName(database))}" required /></div>
          <div class="field"><label>Subtitulo institucional</label><input name="applicationTagline" value="${escapeHtml(getApplicationTagline(database))}" /></div>
          <div class="field"><label>Perfil de cores</label><select name="themeProfile">${Object.entries(THEME_PROFILES).map(([key, item]) => `<option value="${key}" ${database.settings.themeProfile === key ? "selected" : ""}>${escapeHtml(item.label)} - ${escapeHtml(item.description)}</option>`).join("")}</select></div>
          <div class="theme-preview-grid">${Object.entries(THEME_PROFILES).map(([key, item]) => `<div class="theme-swatch ${database.settings.themeProfile === key ? "active" : ""}" data-theme-card="${key}"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.description)}</span></div>`).join("")}</div>
          <div class="field"><label>Heartbeat de estudo (segundos)</label><input name="heartbeatSeconds" type="number" min="3" max="60" value="${database.settings.heartbeatSeconds}" /></div>
          <div class="field"><label>Nota minima</label><input name="minOverallScore" type="number" min="0" max="100" value="${database.settings.minOverallScore}" /></div>
          <div class="field"><label>Tempo minimo validado (segundos)</label><input name="minValidatedStudySeconds" type="number" min="0" value="${database.settings.minValidatedStudySeconds}" /></div>
          <label class="option-card"><input type="checkbox" name="requireAllMandatory" ${database.settings.requireAllMandatory ? "checked" : ""} />Exigir todos os modulos obrigatorios concluidos</label>
          <button class="primary-btn" type="submit">Salvar configuracoes</button>
        </form>
      </section>
      <section class="panel">
        <h2 class="section-title">Parametros fundamentais</h2>
        <div class="activity-list">
          <div class="activity-item"><strong>Identidade da aplicacao</strong><p>O operador pode alterar nome exibido, subtitulo e o perfil cromatico sem mudar codigo.</p></div>
          <div class="activity-item"><strong>Experiencia imersiva</strong><p>Conteudos podem incluir imagem, video incorporavel e graficos didaticos para enriquecer a leitura do aluno.</p></div>
          <div class="activity-item"><strong>Aprovado</strong><p>Todos os modulos obrigatorios liberados e concluidos, nota minima atingida e tempo validado acima do parametro.</p></div>
          <div class="activity-item"><strong>Reprovado</strong><p>Trilha encerrada sem atingir nota minima ou tempo minimo.</p></div>
          <div class="activity-item"><strong>Em andamento</strong><p>Ainda existem modulos pendentes, liberacoes futuras ou requisitos nao concluidos.</p></div>
        </div>
      </section>
    </div>
  `;
}

function renderStaffMemory(database) {
  return `
    <div class="two-column-grid">
      <section class="panel">
        <h2 class="section-title">Registrar memoria</h2>
        <p class="panel-subtitle">Use esta area para guardar evolucao, interrupcoes produtivas e melhorias sugeridas.</p>
        <form class="stacked-form" data-form="memory-create">
          <div class="field"><label>Tipo</label><select name="kind"><option value="progress">Progresso</option><option value="improvement">Melhoria</option><option value="blocker">Bloqueio</option></select></div>
          <div class="field"><label>Titulo</label><input name="title" required /></div>
          <div class="field"><label>Descricao</label><textarea name="details" required></textarea></div>
          <button class="primary-btn" type="submit">Registrar memoria</button>
        </form>
      </section>
      <section class="memory-card">
        <h2 class="section-title">Historico de memoria</h2>
        <div class="memory-list">
          ${database.memoryLog.map((item) => `<div class="memory-item"><span class="tag">${escapeHtml(item.kind)}</span><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.details)}</p><p class="footer-note">${formatDateTime(item.createdAt)}</p></div>`).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderStaffUsers(database) {
  return `
    <div class="two-column-grid">
      <section class="table-card">
        <div class="panel-header"><div><h2 class="section-title">Usuarios e perfis</h2><p class="panel-subtitle">Gestao administrativa do acesso restrito.</p></div></div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Nome</th><th>Email</th><th>Perfil</th><th>Status</th><th>Acao</th></tr></thead>
            <tbody>
              ${database.users.map((user) => `<tr><td>${escapeHtml(user.name)}</td><td>${escapeHtml(user.email)}</td><td>${escapeHtml(user.role)}</td><td>${user.active ? "Ativo" : "Inativo"}</td><td>${getSession().userId === user.id ? "Sessao atual" : `<button class="secondary-btn" data-action="toggle-user-status" data-user-id="${user.id}">${user.active ? "Inativar" : "Ativar"}</button>`}</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
      </section>
      <section class="panel">
        <h2 class="section-title">Criar usuario</h2>
        <form class="stacked-form" data-form="user-create">
          <div class="field"><label>Nome</label><input name="name" required /></div>
          <div class="field"><label>Email</label><input name="email" type="email" required /></div>
          <div class="field"><label>Perfil</label><select name="role"><option value="operator">Operador</option><option value="admin">Admin</option></select></div>
          <button class="primary-btn" type="submit">Criar usuario</button>
        </form>
      </section>
    </div>
  `;
}
function renderStaffMain(database, user, context) {
  if (state.page === "turmas") return renderStaffClasses(database, context);
  if (state.page === "alunos") return renderStaffStudents(database, context);
  if (state.page === "conteudos") return renderStaffContents(database, context);
  if (state.page === "questionarios") return renderStaffAssessments(database, context);
  if (state.page === "regras") return renderStaffRules(database, context);
  if (state.page === "memoria") return renderStaffMemory(database, context);
  if (state.page === "usuarios" && user.role === "admin") return renderStaffUsers(database, context);
  return renderStaffOverview(database, context);
}

function renderStaffShell(database, user) {
  ensurePageForRole(user);
  const context = buildStaffContext(database);
  const navItems = [
    { id: "overview", label: "Visao Geral" },
    { id: "turmas", label: "Turmas" },
    { id: "alunos", label: "Alunos" },
    { id: "conteudos", label: "Conteudos" },
    { id: "questionarios", label: "Questionarios" },
    { id: "regras", label: "Configuracoes do Sistema" },
    { id: "memoria", label: "Memoria" },
  ];
  if (user.role === "admin") navItems.push({ id: "usuarios", label: "Usuarios" });

  return `
    <main class="dashboard-shell app-shell">
      <aside class="sidebar">
        <div>
          <h2 class="brand-title">${escapeHtml(getApplicationName(database))}</h2>
          <p class="brand-copy">${escapeHtml(getApplicationTagline(database))}</p>
        </div>
        <div class="user-summary">
          <span class="role-pill">${escapeHtml(user.role)}</span>
          <strong>${escapeHtml(user.name)}</strong>
          <p class="brand-copy">${escapeHtml(user.email)}</p>
        </div>
        <div class="nav-list">
          ${navItems.map((item) => `<button class="nav-button ${state.page === item.id ? "active" : ""}" data-action="nav-page" data-page="${item.id}">${escapeHtml(item.label)}</button>`).join("")}
        </div>
        <button class="ghost-btn" data-action="reset-database">Resetar base independente</button>
        <button class="ghost-btn" data-action="logout">Sair</button>
      </aside>
      <section class="main-column">
        ${renderPageHeader("Area Restrita", "Gerencie alunos, turmas, conteudos, regras e memoria de continuidade.", `<span class="status-pill progress">${context.enrollments.length} matriculas ativas</span>`)}
        ${renderStaffMain(database, user, context)}
      </section>
    </main>
  `;
}

function renderApp(providedDatabase) {
  const database = providedDatabase || loadDatabase();
  applySystemTheme(database);
  const user = getCurrentUser(database);
  if (!user) {
    appElement.innerHTML = renderLogin(database);
    return;
  }

  appElement.innerHTML = user.role === "student" ? renderStudentShell(database, user) : renderStaffShell(database, user);
}

document.addEventListener("click", (event) => {
  const editorCommandTrigger = event.target.closest("[data-editor-command]");
  if (editorCommandTrigger) {
    event.preventDefault();
    handleEditorCommand(editorCommandTrigger.dataset.editorId, editorCommandTrigger.dataset.editorCommand);
    return;
  }

  const editorFileTrigger = event.target.closest("[data-editor-file-trigger]");
  if (editorFileTrigger) {
    event.preventDefault();
    const input = document.getElementById(editorFileTrigger.dataset.editorFileTrigger);
    if (input) {
      rememberEditorSelection(getEditorById(input.dataset.editorId));
      input.click();
    }
    return;
  }

  const clickedEditor = event.target.closest(".rich-editor");
  if (clickedEditor) {
    rememberEditorSelection(clickedEditor);
  }

  const trigger = event.target.closest("[data-action]");
  if (!trigger) return;
  const action = trigger.dataset.action;

  if (action === "quick-login") return login(trigger.dataset.email, trigger.dataset.password);
  if (action === "logout") return logout();
  if (action === "nav-page") {
    const nextPage = trigger.dataset.page;
    if (state.page === "contents" && nextPage !== "contents") stopTracking("page-change", false);
    state.page = nextPage;
    renderApp();
    return;
  }
  if (action === "open-content") {
    state.page = "contents";
    state.selectedContentId = trigger.dataset.contentId;
    startTracking(trigger.dataset.contentId);
    renderApp();
    return;
  }
  if (action === "edit-study-plan") return startStudyPlanEdit(trigger.dataset.studyPlanId);
  if (action === "cancel-study-plan-edit") return cancelStudyPlanEdit();
  if (action === "delete-study-plan") return deleteStudyPlan(trigger.dataset.studyPlanId);
  if (action === "edit-module") return startModuleEdit(trigger.dataset.moduleId);
  if (action === "cancel-module-edit") return cancelModuleEdit();
  if (action === "delete-module") return deleteModule(trigger.dataset.moduleId);
  if (action === "edit-content") return startContentEdit(trigger.dataset.contentId);
  if (action === "cancel-content-edit") return cancelContentEdit();
  if (action === "delete-content") return deleteContent(trigger.dataset.contentId);
  if (action === "close-content") {
    stopTracking("manual-close", false);
    state.selectedContentId = null;
    renderApp();
    return;
  }
  if (action === "finalize-reading") {
    stopTracking("manual-finish", false);
    renderApp();
    return;
  }
  if (action === "open-assessment") {
    if (state.page === "contents") stopTracking("assessment-open", false);
    state.page = "assessments";
    state.selectedAssessmentId = trigger.dataset.assessmentId;
    renderApp();
    return;
  }
  if (action === "toggle-assessment-published") return toggleAssessmentPublished(trigger.dataset.assessmentId);
  if (action === "delete-assessment") return deleteAssessment(trigger.dataset.assessmentId);
  if (action === "cancel-assessment") {
    state.selectedAssessmentId = null;
    renderApp();
    return;
  }
  if (action === "toggle-release") return toggleModuleRelease(trigger.dataset.classModuleId);
  if (action === "toggle-user-status") return toggleUserStatus(trigger.dataset.userId);
  if (action === "reset-database") return resetStandaloneDatabase();
});

document.addEventListener("submit", (event) => {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();
  syncRichEditors(form);
  const formData = new FormData(form);
  const formName = form.dataset.form;

  if (formName === "login") return login(formData.get("email"), formData.get("password"));
  if (formName === "student-create") return createStudent(formData);
  if (formName === "study-plan-create") return createStudyPlan(formData);
  if (formName === "module-create") return createModule(formData);
  if (formName === "content-create") return createContent(formData);
  if (formName === "assessment-create") return createAssessment(formData);
  if (formName === "assessment-question-create") return addQuestionToAssessment(formData);
  if (formName === "assessment-generate") return generateAssessmentDraft(formData);
  if (formName === "settings-update") return updateSettings(formData);
  if (formName === "memory-create") return createMemoryNote(formData);
  if (formName === "user-create") return createUser(formData);
  if (formName === "assessment-submit") return submitAssessment(formData);
});

document.addEventListener("input", (event) => {
  const editor = event.target.closest(".rich-editor");
  if (!editor) return;
  rememberEditorSelection(editor);
  syncRichEditors(editor.closest("form") || document);
});

document.addEventListener("keyup", (event) => {
  const editor = event.target.closest(".rich-editor");
  if (!editor) return;
  rememberEditorSelection(editor);
});

document.addEventListener("change", (event) => {
  const fileInput = event.target.closest(".editor-file-input");
  if (!fileInput) return;
  const file = fileInput.files?.[0];
  if (file) insertImageFileIntoEditor(fileInput.dataset.editorId, file);
  fileInput.value = "";
});

document.addEventListener("paste", (event) => {
  const editor = event.target.closest(".rich-editor");
  if (!editor) return;

  const items = Array.from(event.clipboardData?.items || []).filter((item) => item.type.startsWith("image/"));
  if (!items.length) return;

  event.preventDefault();
  rememberEditorSelection(editor);
  items.forEach((item) => {
    const file = item.getAsFile();
    if (file) insertImageFileIntoEditor(editor.dataset.editorId, file);
  });
});

document.addEventListener("dragover", (event) => {
  if (event.target.closest(".rich-editor")) event.preventDefault();
});

document.addEventListener("drop", (event) => {
  const editor = event.target.closest(".rich-editor");
  if (!editor) return;
  event.preventDefault();
  rememberEditorSelection(editor);

  Array.from(event.dataTransfer?.files || [])
    .filter((file) => file.type.startsWith("image/"))
    .forEach((file) => insertImageFileIntoEditor(editor.dataset.editorId, file));
});

["mousemove", "keydown", "click", "scroll"].forEach((eventName) => {
  document.addEventListener(eventName, markActivity, { passive: true });
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") markActivity();
});

window.addEventListener("beforeunload", () => {
  stopTracking("beforeunload", false);
});

renderApp();



