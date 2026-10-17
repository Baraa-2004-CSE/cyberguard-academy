
import { Router } from "express";
import pool from "../config/db.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

// 1. عرض اختبارات دورة محددة
router.get("/course/:courseId", requireAuth, async (req, res) => {
  const courseId = Number(req.params.courseId);

  if (!Number.isInteger(courseId) || courseId <= 0) {
    return res.status(400).json({
      success: false,
      message: "رقم الدورة غير صالح",
    });
  }

  try {
    const [quizzes] = await pool.execute(
      `SELECT
         q.id,
         q.course_id,
         q.title_ar,
         q.title_en,
         q.passing_score,
         q.created_at
       FROM quizzes q
       INNER JOIN courses c ON c.id = q.course_id
       WHERE q.course_id = ?
         AND c.status = 'published'
       ORDER BY q.id ASC`,
      [courseId]
    );

    return res.json({
      success: true,
      count: quizzes.length,
      quizzes,
    });
  } catch (error) {
    console.error("Get course quizzes error:", error.message);

    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحميل الاختبارات",
    });
  }
});

// 2. سجل محاولات الاختبارات للمستخدم الحالي
router.get("/my-attempts", requireAuth, async (req, res) => {
  const userId = req.user.id;

  try {
    const [attempts] = await pool.execute(
      `SELECT
         qa.id AS attempt_id,
         qa.quiz_id,
         qa.score,
         qa.started_at,
         qa.submitted_at,
         q.title_ar AS quiz_title_ar,
         q.title_en AS quiz_title_en,
         q.passing_score,
         c.id AS course_id,
         c.title_ar AS course_title_ar,
         c.title_en AS course_title_en
       FROM quiz_attempts qa
       INNER JOIN quizzes q ON q.id = qa.quiz_id
       INNER JOIN courses c ON c.id = q.course_id
       WHERE qa.user_id = ?
         AND qa.submitted_at IS NOT NULL
       ORDER BY qa.submitted_at DESC, qa.id DESC`,
      [userId]
    );

    return res.json({
      success: true,
      count: attempts.length,
      attempts,
    });
  } catch (error) {
    console.error("Get quiz attempts error:", error.message);

    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحميل سجل الاختبارات",
    });
  }
});

