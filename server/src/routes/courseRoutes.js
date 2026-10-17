
import { Router } from "express";
import pool from "../config/db.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

// ==========================================
// 1. عرض الدورات المنشورة فقط
// ==========================================
router.get("/", async (req, res) => {
  try {
    const [courses] = await pool.execute(
      `SELECT
        id,
        title_ar,
        title_en,
        description_ar,
        description_en,
        level,
        status,
        instructor_id,
        created_at
      FROM courses
      WHERE status = ?
      ORDER BY created_at DESC`,
      ["published"]
    );

    return res.json({
      success: true,
      count: courses.length,
      courses,
    });
  } catch (error) {
    console.error("Get courses error:", error.message);

    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحميل الدورات التعليمية",
    });
  }
});

// ==========================================
// 2. جلب دروس دورة محددة
// ==========================================
router.get("/:courseId/lessons", async (req, res) => {
  const courseId = Number(req.params.courseId);

  if (!Number.isInteger(courseId) || courseId <= 0) {
    return res.status(400).json({
      success: false,
      message: "رقم الدورة غير صالح",
    });
  }

  try {
    const [lessons] = await pool.execute(
      `SELECT
        id,
        course_id,
        title_ar,
        title_en,
        content_ar,
        content_en,
        video_url,
        sort_order,
        created_at
      FROM lessons
      WHERE course_id = ?
      ORDER BY sort_order ASC, id ASC`,
      [courseId]
    );

    return res.json({
      success: true,
      count: lessons.length,
      lessons,
    });
  } catch (error) {
    console.error("Get lessons error:", error.message);

    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحميل دروس الدورة",
    });
  }
});

// ==========================================
// 3. جلب محتوى درس محدد
// ==========================================
router.get(
  "/:courseId/lessons/:lessonId",
  async (req, res) => {
    const courseId = Number(req.params.courseId);
    const lessonId = Number(req.params.lessonId);

    if (
      !Number.isInteger(courseId) ||
      courseId <= 0 ||
      !Number.isInteger(lessonId) ||
      lessonId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "رقم الدورة أو الدرس غير صالح",
      });
    }

    try {
      const [lessons] = await pool.execute(
        `SELECT
          id,
          course_id,
          title_ar,
          title_en,
          content_ar,
          content_en,
          video_url,
          sort_order,
          created_at
        FROM lessons
        WHERE id = ? AND course_id = ?
        LIMIT 1`,
        [lessonId, courseId]
      );

      if (lessons.length === 0) {
        return res.status(404).json({
          success: false,
          message: "الدرس غير موجود ضمن هذه الدورة",
        });
      }

      return res.json({
        success: true,
        lesson: lessons[0],
      });
    } catch (error) {
      console.error("Get lesson content error:", error.message);

      return res.status(500).json({
        success: false,
        message: "حدث خطأ أثناء تحميل محتوى الدرس",
      });
    }
  }
);

// ==========================================
// 4. جلب تقدّم الطالب في دورة
// ==========================================
router.get("/:courseId/progress", requireAuth, async (req, res) => {
  const courseId = Number(req.params.courseId);
  const userId = req.user.id;

  if (!Number.isInteger(courseId) || courseId <= 0) {
    return res.status(400).json({
      success: false,
      message: "رقم الدورة غير صالح",
    });
  }

  try {
    const [lessons] = await pool.execute(
      `SELECT
        l.id,
        l.title_ar,
        l.title_en,
        l.sort_order,
        CASE
          WHEN lp.is_completed = 1 THEN TRUE
          ELSE FALSE
        END AS is_completed,
        lp.completed_at
      FROM lessons l
      LEFT JOIN lesson_progress lp
        ON lp.lesson_id = l.id
        AND lp.user_id = ?
      WHERE l.course_id = ?
      ORDER BY l.sort_order ASC, l.id ASC`,
      [userId, courseId]
    );

    const totalLessons = lessons.length;

    const completedLessons = lessons.filter(
      (lesson) => Boolean(lesson.is_completed)
    ).length;

    const percentage =
      totalLessons === 0
        ? 0
        : Math.round((completedLessons / totalLessons) * 100);

    return res.json({
      success: true,
      course_id: courseId,
      total_lessons: totalLessons,
      completed_lessons: completedLessons,
      percentage,
      lessons,
    });
  } catch (error) {
    console.error("Get course progress error:", error.message);

    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحميل تقدّم الدورة",
    });
  }
});

// ==========================================
// 5. تسجيل إكمال درس
// ==========================================
router.post(
  "/:courseId/lessons/:lessonId/complete",
  requireAuth,
  async (req, res) => {
    const courseId = Number(req.params.courseId);
    const lessonId = Number(req.params.lessonId);
    const userId = req.user.id;

    if (
      !Number.isInteger(courseId) ||
      courseId <= 0 ||
      !Number.isInteger(lessonId) ||
      lessonId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "رقم الدورة أو الدرس غير صالح",
      });
    }

    try {
      const [matchingLessons] = await pool.execute(
        `SELECT id
         FROM lessons
         WHERE id = ? AND course_id = ?
         LIMIT 1`,
        [lessonId, courseId]
      );

      if (matchingLessons.length === 0) {
        return res.status(404).json({
          success: false,
          message: "الدرس غير موجود ضمن هذه الدورة",
        });
      }

      await pool.execute(
        `INSERT INTO lesson_progress
          (user_id, lesson_id, is_completed, completed_at)
         VALUES (?, ?, 1, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE
          is_completed = 1,
          completed_at = COALESCE(
            completed_at,
            CURRENT_TIMESTAMP
          )`,
        [userId, lessonId]
      );

      return res.json({
        success: true,
        message: "تم تسجيل إكمال الدرس بنجاح",
        lesson_id: lessonId,
      });
    } catch (error) {
      console.error("Complete lesson error:", error.message);

      return res.status(500).json({
        success: false,
        message: "حدث خطأ أثناء تسجيل إكمال الدرس",
      });
    }
  }
);

export default router;
