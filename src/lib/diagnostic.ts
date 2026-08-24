export type DiagnosticAnswer = "yes" | "unknown" | "no";

export type DiagnosticAxis = "communications" | "crm" | "manual" | "analytics" | "knowledge";

export interface DiagnosticQuestion {
  prompt: string;
  riskyAnswer: Exclude<DiagnosticAnswer, "unknown">;
  weights: Partial<Record<DiagnosticAxis, number>>;
}

export interface DiagnosticResult {
  code: string;
  text: string;
  solution: string;
  primaryAxis: DiagnosticAxis | "visibility" | "controlled";
}

export const diagnosticQuestions: readonly DiagnosticQuestion[] = [
  { prompt: "Все ли входящие каналы связаны с одной системой?", riskyAnswer: "no", weights: { communications: 0.7, crm: 0.3, analytics: 0.2 } },
  { prompt: "Все ли обращения автоматически попадают в CRM?", riskyAnswer: "no", weights: { crm: 1, communications: 0.4 } },
  { prompt: "Видит ли руководитель необработанные лиды без ручной проверки?", riskyAnswer: "no", weights: { crm: 1, analytics: 0.4 } },
  { prompt: "Собирается ли источник каждого обращения?", riskyAnswer: "no", weights: { analytics: 1, crm: 0.2 } },
  { prompt: "Есть ли действия, которые сотрудники ежедневно копируют между сервисами?", riskyAnswer: "yes", weights: { manual: 1, communications: 0.2 } },
  { prompt: "Формируются ли отчёты вручную?", riskyAnswer: "yes", weights: { analytics: 0.8, manual: 0.6 } },
  { prompt: "Есть ли внутренняя информация, которую сотрудники постоянно ищут в чатах?", riskyAnswer: "yes", weights: { knowledge: 1, communications: 0.2 } }
] as const;

export const diagnosticAxisLabels: Record<DiagnosticAxis, string> = {
  communications: "Коммуникации",
  crm: "Контроль CRM",
  manual: "Ручные операции",
  analytics: "Аналитика",
  knowledge: "Знания"
};

const diagnoses: Record<DiagnosticAxis, DiagnosticResult> = {
  crm: { code: "Blind CRM", text: "CRM фиксирует обращения, но не гарантирует реакцию, ответственного и следующий шаг.", solution: "карта обязательных реакций + SLA-контроль + возврат риска руководителю", primaryAxis: "crm" },
  manual: { code: "Manual Operations", text: "Повторяемые действия и перенос данных всё ещё зависят от памяти сотрудников.", solution: "карта ручных операций + интеграции + управляемые автоматические статусы", primaryAxis: "manual" },
  analytics: { code: "Disconnected Analytics", text: "Данные собираются неполно или проблема становится видна позже, чем нужно для действия.", solution: "единые события + CRM-источники + панель исключений и контроль качества данных", primaryAxis: "analytics" },
  communications: { code: "Fragmented Communications", text: "Обращения и решения распределены между каналами, поэтому контекст и ответственность теряются.", solution: "единый маршрут обращения + правила передачи + видимый журнал действий", primaryAxis: "communications" },
  knowledge: { code: "Knowledge Chaos", text: "Критичная информация находится в чатах и памяти людей, а не в управляемом источнике знаний.", solution: "структура знаний + владелец обновления + поиск с проверяемыми источниками", primaryAxis: "knowledge" }
};

const controlledResult: DiagnosticResult = {
  code: "Controlled Foundation",
  text: "Базовые контрольные точки уже существуют. Следующий риск — исключения, качество данных и устойчивость правил.",
  solution: "проверка SLA, исключений, журналов решений и сценариев деградации",
  primaryAxis: "controlled"
};

const visibilityResult: DiagnosticResult = {
  code: "Insufficient Visibility",
  text: "По большинству контрольных вопросов нет подтверждённого ответа — это уже управленческий риск.",
  solution: "короткий Diagnose: карта процесса, источники данных, владельцы и точки проверки",
  primaryAxis: "visibility"
};

const axes = Object.keys(diagnosticAxisLabels) as DiagnosticAxis[];

function riskFactor(answer: DiagnosticAnswer, riskyAnswer: Exclude<DiagnosticAnswer, "unknown">) {
  if (answer === "unknown") return 0.45;
  return answer === riskyAnswer ? 1 : 0;
}

export function getDiagnosticSnapshot(answers: Partial<Record<number, DiagnosticAnswer>>) {
  return Object.fromEntries(
    axes.map((axis) => {
      let score = 0;
      let possible = 0;
      for (const [indexText, answer] of Object.entries(answers)) {
        const question = diagnosticQuestions[Number(indexText)];
        const weight = question?.weights[axis] ?? 0;
        if (!question || !answer || weight === 0) continue;
        score += weight * riskFactor(answer, question.riskyAnswer);
        possible += weight;
      }
      const ratio = possible ? score / possible : null;
      const status = ratio === null ? "unknown" : ratio >= 0.67 ? "risk" : ratio >= 0.3 ? "attention" : "healthy";
      return [axis, { ratio, status }];
    })
  ) as Record<DiagnosticAxis, { ratio: number | null; status: "unknown" | "healthy" | "attention" | "risk" }>;
}

export function evaluateDiagnostic(answers: Partial<Record<number, DiagnosticAnswer>>): DiagnosticResult | null {
  if (Object.keys(answers).length < diagnosticQuestions.length) return null;
  if (Object.values(answers).filter((answer) => answer === "unknown").length >= 4) return visibilityResult;

  const snapshot = getDiagnosticSnapshot(answers);
  const [primaryAxis, primary] = axes
    .map((axis) => [axis, snapshot[axis]] as const)
    .sort((a, b) => (b[1].ratio ?? 0) - (a[1].ratio ?? 0))[0];

  if ((primary.ratio ?? 0) < 0.3) return controlledResult;
  return diagnoses[primaryAxis];
}
