
import { useEffect, useState } from "react";
import "./LessonContent.css";

const API_URL = "http://localhost:5000/api/courses";

export default function LessonContent({
  course,
  lessonId,
  lessons,
  completedLessonIds,
  onComplete,
  onBack,
  onSelectLesson,
  authRequired,
  completingLessonId,
  progressError,
  successMessage,
}) {
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLesson() {
      setLoading(true);
      setError("");
      setLesson(null);

      try {
        const response = await fetch(
          `${API_URL}/${course.id}/lessons/${lessonId}`,
          {
            signal: controller.signal,
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "تعذّر تحميل محتوى الدرس."
          );
        }

        setLesson(data.lesson);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "حدث خطأ أثناء تحميل الدرس.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadLesson();

    return () => controller.abort();
  }, [course.id, lessonId, retryCount]);

  const currentIndex = lessons.findIndex(
    (item) => Number(item.id) === Number(lessonId)
  );

  const previousLesson =
    currentIndex > 0 ? lessons[currentIndex - 1] : null;

  const nextLesson =
    currentIndex >= 0 && currentIndex < lessons.length - 1
      ? lessons[currentIndex + 1]
      : null;

  const isCompleted = completedLessonIds.some(
    (id) => Number(id) === Number(lessonId)
  );

  const isSaving =
    Number(completingLessonId) === Number(lessonId);

  return (
    <main className="lesson-page" dir="rtl">
      <header className="lesson-page-header">
        <button
          type="button"
          className="lesson-back-button"
          onClick={onBack}
        >
          → العودة إلى دروس الدورة
        </button>

        <div className="lesson-brand">
          <span>🛡️</span>
          CyberGuard Academy
        </div>
      </header>

      <section className="lesson-page-hero">
        <span className="lesson-page-kicker">
          CYBERGUARD ACADEMY
        </span>

        <p className="lesson-course-name">
          {course.title_ar || course.title_en}
        </p>

        <h1>
          {lesson?.title_ar ||
            lesson?.title_en ||
            "محتوى الدرس"}
        </h1>

        {lesson?.title_en && (
          <p className="lesson-title-english" dir="ltr">
            {lesson.title_en}
          </p>
        )}

        {currentIndex >= 0 && (
          <span className="lesson-position">
            الدرس {currentIndex + 1} من {lessons.length}
          </span>
        )}
      </section>

      <section className="lesson-reading-container">
        {loading && (
          <div className="lesson-loading" role="status">
            <span className="lesson-spinner" />
            جارٍ تحميل محتوى الدرس...
          </div>
        )}

        {!loading && error && (
          <div className="lesson-error" role="alert">
            <p>{error}</p>

            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {!loading && lesson && (
          <>
            <article className="lesson-reading-card">
              <div className="lesson-reading-heading">
                <span className="lesson-reading-icon">📘</span>
                <div>
                  <span className="lesson-reading-label">
                    LESSON CONTENT
                  </span>
                  <h2>شرح الدرس</h2>
                </div>
              </div>

              <div className="lesson-reading-text">
                {lesson.content_ar ||
                  lesson.content_en ||
                  "لم تتم إضافة المحتوى التعليمي لهذا الدرس بعد."}
              </div>

              {lesson.content_ar && lesson.content_en && (
                <details className="lesson-english-content">
                  <summary>
                    عرض المحتوى باللغة الإنجليزية
                  </summary>

                  <div className="lesson-reading-text" dir="ltr">
                    {lesson.content_en}
                  </div>
                </details>
              )}

              {lesson.video_url && (
                <div className="lesson-video-section">
                  <h3>🎬 الفيديو التعليمي</h3>

                  <a
                    href={lesson.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lesson-video-button"
                  >
                    مشاهدة الفيديو التعليمي ↗
                  </a>

                  <p>
                    سيفتح الفيديو في صفحة جديدة.
                  </p>
                </div>
              )}
            </article>

            <section className="lesson-action-card">
              <h2>إنجازك في هذا الدرس</h2>

              {isCompleted ? (
                <p className="lesson-done-message">
                  ✓ أحسنتِ! هذا الدرس مكتمل ومحفوظ في حسابك.
                </p>
              ) : authRequired ? (
                <p className="lesson-auth-message">
                  سجّلي الدخول أولًا حتى تتمكني من حفظ إنجازك.
                </p>
              ) : (
                <button
                  type="button"
                  className="lesson-complete-button"
                  disabled={isSaving}
                  onClick={() => onComplete(lessonId)}
                >
                  {isSaving
                    ? "جارٍ حفظ الإنجاز..."
                    : "✓ إكمال الدرس وحفظ التقدم"}
                </button>
              )}

              {progressError && (
                <p className="lesson-action-error" role="alert">
                  {progressError}
                </p>
              )}

              {successMessage && (
                <p className="lesson-done-message" role="status">
                  {successMessage}
                </p>
              )}
            </section>

            <nav className="lesson-navigation">
              {previousLesson ? (
                <button
                  type="button"
                  className="lesson-nav-button"
                  onClick={() => onSelectLesson(previousLesson.id)}
                >
                  <span>← الدرس السابق</span>
                  <strong>
                    {previousLesson.title_ar ||
                      previousLesson.title_en}
                  </strong>
                </button>
              ) : (
                <span />
              )}

              {nextLesson ? (
                <button
                  type="button"
                  className="lesson-nav-button lesson-nav-next"
                  onClick={() => onSelectLesson(nextLesson.id)}
                >
                  <span>الدرس التالي →</span>
                  <strong>
                    {nextLesson.title_ar || nextLesson.title_en}
                  </strong>
                </button>
              ) : (
                <span />
              )}
            </nav>
          </>
        )}
      </section>

      <footer className="lesson-page-footer">
        © 2026 CyberGuard Academy — تعلّمي اليوم، احمي الغد
      </footer>
    </main>
  );
}
