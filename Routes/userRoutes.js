 import express from "express";
import asyncHandler from "express-async-handler"; 
import User from "../models/userModels.js";
import generateToken from "../utils/generateToken.js";
import { protect, admin } from "../middleware/AuthMiddleware.js";

const userRouter = express.Router();

// =======================
// LOGIN par email ou numéro
// =======================
userRouter.post("/login", asyncHandler(async (req, res) => {
    const { emailOrPhone, password } = req.body;

    if (!emailOrPhone || !password) {
        res.status(400);
        throw new Error("Email/Numéro et mot de passe requis");
    }

    // Détecter si c'est un email ou un numéro
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrPhone);
    const query = isEmail ? { email: emailOrPhone } : { phone: emailOrPhone };

    const user = await User.findOne(query);

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email || null,
            phone: user.phone || null,
            isAdmin: user.isAdmin,
            role: user.role,
            token: generateToken(user._id),
            createdAt: user.createdAt,
        });
    } else {
        res.status(401);
        throw new Error("Email/Numéro ou mot de passe incorrect");
    }
}));

// =======================
// REGISTER CITOYEN (public) par email ou numéro
// =======================
userRouter.post("/register", asyncHandler(async (req, res) => {
    const { name, emailOrPhone, password } = req.body;

    if (!name || !emailOrPhone || !password) {
        res.status(400);
        throw new Error("Tous les champs sont requis");
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrPhone);
    const query = isEmail ? { email: emailOrPhone } : { phone: emailOrPhone };

    const userExists = await User.findOne(query);
    if (userExists) {
        res.status(400);
        throw new Error(isEmail ? "Email déjà utilisé" : "Numéro déjà utilisé");
    }

    const userData = { name, password, role: "citoyen" };
    if (isEmail) userData.email = emailOrPhone;
    else userData.phone = emailOrPhone;

    const user = await User.create(userData);

    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email || null,
            phone: user.phone || null,
            isAdmin: user.isAdmin,
            role: user.role,
            createdAt: user.createdAt,
            token: generateToken(user._id),
        });
    } else {
        res.status(400);
        throw new Error("Impossible de créer l'utilisateur");
    }
}));

// =======================
// REGISTER USER (ADMIN crée agent ou citoyen)
// =======================
userRouter.post(
  "/create",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    try {
      const { name, emailOrPhone, password, role } = req.body;

      if (!name || !emailOrPhone || !password || !role) {
        return res.status(400).json({ message: "Tous les champs sont requis" });
      }

      if (!["agent", "citoyen"].includes(role)) {
        return res.status(400).json({ message: "Role invalide. Choisir 'agent' ou 'citoyen'" });
      }

      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrPhone);
      const query = isEmail ? { email: emailOrPhone } : { phone: emailOrPhone };

      const userExists = await User.findOne(query);
      if (userExists) {
        return res.status(400).json({ message: isEmail ? "Email déjà utilisé" : "Numéro déjà utilisé" });
      }

      const userData = { name, password, role };
      if (isEmail) userData.email = emailOrPhone;
      else userData.phone = emailOrPhone;

      const user = await User.create(userData);

      if (user) {
        res.status(201).json({
          _id: user._id,
          name: user.name,
          email: user.email || null,
          phone: user.phone || null,
          isAdmin: user.isAdmin,
          role: user.role,
          createdAt: user.createdAt,
        });
      } else {
        res.status(400).json({ message: "Impossible de créer l'utilisateur" });
      }
    } catch (error) {
      console.error("Erreur création utilisateur:", error);
      res.status(500).json({ message: "Erreur serveur. Veuillez réessayer." });
    }
  })
);

// =======================
// PROFILE
// =======================
userRouter.get("/profile", protect, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email || null,
            phone: user.phone || null,
            isAdmin: user.isAdmin,
            role: user.role,
            createdAt: user.createdAt,
        });
    } else {
        res.status(404);
        throw new Error("User not found");
    }
}));

// =======================
// UPDATE PROFILE
// =======================
userRouter.put("/profile", protect, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.name = req.body.name || user.name;
        if (req.body.emailOrPhone) {
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.emailOrPhone);
            if (isEmail) user.email = req.body.emailOrPhone;
            else user.phone = req.body.emailOrPhone;
        }
        if (req.user.isAdmin && req.body.role) user.role = req.body.role;
        if (req.body.password) user.password = req.body.password;

        const updatedUser = await user.save();
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email || null,
            phone: updatedUser.phone || null,
            isAdmin: updatedUser.isAdmin,
            role: updatedUser.role,
            createdAt: updatedUser.createdAt,
            token: generateToken(updatedUser._id),
        });
    } else {
        res.status(404);
        throw new Error("User not found");
    }
}));

// =======================
// GET ALL USERS (Admin only)
// =======================
userRouter.get("/", protect, admin, asyncHandler(async (req, res) => {
    const users = await User.find({});
    res.json(users);
}));

export default userRouter;
