
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import pool from "../config/db.js";

const registerSchema = z.object({
  full_name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(190),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(190),
  password: z.string().min(1).max(72),
});

const updateProfileSchema = z.object({
  full_name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(190),
});

function createAuthToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      sub: String(user.id),
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

function setAuthCookie(res, token) {
  res.cookie("cg_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 1000,
    path: "/",
  });
}

function publicUser(user) {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    preferred_language: user.preferred_language,
  };
}

// إنشاء حساب جديد
export async function register(req, res) {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Please check your registration details.",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const fullName = result.data.full_name;
  const email = result.data.email.toLowerCase();
  const password = result.data.password;

  try {
    const [existingUsers] = await pool.execute(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [insertResult] = await pool.execute(
      `INSERT INTO users (full_name, email, password_hash)
       VALUES (?, ?, ?)`,
      [fullName, email, passwordHash]
    );

    const user = {
      id: insertResult.insertId,
      full_name: fullName,
      email,
      role: "student",
      preferred_language: "ar",
    };

    const token = createAuthToken(user);
    setAuthCookie(res, token);

    return res.status(201).json({
      message: "Account created successfully.",
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    console.error("Registration failed:", error.message);

    return res.status(500).json({
      message: "Could not create the account.",
    });
  }
}

// تسجيل الدخول
export async function login(req, res) {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Please enter a valid email and password.",
    });
  }

  const email = result.data.email.toLowerCase();
  const password = result.data.password;

  try {
    const [users] = await pool.execute(
      `SELECT id, full_name, email, password_hash,
              role, preferred_language, is_active
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    const user = users[0];

    if (
      !user ||
      !user.is_active ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const token = createAuthToken(user);
    setAuthCookie(res, token);

    return res.status(200).json({
      message: "Logged in successfully.",
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login failed:", error.message);

    return res.status(500).json({
      message: "Could not log in.",
    });
  }
}

// تسجيل الخروج
export function logout(req, res) {
  res.clearCookie("cg_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return res.status(200).json({
    message: "Logged out successfully.",
  });
}

// جلب بيانات الحساب الحالي
export async function getMe(req, res) {
  try {
    const [users] = await pool.execute(
      `SELECT id, full_name, email, role, preferred_language
       FROM users
       WHERE id = ? AND is_active = TRUE
       LIMIT 1`,
      [req.user.id]
    );

    if (users.length === 0) {
      res.clearCookie("cg_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });

      return res.status(401).json({
        message: "Please log in again.",
      });
    }

    return res.status(200).json({
      user: publicUser(users[0]),
    });
  } catch (error) {
    console.error("Profile lookup failed:", error.message);

    return res.status(500).json({
      message: "Could not retrieve your profile.",
    });
  }
}

// تحديث الملف الشخصي للمستخدم الحالي
export async function updateProfile(req, res) {
  const result = updateProfileSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "تحققي من الاسم والبريد الإلكتروني.",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const fullName = result.data.full_name;
  const email = result.data.email.toLowerCase();
  const userId = req.user.id;

  try {
    const [existingUsers] = await pool.execute(
      `SELECT id
       FROM users
       WHERE email = ? AND id <> ?
       LIMIT 1`,
      [email, userId]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "هذا البريد الإلكتروني مستخدم في حساب آخر.",
      });
    }

    const [updateResult] = await pool.execute(
      `UPDATE users
       SET full_name = ?, email = ?
       WHERE id = ? AND is_active = TRUE`,
      [fullName, email, userId]
    );

    // نتحقق من وجود الحساب حتى لو لم تتغير القيم
    const [users] = await pool.execute(
      `SELECT id, full_name, email, role, preferred_language
       FROM users
       WHERE id = ? AND is_active = TRUE
       LIMIT 1`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: "الحساب غير موجود أو غير نشط. سجّلي الدخول مجددًا.",
      });
    }

    return res.status(200).json({
      message: "تم تحديث الملف الشخصي بنجاح.",
      user: publicUser(users[0]),
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "هذا البريد الإلكتروني مستخدم في حساب آخر.",
      });
    }

    console.error("Profile update failed:", error.message);

    return res.status(500).json({
      message: "تعذّر تحديث الملف الشخصي.",
    });
  }
}
