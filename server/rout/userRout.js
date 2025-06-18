import express from "express";
import { getAllUsers, getUserByUsernameOrEmail, getUserById } from "../routController/userController.js";
import isLogin from "../middleware/isLogin.js";

const router = express.Router();

// Route to get all users
router.get("/",isLogin,getAllUsers);

// Route to get a user by username or email
router.get("/search", getUserByUsernameOrEmail);

// Route to get a user by ID
router.get("/:id", getUserById);

export default router;