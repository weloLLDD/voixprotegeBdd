// routes/alertRoute.js
import express from "express";
import Alert from "../models/Alert.js"; // À créer : modèle Alert
import { protect, admin } from "../middleware/AuthMiddleware.js";

const alertRoute = express.Router();

// ===== POST /api/alerts ===== Créer une alerte (ex: après création de dossier)
alertRoute.post("/", protect, async (req, res) => {
  try {
    const { message, type, caseId, userId } = req.body;

    if (!message) return res.status(400).json({ message: "Message obligatoire" });

    const alert = new Alert({
      message,
      type: type || "info",
      caseId: caseId || null,
      user: userId || null, // destinataire (ex: admin ou agent)
      isRead: false,
    });

    await alert.save();
    res.status(201).json(alert);
  } catch (err) {
    console.error("Erreur création alerte:", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// ===== GET /api/alerts ===== Récupérer toutes les alertes pour l'utilisateur connecté
alertRoute.get("/", protect, async (req, res) => {
  try {
    const alerts = await Alert.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// ===== PUT /api/alerts/:id/read ===== Marquer une alerte comme lue
alertRoute.put("/:id/read", protect, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: "Alerte introuvable" });

    if (String(alert.user) !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Non autorisé" });
    }

    alert.isRead = true;
    await alert.save();

    res.json(alert);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

export default alertRoute;
