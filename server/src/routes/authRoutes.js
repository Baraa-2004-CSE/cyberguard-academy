
import { Router } from "express";

import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
} from "../controllers/authController.js";

import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

router.get("/me", requireAuth, getMe);

// تحديث بيانات المستخدم المسجل دخوله
router.patch("/profile", requireAuth, updateProfile);

export default router;
