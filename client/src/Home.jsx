
import { useEffect, useState } from "react";
import "./Home.css";
import CourseDetails from "./CourseDetails";
import QuizPage from "./QuizPage";
import Achievements from "./Achievements";
import Profile from "./Profile";

const API_URL = "http://localhost:5000/api/courses";
const QUIZ_API_URL = "http://localhost:5000/api/quizzes";

const labs = [
  {
    title: "مختبر تحليل الشبكات",
    description: "تعرّفي على حركة الشبكة وتحليل الحزم.",
    icon: "🔬",
  },
  {
    title: "مختبر حقن SQL",
    description: "تعلّمي اكتشاف ثغرات SQL Injection في بيئة تدريبية.",
    icon: "⌨️",
  },
  {
    title: "مختبر التشفير",
    description: "اكتشفي أساسيات التشفير وحماية البيانات.",
    icon: "🔐",
  },
];

const navigation = [
  { label: "الرئيسية", icon: "⌂" },
  { label: "الدورات التعليمية", icon: "▤" },
  { label: "المختبرات العملية", icon: "⚗" },
  { label: "الاختبارات", icon: "☑" },
  { label: "إنجازاتي", icon: "🏆" },
  { label: "الملف الشخصي", icon: "♙" },
];

const courseStyles = [
  { icon: "🛡️", color: "cyan" },
  { icon: "🌐", color: "blue" },
  { icon: "💻", color: "purple" },
];

const levelLabels = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
};

