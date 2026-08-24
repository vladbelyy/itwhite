import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  diagnosticAxisLabels,
  diagnosticQuestions,
  evaluateDiagnostic,
  getDiagnosticSnapshot,
  type DiagnosticAnswer
} from "../../lib/diagnostic";
import { trackGoal } from "../../lib/analytics";

const variants: Record<DiagnosticAnswer, string> = { yes: "да", unknown: "не знаю", no: "нет" };
const statusLabels = { unknown: "нет данных", healthy: "под контролем", attention: "проверить", risk: "риск" } as const;

export default function DiagnosticFlow() {
  const [answers, setAnswers] = useState<Partial<Record<number, DiagnosticAnswer>>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const diagnosisRef = useRef<HTMLDivElement>(null);
  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / diagnosticQuestions.length) * 100);
  const snapshot = useMemo(() => getDiagnosticSnapshot(answers), [answers]);
  const result = useMemo(() => evaluateDiagnostic(answers), [answers]);

  useEffect(() => {
    if (showResult) {
      window.requestAnimationFrame(() => {
        diagnosisRef.current?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
        diagnosisRef.current?.focus({ preventScroll: true });
      });
    } else if (answeredCount > 0) headingRef.current?.focus({ preventScroll: true });
  }, [currentIndex, showResult, answeredCount]);

  const saveResult = () => {
    if (!result) return;
    trackGoal("diagnostic_complete", { result: result.primaryAxis, code: result.code });
    const createdAt = new Date();
    localStorage.setItem("itwhiteDiagnosis", JSON.stringify({
      result,
      answers,
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }));
    const contact = document.querySelector<HTMLElement>("#contact");
    contact?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => contact?.querySelector<HTMLInputElement>("#name")?.focus(), prefersReducedMotion ? 0 : 450);
  };

  const selectAnswer = (answer: DiagnosticAnswer) => {
    if (answeredCount === 0) trackGoal("diagnostic_start");
    const nextAnswers = { ...answers, [currentIndex]: answer };
    const nextUnanswered = diagnosticQuestions.findIndex((_, index) => !nextAnswers[index]);
    setAnswers(nextAnswers);
    if (nextUnanswered === -1) setShowResult(true);
    else setCurrentIndex(nextUnanswered);
  };

  const goBack = () => {
    if (showResult) {
      setShowResult(false);
      setCurrentIndex(diagnosticQuestions.length - 1);
    } else {
      setCurrentIndex((index) => Math.max(0, index - 1));
    }
  };

  const restart = () => {
    setAnswers({});
    setCurrentIndex(0);
    setShowResult(false);
  };

  const motionState = prefersReducedMotion
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 14, filter: "blur(4px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -10, filter: "blur(4px)" },
        transition: { duration: 0.24 }
      };

  return (
    <div className="diagnostic-card diagnostic-card--system">
      <div className="diagnostic-session">
        <div><span>Business control diagnostic</span><b>7 вопросов / 3 минуты</b></div>
        <strong>{answeredCount}/{diagnosticQuestions.length}</strong>
      </div>
      <div className="diagnostic-layout">
        <div className="diagnostic-questions">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div className="diagnostic-question diagnostic-question--single" key={showResult ? "result-ready" : currentIndex} {...motionState}>
              <div className="question-label">
                {showResult ? "RESULT" : `QUESTION ${String(currentIndex + 1).padStart(2, "0")} / ${String(diagnosticQuestions.length).padStart(2, "0")}`}
              </div>
              <h3 ref={headingRef} tabIndex={-1}>{showResult ? "Диагностика завершена" : diagnosticQuestions[currentIndex].prompt}</h3>
              {!showResult && (
                <div className="answer-grid" role="radiogroup" aria-label={`Ответ на вопрос ${currentIndex + 1}`}>
                  {(Object.keys(variants) as DiagnosticAnswer[]).map((answer) => (
                    <button key={answer} type="button" role="radio" aria-checked={answers[currentIndex] === answer} onClick={() => selectAnswer(answer)}>
                      {variants[answer]}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="diagnostic-history" aria-label="Шаги диагностики">
            {diagnosticQuestions.map((question, index) => {
              const state = answers[index] ? "done" : index === currentIndex && !showResult ? "active" : "pending";
              return (
                <button
                  key={question.prompt}
                  type="button"
                  data-state={state}
                  disabled={!answers[index]}
                  aria-label={`Вернуться к вопросу ${index + 1}: ${question.prompt}`}
                  aria-current={state === "active" ? "step" : undefined}
                  onClick={() => { setShowResult(false); setCurrentIndex(index); }}
                >
                  {String(index + 1).padStart(2, "0")}
                </button>
              );
            })}
          </div>
          <div className="diagnostic-actions">
            {(currentIndex > 0 || showResult) && <button type="button" onClick={goBack}>← Назад</button>}
            {answeredCount > 0 && <button type="button" onClick={restart}>Начать заново</button>}
          </div>
        </div>
        <aside className="diagnostic-state" aria-label="Промежуточная карта рисков">
          {(Object.keys(diagnosticAxisLabels) as Array<keyof typeof diagnosticAxisLabels>).map((axis) => (
            <div className="diagnostic-state__row" key={axis} data-status={snapshot[axis].status}>
              <span>{diagnosticAxisLabels[axis]}</span>
              <b>{statusLabels[snapshot[axis].status]}</b>
            </div>
          ))}
          <div className="diagnostic-state__bar" role="progressbar" aria-label="Прогресс диагностики" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <span style={{ width: `${progress}%` }} />
          </div>
        </aside>
      </div>
      <AnimatePresence initial={false}>
        {showResult && result && (
          <motion.div ref={diagnosisRef} tabIndex={-1} className="diagnosis" role="status" aria-live="polite" {...motionState}>
            <span>PRIMARY RISK</span>
            <b>Diagnosis: {result.code}</b>
            <p>{result.text}</p>
            <p>Следующий разумный шаг: {result.solution}.</p>
            <button className="button button--primary" type="button" onClick={saveResult}>Получить разбор результата</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
