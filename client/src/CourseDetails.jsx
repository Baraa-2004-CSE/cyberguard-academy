
import { useEffect, useState } from "react";
import "./CourseDetails.css";
import LessonContent from "./LessonContent";

const API_URL = "http://localhost:5000/api/courses";
const QUIZ_API_URL = "http://localhost:5000/api/quizzes";

const levelLabels = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export default function CourseDetails({
  course,
  onBack,
  onOpenQuiz,
}) {
  const [lessons, setLessons] = useState([]);
  const [completedLessonIds, setCompletedLessonIds] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [progressError, setProgressError] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const [completingLessonId, setCompletingLessonId] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState(null);

  // حالات Quizzes
  const [quizzes, setQuizzes] = useState([]);
  const [quizzesLoading, setQuizzesLoading] = useState(true);
  const [quizzesError, setQuizzesError] = useState("");
  const [quizRetryCount, setQuizRetryCount] = useState(0);

  // تحميل الدروس وتقدم الطالب
  useEffect(() => {
    if (!course?.id) {
      setLessons([]);
      setCompletedLessonIds([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function fetchCourseData() {
      setLoading(true);
      setError("");
      setProgressError("");
      setAuthRequired(false);
      setSuccessMessage("");

      try {
        const lessonsResponse = await fetch(
          `${API_URL}/${course.id}/lessons`,
          {
            credentials: "include",
            signal: controller.signal,
            cache: "no-store",
          }
        );

        const lessonsData = await lessonsResponse
          .json()
          .catch(() => ({}));

        if (!lessonsResponse.ok || !lessonsData.success) {
          throw new Error(
            lessonsData.message || "تعذّر تحميل دروس الدورة."
          );
        }

        setLessons(
          Array.isArray(lessonsData.lessons)
            ? lessonsData.lessons
            : []
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Load lessons error:", err);
          setError(err.message || "حدث خطأ أثناء تحميل الدروس.");
        }

        setLoading(false);
        return;
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }

      if (controller.signal.aborted) return;

      try {
        const progressResponse = await fetch(
          `${API_URL}/${course.id}/progress`,
          {
            credentials: "include",
            signal: controller.signal,
            cache: "no-store",
          }
        );

        if (progressResponse.status === 401) {
          setAuthRequired(true);
          setCompletedLessonIds([]);
          return;
        }

        const progressData = await progressResponse
          .json()
          .catch(() => ({}));

        if (!progressResponse.ok || !progressData.success) {
          throw new Error(
            progressData.message ||
              "تعذّر تحميل تقدّمك في الدورة."
          );
        }

        const completedIds = (
          progressData.lessons || []
        )
          .filter(
            (lesson) =>
              lesson.is_completed === true ||
              Number(lesson.is_completed) === 1
          )
          .map((lesson) => Number(lesson.id));

        setCompletedLessonIds(completedIds);
        setProgressError("");
        setAuthRequired(false);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Load progress error:", err);
          setProgressError(
            err.message || "تعذّر تحميل تقدّمك في الدورة."
          );
        }
      }
    }

    fetchCourseData();

    return () => controller.abort();
  }, [course?.id, retryCount]);

  // تحميل Quizات الدورة
  useEffect(() => {
    if (!course?.id) {
      setQuizzes([]);
      setQuizzesLoading(false);
      setQuizzesError("");
      return;
    }

    const controller = new AbortController();

    async function fetchQuizzes() {
      setQuizzesLoading(true);
      setQuizzesError("");

      try {
        const response = await fetch(
          `${QUIZ_API_URL}/course/${course.id}`,
          {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(
              "سجّلي الدخول أولًا حتى تتمكني من عرض Quizzes."
            );
          }

          throw new Error(
            data.message || "تعذّر تحميل Quizات الدورة."
          );
        }

        if (data.success === false) {
          throw new Error(
            data.message || "تعذّر تحميل Quizات الدورة."
          );
        }

        setQuizzes(
          Array.isArray(data.quizzes) ? data.quizzes : []
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Load quizzes error:", err);
          setQuizzesError(
            err.message || "حدث خطأ أثناء تحميل Quizzes."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setQuizzesLoading(false);
        }
      }
    }

    fetchQuizzes();

    return () => controller.abort();
  }, [course?.id, quizRetryCount]);

  // تسجيل إكمال الدرس وحفظه في قاعدة البيانات
  async function handleCompleteLesson(lessonId) {
    const numericLessonId = Number(lessonId);

    if (completingLessonId !== null) return;

    if (
      completedLessonIds.some(
        (id) => Number(id) === numericLessonId
      )
    ) {
      return;
    }

    setCompletingLessonId(numericLessonId);
    setSuccessMessage("");
    setProgressError("");

    try {
      const response = await fetch(
        `${API_URL}/${course.id}/lessons/${numericLessonId}/complete`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        setAuthRequired(true);
        throw new Error(
          "سجّلي الدخول أولًا حتى يتم حفظ تقدّمك."
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "تعذّر تسجيل إكمال الدرس."
        );
      }

      setCompletedLessonIds((previousIds) => {
        if (
          previousIds.some(
            (id) => Number(id) === numericLessonId
          )
        ) {
          return previousIds;
        }

        return [...previousIds, numericLessonId];
      });

      setAuthRequired(false);
      setProgressError("");
      setSuccessMessage(
        "🎉 أحسنتِ! تم حفظ إكمال الدرس بنجاح."
      );

      // إعادة تحميل Progress من قاعدة البيانات
      try {
        const progressResponse = await fetch(
          `${API_URL}/${course.id}/progress`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        if (progressResponse.status === 401) {
          setAuthRequired(true);
        } else if (progressResponse.ok) {
          const progressData = await progressResponse
            .json()
            .catch(() => ({}));

          if (progressData.success) {
            const savedIds = (
              progressData.lessons || []
            )
              .filter(
                (lesson) =>
                  lesson.is_completed === true ||
                  Number(lesson.is_completed) === 1
              )
              .map((lesson) => Number(lesson.id));

            setCompletedLessonIds(savedIds);
          }
        }
      } catch (refreshError) {
        console.error(
          "Refresh progress error:",
          refreshError
        );
      }
    } catch (err) {
      console.error("Complete lesson error:", err);
      setProgressError(
        err.message || "حدث خطأ أثناء حفظ تقدّمك."
      );
    } finally {
      setCompletingLessonId(null);
    }
  }

  // التحقق من وجود الدورة
  if (!course) {
    return (
      <div className="course-details-page" dir="rtl">
        <p>لم يتم العثور على الدورة.</p>

        <button type="button" onClick={onBack}>
          العودة إلى Home
        </button>
      </div>
    );
  }

  // حساب نسبة Progress
  const totalLessons = lessons.length;

  const completedCount = lessons.filter((lesson) =>
    completedLessonIds.some(
      (id) => Number(id) === Number(lesson.id)
    )
  ).length;

  const progressPercentage =
    totalLessons === 0
      ? 0
      : Math.round((completedCount / totalLessons) * 100);

  // عرض Lesson Content عند Selectه
  if (selectedLessonId !== null) {
    return (
      <LessonContent
        course={course}
        lessonId={selectedLessonId}
        lessons={lessons}
        completedLessonIds={completedLessonIds}
        onComplete={handleCompleteLesson}
        onBack={() => {
          setSelectedLessonId(null);
          setSuccessMessage("");
          setProgressError("");
        }}
        onSelectLesson={(id) => {
          setSelectedLessonId(Number(id));
          setSuccessMessage("");
          setProgressError("");
        }}
        authRequired={authRequired}
        completingLessonId={completingLessonId}
        progressError={progressError}
        successMessage={successMessage}
      />
    );
  }

  return (
    <main className="course-details-page" dir="rtl">
      <header className="details-header">
        <button
          type="button"
          className="details-back-btn"
          onClick={onBack}
        >
          → العودة إلى الدورات
        </button>

        <div className="details-brand">
          <span>⬡</span>
          CyberGuard Academy
        </div>
      </header>

      <section className="details-hero">
        <span className="details-kicker">
          CYBERGUARD ACADEMY
        </span>

        <div className="details-shield">🛡️</div>

        <h1>
          {course.title_ar ||
            course.title_en ||
            "دورة تعليمية"}
        </h1>

        {course.title_en && (
          <p className="details-title-en">
            {course.title_en}
          </p>
        )}

        <p className="details-description">
          {course.description_ar ||
            course.description_en ||
            "No course description is available yet."}
        </p>

        <div className="details-meta">
          <span>
            المستوى:{" "}
            {levelLabels[course.level] ||
              course.level ||
              "Not specified"}
          </span>

          <span>عدد الدروس: {totalLessons}</span>
        </div>
      </section>

      <section className="details-content">
        <div className="details-section-heading">
          <span>YOUR LEARNING JOURNEY</span>
          <h2>محتوى الدورة</h2>
          <p>
            اضغطي على أحد الدروس لفتح صفحة الشرح والبدء بالتعلّم.
          </p>
        </div>

        {!loading && !error && (
          <section
            className="course-progress"
            aria-label="تقدّم الدورة"
          >
            <div className="progress-top">
              <div>
                <h3>تقدّمك في الدورة</h3>
                <p>
                  أكملتِ {completedCount} من {totalLessons} دروس
                </p>
              </div>

              <strong className="progress-percentage">
                {progressPercentage}%
              </strong>
            </div>

            <div
              className="progress-track"
              role="progressbar"
              aria-valuenow={progressPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="نسبة إنجاز الدورة"
            >
              <div
                className="progress-fill"
                style={{
                  width: `${progressPercentage}%`,
                }}
              />
            </div>

            {progressPercentage === 100 &&
              totalLessons > 0 && (
                <p className="course-completed-message">
                  🎉 رائع! لقد أكملتِ جميع دروس الدورة.
                </p>
              )}
          </section>
        )}

        {loading && (
          <div className="lessons-message" role="status">
            <span className="loading-spinner" />
            جارٍ تحميل الدروس...
          </div>
        )}

        {!loading && error && (
          <div className="lessons-error" role="alert">
            <p>{error}</p>

            <button
              type="button"
              onClick={() =>
                setRetryCount((count) => count + 1)
              }
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && authRequired && (
          <div className="progress-notice" role="status">
            <p>
              يمكنكِ تصفّح الدروس، لكن سجّلي الدخول حتى نحفظ
              إنجازاتك ونربطها بحسابك.
            </p>
          </div>
        )}

        {!loading && !error && progressError && (
          <div className="lessons-error" role="alert">
            <p>{progressError}</p>

            <button
              type="button"
              onClick={() =>
                setRetryCount((count) => count + 1)
              }
            >
              إعادة تحميل Progress
            </button>
          </div>
        )}

        {!loading && !error && successMessage && (
          <div className="progress-success" role="status">
            {successMessage}
          </div>
        )}

        {!loading && !error && lessons.length === 0 && (
          <article className="lesson-placeholder">
            <div className="lesson-icon">📚</div>
            <div>
              <h3>لا توجد دروس حتى الآن</h3>
              <p>لم تتم إضافة دروس لهذه الدورة بعد.</p>
            </div>
          </article>
        )}

        {!loading && !error && lessons.length > 0 && (
          <div className="lessons-list">
            {lessons.map((lesson, index) => {
              const isCompleted = completedLessonIds.some(
                (id) => Number(id) === Number(lesson.id)
              );

              return (
                <article
                  className={`lesson-card ${
                    isCompleted
                      ? "lesson-card-completed"
                      : ""
                  }`}
                  key={lesson.id}
                >
                  <button
                    type="button"
                    className="lesson-card-header"
                    onClick={() =>
                      setSelectedLessonId(Number(lesson.id))
                    }
                    aria-label={`فتح الدرس ${
                      lesson.title_ar ||
                      lesson.title_en ||
                      index + 1
                    }`}
                  >
                    <span
                      className={`lesson-number ${
                        isCompleted
                          ? "lesson-number-completed"
                          : ""
                      }`}
                    >
                      {isCompleted
                        ? "✓"
                        : String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="lesson-heading-text">
                      <strong>
                        {lesson.title_ar ||
                          lesson.title_en ||
                          `الدرس ${index + 1}`}
                      </strong>

                      {lesson.title_en && (
                        <small>{lesson.title_en}</small>
                      )}

                      {isCompleted && (
                        <small className="completed-label">
                          تم إكمال الدرس
                        </small>
                      )}
                    </span>

                    <span className="lesson-chevron">←</span>
                  </button>
                </article>
              );
            })}
          </div>
        )}

        {/* Quizات الدورة */}
        <section className="course-quizzes">
          <div className="details-section-heading">
            <span>TEST YOUR KNOWLEDGE</span>
            <h2>Quizات الدورة</h2>
            <p>
              Test your knowledge وتحققي من مدى فهمك للمحتوى.
            </p>
          </div>

          {quizzesLoading && (
            <div className="lessons-message" role="status">
              <span className="loading-spinner" />
              جارٍ تحميل Quizzes...
            </div>
          )}

          {!quizzesLoading && quizzesError && (
            <div className="lessons-error" role="alert">
              <p>{quizzesError}</p>

              <button
                type="button"
                onClick={() =>
                  setQuizRetryCount((count) => count + 1)
                }
              >
                إعادة تحميل Quizzes
              </button>
            </div>
          )}

          {!quizzesLoading &&
            !quizzesError &&
            quizzes.length === 0 && (
              <article className="lesson-placeholder">
                <div className="lesson-icon">📝</div>
                <div>
                  <h3>لا توجد Quizات حاليًا</h3>
                  <p>
                    لم تتم إضافة Quizات لهذه الدورة بعد.
                  </p>
                </div>
              </article>
            )}

          {!quizzesLoading &&
            !quizzesError &&
            quizzes.length > 0 && (
              <div className="lessons-list">
                {quizzes.map((quiz) => (
                  <article
                    className="lesson-card"
                    key={quiz.id}
                  >
                    <div className="lesson-card-header">
                      <span className="lesson-number">
                        📝
                      </span>

                      <span className="lesson-heading-text">
                        <strong>
                          {quiz.title_ar ||
                            quiz.title_en ||
                            "Quiz الدورة"}
                        </strong>

                        {quiz.title_en && (
                          <small>{quiz.title_en}</small>
                        )}

                        <small>
                          Passing score:{" "}
                          {quiz.passing_score ?? 60}%
                        </small>
                      </span>

                      <button
                        type="button"
                        className="course-btn"
                        onClick={() => {
                          if (typeof onOpenQuiz === "function") {
                            onOpenQuiz({
                              ...quiz,
                              course_id:
                                quiz.course_id ?? course.id,
                              course_title_ar:
                                course.title_ar ||
                                course.title_en ||
                                "دورة تعليمية",
                              course_title_en:
                                course.title_en || "",
                            });
                          } else {
                            window.alert(
                              "تعذّر فتح الQuiz. ارجعي إلى Dashboard وتأكدي من تحديث Home.jsx."
                            );
                          }
                        }}
                      >
                        Start quiz ←
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
        </section>

        <button
          type="button"
          className="details-back-btn bottom-back-btn"
          onClick={onBack}
        >
          العودة إلى الدورات
        </button>
      </section>

      <footer className="details-footer">
        © 2026 CyberGuard Academy — تعلّمي اليوم، احمي الغد
      </footer>
    </main>
  );
}
