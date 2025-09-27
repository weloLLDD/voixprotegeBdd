// routes/caseHistory.js
import express from "express";  
import CaseHistory from "../models/CaseHistory.js";
import { protect } from "../middleware/AuthMiddleware.js";

const historyRouter = express.Router();

// Lister historique d’un signalement
historyRouter.get("/:caseId", protect, async (req, res) => {
  try {
    const history = await CaseHistory.find({ caseId: req.params.caseId })
      .populate("actionBy", "name email");
    res.json(history);
  } catch (err) {
    res.status(500).send("Erreur serveur");
  }
});

export default historyRouter;
