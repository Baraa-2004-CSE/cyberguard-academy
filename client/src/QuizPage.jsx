
import { useEffect, useState } from "react";

const QUIZ_API_URL = "http://localhost:5000/api/quizzes";

export default function QuizPage({ quiz, onBack }) {
  const [quizData, setQuizData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadQuiz() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${QUIZ_API_URL}/${quiz.id}`,
          {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
          throw new Error(
            response.status === 401
              ? "سجّلي الدخول أولًا لفتح الاختبار."
              : data.message || "تعذّر تحميل أسئلة الاختبار."
          );
        }

        setQuizData(data);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "حدث خطأ أثناء تحميل الاختبار.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadQuiz();

    return () => controller.abort();
  }, [quiz.id]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!quizData?.questions?.length || submitting) return;

    const unanswered = quizData.questions.filter(
      (question) => answers[question.id] == null
    );

    if (unanswered.length > 0) {
      const confirmed = window.confirm(
        `لم تجيبي عن ${unanswered.length} من الأسئلة. هل تريدين تسليم الاختبار؟`
      );

      if (!confirmed) return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        `${QUIZ_API_URL}/${quiz.id}/submit`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            answers: Object.entries(answers).map(
              ([questionId, optionId]) => ({
                question_id: Number(questionId),
                selected_option_id: Number(optionId),
              })
            ),
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(
          response.status === 401
            ? "انتهت جلسة تسجيل الدخول. سجّلي الدخول مجددًا."
            : data.message || "تعذّر تسليم الاختبار."
        );
      }

      setResult(data.result);
    } catch (err) {
      setError(err.message || "حدث خطأ أثناء تسليم الاختبار.");
    } finally {
      setSubmitting(false);
    }
  }

  const pageStyle = {
    minHeight: "100vh",
    background: "#f4f7fb",
    padding: "32px 16px",
    direction: "rtl",
    color: "#172033",
  };

  const panelStyle = {
    maxWidth: "850px",
    margin: "0 auto 20px",
    padding: "24px",
    background: "#fff",
    border: "1px solid #e1e7ef",
    borderRadius: "16px",
    boxShadow: "0 4px 18px rgba(20,40,70,0.05)",
  };

  if (loading) {
    return (
      <main style={pageStyle}>
        <section style={panelStyle}>جارٍ تحميل أسئلة الاختبار...</section>
      </main>
    );
  }

  if (error && !quizData) {
    return (
      <main style={pageStyle}>
        <section style={panelStyle}>
          <p role="alert">{error}</p>
          <button type="button" onClick={onBack}>
            العودة إلى الاختبارات
          </button>
        </section>
      </main>
    );
  }

  const quizInfo = quizData?.quiz || quiz;

  return (
    <main style={pageStyle}>
      <header style={panelStyle}>
        <button type="button" onClick={onBack}>
          ← العودة إلى الاختبارات
        </button>

        <p style={{ color: "#078da6", fontWeight: "bold" }}>
          CYBERGUARD ACADEMY
        </p>

        <h1>{quizInfo.title_ar || quizInfo.title_en}</h1>

        {quizInfo.title_en && (
          <p style={{ color: "#64748b" }}>{quizInfo.title_en}</p>
        )}

        <p>
          عدد الأسئلة: {quizData?.questions?.length || 0}
          {" · "}
          علامة النجاح: {quizInfo.passing_score ?? 60}%
        </p>
      </header>

      {error && (
        <section style={panelStyle}>
          <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>
        </section>
      )}

      {result ? (
        <section style={panelStyle} aria-live="polite">
          <h2>انتهى الاختبار 🎉</h2>

          <p style={{ fontSize: "22px", fontWeight: "bold" }}>
            علامتك: {result.score}%
          </p>

          <p>
            الإجابات الصحيحة: {result.earned_points} من{" "}
            {result.total_points}
          </p>

          <p>
            {result.passed
              ? "مبارك! اجتزتِ الاختبار بنجاح. ✅"
              : "لم تحققي علامة النجاح هذه المرة. يمكنكِ مراجعة الدورة والمحاولة لاحقًا."}
          </p>

          <button type="button" onClick={onBack}>
            العودة إلى الاختبارات
          </button>
        </section>
      ) : (
        <form onSubmit={handleSubmit}>
          {(quizData?.questions || []).map((question, index) => (
            <section
              key={question.id}
              style={panelStyle}
            >
              <h3>
                السؤال {index + 1}:{" "}
                {question.question_ar || question.question_en}
              </h3>

              {question.question_en && question.question_ar && (
                <p style={{ color: "#64748b" }}>
                  {question.question_en}
                </p>
              )}

              <p style={{ fontSize: "13px", color: "#64748b" }}>
                العلامة: {question.points}
              </p>

              <div style={{ display: "grid", gap: "12px" }}>
                {(question.options || []).map((option) => {
                  const selected =
                    String(answers[question.id]) === String(option.id);

                  return (
                    <label
                      key={option.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        padding: "13px",
                        border: selected
                          ? "2px solid #0891b2"
                          : "1px solid #dbe3ed",
                        borderRadius: "10px",
                        background: selected ? "#ecfeff" : "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option.id}
                        checked={selected}
                        onChange={() =>
                          setAnswers((previous) => ({
                            ...previous,
                            [question.id]: option.id,
                          }))
                        }
                      />

                      <span>
                        {option.option_ar || option.option_en}
                        {option.option_en && option.option_ar && (
                          <small
                            style={{
                              display: "block",
                              color: "#64748b",
                              marginTop: "4px",
                            }}
                          >
                            {option.option_en}
                          </small>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          ))}

          {quizData?.questions?.length > 0 ? (
            <div style={{ maxWidth: "850px", margin: "0 auto" }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "14px 24px",
                  border: "none",
                  borderRadius: "10px",
                  background: submitting ? "#94a3b8" : "#087f8c",
                  color: "#fff",
                  fontSize: "16px",
                  fontWeight: "bold",
                  cursor: submitting ? "wait" : "pointer",
                }}
              >
                {submitting ? "جارٍ التصحيح..." : "تسليم الاختبار"}
              </button>
            </div>
          ) : (
            <section style={panelStyle}>
              لا توجد أسئلة مضافة لهذا الاختبار حتى الآن.
            </section>
          )}
        </form>
      )}
    </main>
  );
}