export default function Home({ user, onLogout }) {
  const [currentUser, setCurrentUser] = useState(user);

  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [coursesError, setCoursesError] = useState("");

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  const [showAchievements, setShowAchievements] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const [activeSection, setActiveSection] = useState("الرئيسية");

  const [quizzes, setQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [quizzesError, setQuizzesError] = useState("");
  const [quizRetryCount, setQuizRetryCount] = useState(0);

  // تحديث بيانات المستخدم عند تغيّرها من المكوّن الأب
  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  // تحميل الدورات ونسبة التقدم
  async function fetchCourses() {
    try {
      setLoadingCourses(true);
      setCoursesError("");

      const response = await fetch(API_URL, {
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "تعذّر تحميل الدورات التعليمية."
        );
      }

      const coursesList = Array.isArray(data.courses)
        ? data.courses
        : [];

      const coursesWithProgress = await Promise.all(
        coursesList.map(async (course) => {
          try {
            const progressResponse = await fetch(
              `${API_URL}/${course.id}/progress`,
              {
                credentials: "include",
                cache: "no-store",
              }
            );

            if (!progressResponse.ok) {
              return {
                ...course,
                progressPercentage: 0,
                completedLessons: 0,
                totalLessons: 0,
                progressAvailable: false,
              };
            }

            const progressData = await progressResponse
              .json()
              .catch(() => ({}));

            if (!progressData.success) {
              return {
                ...course,
                progressPercentage: 0,
                completedLessons: 0,
                totalLessons: 0,
                progressAvailable: false,
              };
            }

            const completedLessons =
              Number(progressData.completed_lessons) || 0;

            const totalLessons =
              Number(progressData.total_lessons) || 0;

            const progressPercentage =
              totalLessons > 0
                ? Math.round(
                    (completedLessons / totalLessons) * 100
                  )
                : 0;

            return {
              ...course,
              progressPercentage,
              completedLessons,
              totalLessons,
              progressAvailable: true,
            };
          } catch (error) {
            console.error(
              `Progress error for course ${course.id}:`,
              error
            );

            return {
              ...course,
              progressPercentage: 0,
              completedLessons: 0,
              totalLessons: 0,
              progressAvailable: false,
            };
          }
        })
      );

      setCourses(coursesWithProgress);
    } catch (error) {
      console.error("Fetch courses error:", error);

      setCoursesError(
        error.message ||
          "تعذّر تحميل الدورات. تأكدي من تشغيل السيرفر."
      );
    } finally {
      setLoadingCourses(false);
    }
  }

  useEffect(() => {
    fetchCourses();
  }, []);

  // تحميل الاختبارات التابعة للدورات
  useEffect(() => {
    if (loadingCourses) return;

    if (courses.length === 0) {
      setQuizzes([]);
      setQuizzesError("");
      setLoadingQuizzes(false);
      return;
    }

    const controller = new AbortController();

    async function fetchAllQuizzes() {
      setLoadingQuizzes(true);
      setQuizzesError("");

      try {
        const quizLists = await Promise.all(
          courses.map(async (course) => {
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
                  "انتهت جلسة تسجيل الدخول. سجّلي الدخول مجددًا لعرض الاختبارات."
                );
              }

              throw new Error(
                data.message ||
                  `تعذّر تحميل اختبارات دورة ${
                    course.title_ar ||
                    course.title_en ||
                    course.id
                  }.`
              );
            }

            if (data.success === false) {
              throw new Error(
                data.message || "تعذّر تحميل الاختبارات."
              );
            }

            const courseQuizzes = Array.isArray(data.quizzes)
              ? data.quizzes
              : [];

            return courseQuizzes.map((quiz) => ({
              ...quiz,
              course_id: quiz.course_id ?? course.id,
              course_title_ar:
                course.title_ar ||
                course.title_en ||
                "دورة تعليمية",
              course_title_en: course.title_en || "",
            }));
          })
        );

        if (controller.signal.aborted) return;

        const allQuizzes = quizLists
          .flat()
          .sort((a, b) => Number(a.id) - Number(b.id));

        setQuizzes(allQuizzes);
        setQuizzesError("");
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Fetch all quizzes error:", error);

          setQuizzesError(
            error.message || "حدث خطأ أثناء تحميل الاختبارات."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingQuizzes(false);
        }
      }
    }

    fetchAllQuizzes();

    return () => controller.abort();
  }, [courses, loadingCourses, quizRetryCount]);

  // عدد الدورات المكتملة بالكامل
  const completedCoursesCount = courses.filter(
    (course) =>
      course.progressAvailable &&
      Number(course.progressPercentage) === 100
  ).length;

  // التنقل بين الصفحات والأقسام
  const scrollToSection = (label) => {
    setActiveSection(label);

    if (label === "الملف الشخصي") {
      setSelectedCourse(null);
      setSelectedQuiz(null);
      setShowAchievements(false);
      setShowProfile(true);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    if (label === "إنجازاتي") {
      setSelectedCourse(null);
      setSelectedQuiz(null);
      setShowProfile(false);
      setShowAchievements(true);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    if (label === "الرئيسية") {
      setSelectedCourse(null);
      setSelectedQuiz(null);
      setShowAchievements(false);
      setShowProfile(false);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    const sectionIds = {
      "الدورات التعليمية": "courses",
      "المختبرات العملية": "labs",
      "الاختبارات": "quizzes",
    };

    const sectionId = sectionIds[label];

    if (sectionId) {
      setShowAchievements(false);
      setShowProfile(false);
      setSelectedCourse(null);
      setSelectedQuiz(null);

      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 0);
    }
  };

  // فتح الاختبار
  const openQuiz = (quiz) => {
    setShowAchievements(false);
    setShowProfile(false);
    setSelectedCourse(null);
    setSelectedQuiz(quiz);
    setActiveSection("الاختبارات");

    window.scrollTo({
      top: 0,
      behavior: "instant",
    });
  };

  // الرجوع من الاختبار
  const closeQuiz = () => {
    setSelectedQuiz(null);
    setActiveSection("الاختبارات");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // الرجوع من صفحة الإنجازات
  const closeAchievements = () => {
    setShowAchievements(false);
    setActiveSection("الرئيسية");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // الرجوع من الملف الشخصي
  const closeProfile = () => {
    setShowProfile(false);
    setActiveSection("الرئيسية");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // صفحة الإنجازات
  if (showAchievements) {
    return <Achievements onBack={closeAchievements} />;
  }

  // صفحة الملف الشخصي مع تحديث بيانات المستخدم بعد الحفظ
  if (showProfile) {
    return (
      <Profile
        user={currentUser}
        onProfileUpdated={setCurrentUser}
        onBack={closeProfile}
      />
    );
  }

  // صفحة الاختبار
  if (selectedQuiz) {
    return (
      <QuizPage
        quiz={selectedQuiz}
        onBack={closeQuiz}
      />
    );
  }

  // تفاصيل الدورة
  if (selectedCourse) {
    return (
      <CourseDetails
        course={selectedCourse}
        onBack={() => {
          setSelectedCourse(null);
          setActiveSection("الدورات التعليمية");
          fetchCourses();
        }}
        onOpenQuiz={openQuiz}
      />
    );
  }

  return (
    <div className="dashboard" dir="rtl">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">⬡</div>
          <div>
            <h2>CyberGuard</h2>
            <span>ACADEMY</span>
          </div>
        </div>

        <div className="sidebar-label">القائمة الرئيسية</div>

        <nav className="side-nav">
          {navigation.map((item) => (
            <button
              type="button"
              key={item.label}
              className={`nav-item ${
                activeSection === item.label ? "active" : ""
              }`}
              onClick={() => scrollToSection(item.label)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>

              {activeSection === item.label && (
                <span className="nav-indicator" />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-quote">
          <div className="quote-shield">🛡️</div>
          <p>
            الأمان السيبراني ليس مجرد تقنية، بل أسلوب حياة.
          </p>
          <span>STAY SAFE. STAY AWARE.</span>
        </div>

        <button
          type="button"
          className="sidebar-logout"
          onClick={onLogout}
        >
          <span>⇥</span>
          تسجيل الخروج
        </button>
      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          <div className="breadcrumb">
            <span>لوحة التحكم</span>
            <span className="breadcrumb-dot">/</span>
            <strong>{activeSection}</strong>
          </div>

          <div className="topbar-user">
            <div className="notification">
              ♧<i />
            </div>

            <div className="user-avatar">
              {(currentUser?.full_name || "م").charAt(0)}
            </div>

            <div className="user-info">
              <strong>
                {currentUser?.full_name || "متعلّمنا"}
              </strong>
              <span>متعلّم في CyberGuard</span>
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          {/* الترحيب */}
          <section className="welcome-banner">
            <div className="welcome-content">
              <span className="welcome-label">
                <span className="status-dot" />
                مساحة تعلّمك الآمنة
              </span>

              <h1>
                أهلًا وسهلًا،{" "}
                <span>
                  {currentUser?.full_name || "متعلّمنا"}
                </span>
              </h1>

              <p>
                رحلتك في عالم الأمن السيبراني تبدأ من هنا.
                تعلّمي، تدرّبي، وطوّري مهاراتك خطوة بخطوة.
              </p>

              <button
                type="button"
                className="primary-btn"
                onClick={() =>
                  scrollToSection("الدورات التعليمية")
                }
              >
                اكتشفي الدورات <span>←</span>
              </button>
            </div>

            <div className="welcome-art" aria-hidden="true">
              <div className="art-ring ring-one" />
              <div className="art-ring ring-two" />
              <div className="shield-art">🛡️</div>
              <div className="art-caption">
                YOUR DIGITAL WORLD, PROTECTED
              </div>
            </div>
          </section>

          {/* الإحصائيات */}
          <section className="stats-grid">
            <article className="stat-card">
              <div className="stat-icon cyan-bg">▤</div>
              <div>
                <span>الدورات المكتملة</span>
                <strong>{completedCoursesCount}</strong>
                <small>
                  {completedCoursesCount > 0
                    ? "أحسنتِ، واصلي التعلّم!"
                    : "ابدئي أول دورة لكِ"}
                </small>
              </div>
            </article>

            <article className="stat-card">
              <div className="stat-icon blue-bg">⚗</div>
              <div>
                <span>المختبرات المنجزة</span>
                <strong>0</strong>
                <small>التطبيق يصنع الفرق</small>
              </div>
            </article>

            <article className="stat-card">
              <div className="stat-icon purple-bg">☑</div>
              <div>
                <span>الاختبارات المتاحة</span>
                <strong>
                  {loadingQuizzes ? "…" : quizzes.length}
                </strong>
                <small>اختبري معلوماتك</small>
              </div>
            </article>

            <article className="stat-card">
              <div className="stat-icon orange-bg">🏆</div>
              <div>
                <span>الإنجازات</span>
                <strong>—</strong>
                <small>راجعي صفحة إنجازاتي</small>
              </div>
            </article>
          </section>

          {/* الدورات التعليمية */}
          <section className="content-section" id="courses">
            <div className="section-heading">
              <div>
                <span className="section-kicker">
                  LEARN &amp; GROW
                </span>
                <h2>الدورات التعليمية</h2>
                <p>
                  ابني أساسك في الأمن السيبراني وابدئي
                  التعلّم من اليوم.
                </p>
              </div>

              <span className="section-count">
                {loadingCourses
                  ? "جارٍ التحميل..."
                  : `${String(courses.length).padStart(2, "0")} دورات`}
              </span>
            </div>

            {loadingCourses ? (
              <p className="courses-message" role="status">
                جارٍ تحميل الدورات التعليمية...
              </p>
            ) : coursesError ? (
              <div className="courses-message" role="alert">
                <p>{coursesError}</p>
                <button
                  type="button"
                  className="course-btn"
                  onClick={fetchCourses}
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : courses.length === 0 ? (
              <p className="courses-message">
                لا توجد دورات منشورة حاليًا. ستظهر الدورات
                هنا عند إضافتها إلى المنصة.
              </p>
            ) : (
              <div className="courses-grid">
                {courses.map((course, index) => {
                  const style =
                    courseStyles[index % courseStyles.length];

                  const level =
                    levelLabels[course.level] ||
                    course.level ||
                    "غير محدد";

                  const progress =
                    Number(course.progressPercentage) || 0;

                  return (
                    <article
                      className="course-card"
                      key={course.id}
                    >
                      <div
                        className={`course-visual ${style.color}`}
                      >
                        <span className="course-number">
                          COURSE{" "}
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <span className="course-illustration">
                          {style.icon}
                        </span>

                        <span className="level-badge">
                          {level}
                        </span>
                      </div>

                      <div className="course-body">
                        <h3>
                          {course.title_ar ||
                            course.title_en ||
                            "دورة تعليمية"}
                        </h3>

                        <p>
                          {course.description_ar ||
                            course.description_en ||
                            "لا يوجد وصف لهذه الدورة حاليًا."}
                        </p>

                        <div className="course-meta">
                          <span>التقدم</span>
                          <strong>{progress}%</strong>
                        </div>

                        <div
                          className="progress-track"
                          role="progressbar"
                          aria-valuenow={progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`نسبة إكمال دورة ${
                            course.title_ar || course.title_en
                          }`}
                        >
                          <div
                            style={{
                              width: `${progress}%`,
                              transition: "width 0.4s ease",
                            }}
                          />
                        </div>

                        {course.progressAvailable &&
                          progress === 100 && (
                            <p className="course-completed-message">
                              ✓ أكملتِ هذه الدورة بنجاح!
                            </p>
                          )}

                        {!course.progressAvailable && (
                          <small className="progress-load-notice">
                            تعذّر تحميل التقدّم حاليًا.
                          </small>
                        )}

                        <button
                          type="button"
                          className="course-btn"
                          onClick={() => {
                            setShowAchievements(false);
                            setShowProfile(false);
                            setActiveSection("الدورات التعليمية");
                            setSelectedCourse(course);
                          }}
                        >
                          {progress === 100
                            ? "مراجعة الدورة"
                            : "ابدئي التعلّم"}{" "}
                          <span>←</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* المختبرات العملية */}
          <section className="content-section" id="labs">
            <div className="section-heading">
              <div>
                <span className="section-kicker">
                  PRACTICE ZONE
                </span>
                <h2>المختبرات العملية</h2>
                <p>
                  تدرّبي على مهاراتك في بيئات تعليمية آمنة.
                </p>
              </div>

              <span className="section-count">03 مختبرات</span>
            </div>

            <div className="labs-grid">
              {labs.map((lab, index) => (
                <article className="lab-card" key={lab.title}>
                  <div className={`lab-icon lab-color-${index}`}>
                    {lab.icon}
                  </div>

                  <div className="lab-info">
                    <h3>{lab.title}</h3>
                    <p>{lab.description}</p>
                    <span className="lab-status">
                      متاح قريبًا
                    </span>
                  </div>

                  <span className="lab-arrow">←</span>
                </article>
              ))}
            </div>
          </section>

          {/* الاختبارات */}
          <section className="content-section" id="quizzes">
            <div className="section-heading">
              <div>
                <span className="section-kicker">
                  TEST YOUR KNOWLEDGE
                </span>
                <h2>الاختبارات</h2>
                <p>
                  جميع الاختبارات المنشورة على المنصة،
                  مع الدورة التابعة لكل اختبار.
                </p>
              </div>

              <span className="section-count">
                {loadingQuizzes
                  ? "جارٍ التحميل..."
                  : `${String(quizzes.length).padStart(2, "0")} اختبارات`}
              </span>
            </div>

            {loadingQuizzes ? (
              <div className="courses-message" role="status">
                جارٍ تحميل جميع الاختبارات...
              </div>
            ) : quizzesError ? (
              <div className="courses-message" role="alert">
                <p>{quizzesError}</p>
                <button
                  type="button"
                  className="course-btn"
                  onClick={() =>
                    setQuizRetryCount((count) => count + 1)
                  }
                >
                  إعادة تحميل الاختبارات
                </button>
              </div>
            ) : quizzes.length === 0 ? (
              <div className="courses-message">
                <p>📝 لا توجد اختبارات متاحة حاليًا.</p>
                <p>
                  عند إضافة اختبارات إلى الدورات المنشورة،
                  ستظهر هنا تلقائيًا.
                </p>
              </div>
            ) : (
              <div className="courses-grid">
                {quizzes.map((quiz) => (
                  <article
                    className="course-card quiz-card"
                    key={quiz.id}
                  >
                    <div className="course-visual purple">
                      <span className="course-number">
                        QUIZ {String(quiz.id).padStart(2, "0")}
                      </span>

                      <span className="course-illustration">
                        📝
                      </span>

                      <span className="level-badge">
                        اختبار
                      </span>
                    </div>

                    <div className="course-body">
                      <h3>
                        {quiz.title_ar ||
                          quiz.title_en ||
                          `الاختبار ${quiz.id}`}
                      </h3>

                      {quiz.title_en && (
                        <p>{quiz.title_en}</p>
                      )}

                      <div className="quiz-course-info">
                        <span>📚 الدورة التابعة</span>
                        <strong>
                          {quiz.course_title_ar ||
                            quiz.course_title_en ||
                            `الدورة رقم ${quiz.course_id}`}
                        </strong>
                      </div>

                      <div className="course-meta">
                        <span>علامة النجاح</span>
                        <strong>
                          {quiz.passing_score ?? 60}%
                        </strong>
                      </div>

                      <button
                        type="button"
                        className="course-btn"
                        onClick={() => openQuiz(quiz)}
                      >
                        ابدئي الاختبار <span>←</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* المزايا القادمة */}
          <section className="coming-soon" id="coming-soon">
            <div className="coming-icon">✦</div>

            <div>
              <h3>خطوتك القادمة نحو الاحتراف</h3>
              <p>
                قريبًا: تتبّع إنجازاتك، وشارات التميّز،
                وميزات إضافية تساعدك على متابعة رحلتك التعليمية.
              </p>
            </div>
          </section>

          {/* التذييل */}
          <footer className="dashboard-footer">
            <span>© 2026 CyberGuard Academy</span>
            <span>تعلّمي اليوم، احمي الغد 🛡️</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
