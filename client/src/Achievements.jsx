
import { useEffect, useState } from "react";
import "./Achievements.css";

const API_URL = "http://localhost:5000/api";

function Achievements({ onBack }) {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAttempts() {
      try {
        const response = await fetch(
          `${API_URL}/quizzes/my-attempts`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "تعذر تحميل سجل الإنجازات"
          );
        }

        setAttempts(data.attempts || []);
      } catch (err) {
        setError(err.message || "An error occurred while loading data");
      } finally {
        setLoading(false);
      }
    }

    fetchAttempts();
  }, []);

  const completedCount = attempts.length;

  const passedCount = attempts.filter((attempt) => {
    return Number(attempt.score) >= Number(attempt.passing_score);
  }).length;

  const bestScore =
    attempts.length > 0
      ? Math.max(...attempts.map((attempt) => Number(attempt.score) || 0))
      : 0;

  const averageScore =
    attempts.length > 0
      ? attempts.reduce(
          (sum, attempt) => sum + (Number(attempt.score) || 0),
          0
        ) / attempts.length
      : 0;

  function formatDate(date) {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "—";

    return parsedDate.toLocaleDateString("ar", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <main className="achievements-page" dir="rtl">
      <header className="achievements-header">
        <div>
          <p className="achievements-eyebrow">CYBERGUARD ACADEMY</p>
          <h1>Achievements 🏆</h1>
          <p className="achievements-subtitle">
            تابعي تقدمكِ وراجعي نتائج Quizzes التي أكملتها.
          </p>
        </div>

        {onBack && (
          <button
            className="achievements-back"
            onClick={onBack}
            type="button"
          >
            العودة ←
          </button>
        )}
      </header>

      {loading ? (
        <div className="achievements-message">
          جارٍ تحميل إنجازاتك...
        </div>
      ) : error ? (
        <div className="achievements-message achievements-error">
          <p>{error}</p>
          <p>
            إذا ظهرت رسالة Authentication required، سجّلي الدخول أولًا
            ثم افتحي الصفحة مرة أخرى.
          </p>
        </div>
      ) : (
        <>
          <section className="achievements-stats">
            <article className="achievement-stat">
              <span className="achievement-icon">📝</span>
              <p>Quizzes المكتملة</p>
              <strong>{completedCount}</strong>
            </article>

            <article className="achievement-stat">
              <span className="achievement-icon">✅</span>
              <p>مرات النجاح</p>
              <strong>{passedCount}</strong>
            </article>

            <article className="achievement-stat">
              <span className="achievement-icon">⭐</span>
              <p>أفضل علامة</p>
              <strong>{bestScore.toFixed(1)}%</strong>
            </article>

            <article className="achievement-stat">
              <span className="achievement-icon">📊</span>
              <p>Intermediate العلامات</p>
              <strong>{averageScore.toFixed(1)}%</strong>
            </article>
          </section>

          <section className="achievements-section">
            <div className="achievements-section-heading">
              <div>
                <h2>سجل Quizzes</h2>
                <p>جميع Quizzes التي أكملتِها</p>
              </div>
              <span className="attempts-count">
                {completedCount} Quiz
              </span>
            </div>

            {attempts.length === 0 ? (
              <div className="achievements-empty">
                <span>🎯</span>
                <h3>لسه ما عندك إنجازات</h3>
                <p>
                  ابدئي بأحد Quizzes التعليمية، وارجعي لهون
                  لتشوفي نتائجك وتقدمك.
                </p>
              </div>
            ) : (
              <div className="attempts-list">
                {attempts.map((attempt) => {
                  const score = Number(attempt.score) || 0;
                  const passed =
                    score >= Number(attempt.passing_score);

                  return (
                    <article
                      className="attempt-card"
                      key={attempt.attempt_id}
                    >
                      <div className="attempt-main">
                        <div className="attempt-icon">📋</div>

                        <div className="attempt-info">
                          <h3>
                            {attempt.quiz_title_ar ||
                              attempt.quiz_title_en ||
                              "Quiz تعليمي"}
                          </h3>

                          <p>
                            {attempt.course_title_ar ||
                              attempt.course_title_en ||
                              "دورة تعليمية"}
                          </p>

                          <span className="attempt-date">
                            تاريخ الإكمال:{" "}
                            {formatDate(attempt.submitted_at)}
                          </span>
                        </div>
                      </div>

                      <div className="attempt-result">
                        <strong>{score.toFixed(1)}%</strong>
                        <span
                          className={
                            passed
                              ? "attempt-status passed"
                              : "attempt-status failed"
                          }
                        >
                          {passed ? "ناجح ✓" : "لم يجتز"}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="achievements-section badges-section">
            <div className="achievements-section-heading">
              <div>
                <h2>الشارات والجوائز</h2>
                <p>مساحة إنجازاتك في مجال الأمن السيبراني</p>
              </div>
            </div>

            <div className="badge-placeholder">
              <span>🎖️</span>
              <div>
                <h3>الشارات قريبًا</h3>
                <p>
                  سنربط هذا القسم بنظام الشارات في قاعدة البيانات
                  حتى تظهر الشارات التي حصلتِ عليها فعلًا.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

export default Achievements;