// 3. عرض أسئلة اختبار وخياراتها دون كشف الإجابات الصحيحة
router.get("/:quizId", requireAuth, async (req, res) => {
  const quizId = Number(req.params.quizId);

  if (!Number.isInteger(quizId) || quizId <= 0) {
    return res.status(400).json({
      success: false,
      message: "رقم الاختبار غير صالح",
    });
  }

  try {
    const [quizzes] = await pool.execute(
      `SELECT
         id,
         course_id,
         title_ar,
         title_en,
         passing_score
       FROM quizzes
       WHERE id = ?
       LIMIT 1`,
      [quizId]
    );

    if (quizzes.length === 0) {
      return res.status(404).json({
        success: false,
        message: "الاختبار غير موجود",
      });
    }

    const [questions] = await pool.execute(
      `SELECT
         id,
         quiz_id,
         question_ar,
         question_en,
         question_type,
         points,
         sort_order
       FROM questions
       WHERE quiz_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [quizId]
    );

    const [options] = await pool.execute(
      `SELECT
         qo.id,
         qo.question_id,
         qo.option_ar,
         qo.option_en,
         qo.sort_order
       FROM question_options qo
       INNER JOIN questions q ON q.id = qo.question_id
       WHERE q.quiz_id = ?
       ORDER BY qo.sort_order ASC, qo.id ASC`,
      [quizId]
    );

    const questionsWithOptions = questions.map((question) => ({
      ...question,
      options: options.filter(
        (option) =>
          Number(option.question_id) === Number(question.id)
      ),
    }));

    return res.json({
      success: true,
      quiz: quizzes[0],
      count: questions.length,
      questions: questionsWithOptions,
    });
  } catch (error) {
    console.error("Get quiz details error:", error.message);

    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحميل تفاصيل الاختبار",
    });
  }
});

// 4. تسليم الإجابات وتصحيح الاختبار وحفظ النتيجة
router.post("/:quizId/submit", requireAuth, async (req, res) => {
  const quizId = Number(req.params.quizId);
  const userId = req.user.id;
  const answers = req.body?.answers;

  if (!Number.isInteger(quizId) || quizId <= 0) {
    return res.status(400).json({
      success: false,
      message: "رقم الاختبار غير صالح",
    });
  }

  if (!Array.isArray(answers)) {
    return res.status(400).json({
      success: false,
      message: "يجب إرسال الإجابات داخل مصفوفة answers",
    });
  }

  // التحقق من تنسيق الإجابات ومنع تكرار السؤال
  const seenQuestions = new Set();

  for (const answer of answers) {
    const questionId = Number(answer?.question_id);

    const optionId =
      answer?.selected_option_id == null
        ? null
        : Number(answer.selected_option_id);

    if (
      !Number.isInteger(questionId) ||
      questionId <= 0 ||
      (optionId !== null &&
        (!Number.isInteger(optionId) || optionId <= 0))
    ) {
      return res.status(400).json({
        success: false,
        message: "تنسيق إحدى الإجابات غير صحيح",
      });
    }

    if (seenQuestions.has(questionId)) {
      return res.status(400).json({
        success: false,
        message: "لا يمكن إرسال إجابتين للسؤال نفسه",
      });
    }

    seenQuestions.add(questionId);
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [quizzes] = await connection.execute(
      `SELECT id, course_id, passing_score
       FROM quizzes
       WHERE id = ?
       LIMIT 1`,
      [quizId]
    );

    if (quizzes.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "الاختبار غير موجود",
      });
    }

    const quiz = quizzes[0];

    const [questions] = await connection.execute(
      `SELECT id, points
       FROM questions
       WHERE quiz_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [quizId]
    );

    if (questions.length === 0) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "لا يمكن تسليم اختبار لا يحتوي على أسئلة",
      });
    }

    // التأكد أن كل سؤال مُرسل تابع للاختبار
    const questionMap = new Map(
      questions.map((question) => [
        Number(question.id),
        question,
      ])
    );

    for (const answer of answers) {
      if (!questionMap.has(Number(answer.question_id))) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message: "توجد إجابة لسؤال لا يتبع هذا الاختبار",
        });
      }
    }

    // إنشاء محاولة جديدة
    const [attemptResult] = await connection.execute(
      `INSERT INTO quiz_attempts
         (user_id, quiz_id, score, started_at, submitted_at)
       VALUES (?, ?, NULL, CURRENT_TIMESTAMP, NULL)`,
      [userId, quizId]
    );

    const attemptId = attemptResult.insertId;

    // ربط كل إجابة بالسؤال الذي تخصه
    const submittedAnswers = new Map(
      answers.map((answer) => [
        Number(answer.question_id),
        answer.selected_option_id == null
          ? null
          : Number(answer.selected_option_id),
      ])
    );

    let totalPoints = 0;
    let earnedPoints = 0;
    let answeredQuestions = 0;

    for (const question of questions) {
      const questionId = Number(question.id);
      const points = Number(question.points);

      const selectedOptionId = submittedAnswers.has(questionId)
        ? submittedAnswers.get(questionId)
        : null;

      totalPoints += points;

      let isCorrect = 0;
      let earned = 0;

      if (selectedOptionId !== null) {
        // التحقق من أن الخيار تابع للسؤال وقراءة صحته من قاعدة البيانات
        const [matchingOptions] = await connection.execute(
          `SELECT id, is_correct
           FROM question_options
           WHERE id = ? AND question_id = ?
           LIMIT 1`,
          [selectedOptionId, questionId]
        );

        if (matchingOptions.length === 0) {
          await connection.rollback();

          return res.status(400).json({
            success: false,
            message: "أحد الخيارات لا يتبع السؤال المحدد",
          });
        }

        answeredQuestions++;

        isCorrect =
          Number(matchingOptions[0].is_correct) === 1 ? 1 : 0;

        earned = isCorrect ? points : 0;
      }

      earnedPoints += earned;

      await connection.execute(
        `INSERT INTO attempt_answers
           (attempt_id, question_id, selected_option_id,
            is_correct, earned_points)
         VALUES (?, ?, ?, ?, ?)`,
        [
          attemptId,
          questionId,
          selectedOptionId,
          isCorrect,
          earned.toFixed(2),
        ]
      );
    }

    const score =
      totalPoints > 0
        ? Number(((earnedPoints / totalPoints) * 100).toFixed(2))
        : 0;

    await connection.execute(
      `UPDATE quiz_attempts
       SET score = ?, submitted_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [score, attemptId, userId]
    );

    await connection.commit();

    return res.json({
      success: true,
      message: "تم تسليم الاختبار وتصحيح الإجابات بنجاح",
      result: {
        attempt_id: attemptId,
        score,
        total_points: Number(totalPoints.toFixed(2)),
        earned_points: Number(earnedPoints.toFixed(2)),
        passing_score: Number(quiz.passing_score),
        passed: score >= Number(quiz.passing_score),
        total_questions: questions.length,
        answered_questions: answeredQuestions,
      },
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Quiz rollback error:",
          rollbackError.message
        );
      }
    }

    console.error("Submit quiz error:", error.message);

    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تصحيح الاختبار وحفظ النتيجة",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

export default router;
