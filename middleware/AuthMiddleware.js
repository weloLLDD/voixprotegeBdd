import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/userModels.js";

const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Vérifie que le header contient "Bearer ..."
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Extraction du token
      token = req.headers.authorization.split(" ")[1];

      // Décodage du token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Recherche de l'utilisateur (sans mot de passe)
      req.user = await User.findById(decoded.id).select("-password");

      // Si tout est bon → passe à la suite
      return next();
    } catch (error) {
      console.error("Erreur de vérification du token :", error.message);
      res.status(401);
      throw new Error("Token invalide ou expiré");
    }
  }

  // Si aucun token trouvé du tout
  res.status(401);
  throw new Error("Pas de token, accès refusé");
});


const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  } else {
    res.status(401);
    throw new Error("Non autorisé (admin requis)");
  }
};


export { protect, admin };
