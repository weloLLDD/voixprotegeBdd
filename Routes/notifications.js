// routes/notifications.js
import express from "express"; 
import Notification from "../models/Notification.js";
import { admin, protect } from "../middleware/AuthMiddleware.js"; 


const notificationRouter = express.Router();

// Lister notifications
notificationRouter.get("/", protect, async (req, res) => {
  try {
    const notification = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(notification);
  } catch (err) {
    res.status(500).send("Erreur serveur");
  }
});

// Marquer comme lue
notificationRouter.put("/:id/read", protect, async (req, res) => {
  try {
    const n = await Notification.findById(req.params.id);
    if (!n) return res.status(404).json({ msg: "Notification introuvable" });
    if (String(n.userId) !== req.user.id) return res.status(401).json({ msg: "Accès refusé" });
    n.read = true;
    await n.save();
    res.json(n);
  } catch (err) {
    res.status(500).send("Erreur serveur");
  }
});

export default notificationRouter;
