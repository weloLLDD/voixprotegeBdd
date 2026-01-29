// routes/caseRoute.js
import express from "express";
import multer from "multer";
import Case from "../models/Case.js";
import User from "../models/userModels.js";
import CaseHistory from "../models/CaseHistory.js";
import { protect, admin } from "../middleware/AuthMiddleware.js";
import cloudinary from "../cloudinary_temp.js";
import { io } from "../server.js";

const router = express.Router();

// ----------------- Multer en mémoire -----------------
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ----------------- Cloudinary helper -----------------
const uploadToCloudinary = (fileBuffer, folder = "cases") =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (err, result) => (result ? resolve(result.secure_url) : reject(err))
    );
    stream.end(fileBuffer);
  });

// ----------------- Helper assignation agent -----------------
const assignAgent = async () => {
  const agents = await User.find({ role: "agent" });
  if (!agents.length) return null;

  const counts = await Promise.all(
    agents.map(async (a) => ({
      agent: a,
      count: await Case.countDocuments({
        assigneA: a._id,
        statut: { $in: ["en_attente", "en_cours"] },
      }),
    }))
  );

  counts.sort((a, b) => a.count - b.count);
  return counts[0].agent;
};

// ----------------- CREATE SIGNALMENT -----------------
router.post("/", protect, upload.array("piecesJointes", 10), async (req, res) => {
  try {
    const { titre, typeViolation, detailViolation, description, anonyme, nomDeclarant, dateHeure } = req.body;

    if (!titre || !typeViolation) return res.status(400).json({ message: "Champs obligatoires manquants" });

    const boolAnonyme = anonyme === true || anonyme === "true";
    const dateTimeObj = dateHeure ? new Date(dateHeure) : new Date();

    // Upload fichiers vers Cloudinary
    const piecesJointes = [];
    if (req.files?.length) {
      for (const file of req.files) {
        const url = await uploadToCloudinary(file.buffer);
        piecesJointes.push({
          url,
          typeFichier: file.mimetype.split("/")[0],
        });
      }
    }

    // Création du signalement
    const newCase = new Case({
      declarant: boolAnonyme ? null : req.user._id,
      anonyme: boolAnonyme,
      nomDeclarant: boolAnonyme ? null : nomDeclarant,
      titre,
      typeViolation,
      detailViolation: typeViolation === "autre" ? detailViolation || "Autre" : "",
      description,
      dateHeure: dateTimeObj,
      piecesJointes,
    });

    // Assignation automatique à un agent
    const agent = await assignAgent();
    if (agent) {
      newCase.assigneA = agent._id;
      newCase.historique.push({
        action: `Assigné automatiquement à ${agent.name}`,
        actionPar: req.user._id,
      });
    }

    await newCase.save();

    // Historique global
    const history = new CaseHistory({
      caseId: newCase._id,
      actionBy: req.user._id,
      action: "Création du signalement",
    });
    await history.save();

    // -------- Socket.IO --------
    // 1️⃣ Notifier le citoyen créateur
    if (io) io.to(req.user._id.toString()).emit("newCase", newCase);

    // 2️⃣ Notifier l’agent assigné
    if (agent && io) io.to(agent._id.toString()).emit("nouveauCas", newCase);

    res.status(201).json({ message: "Signalement créé", case: newCase });

  } catch (err) {
    console.error("Erreur serveur:", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// ----------------- GET MES DOSSIERS -----------------
router.get("/mesdossiers", protect, async (req, res) => {
  try {
    const myCases = await Case.find({ declarant: req.user._id })
      .populate("assigneA", "name")
      .populate("evolution.creePar", "name")
      .sort({ createdAt: -1 });

    res.json(myCases);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// ----------------- GET MES CAS (agents) -----------------
router.get("/mescas", protect, async (req, res) => {
  try {
    const mesCas = await Case.find({ assigneA: req.user._id })
      .populate("assigneA", "name")
      .sort({ createdAt: -1 });
    res.json(mesCas);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ----------------- UPDATE STATUT -----------------
router.put("/:id/statut", protect, async (req, res) => {
  try {
    const { statut } = req.body;
    const c = await Case.findById(req.params.id);
    if (!c) return res.status(404).json({ message: "Signalement introuvable" });

    if (req.user.role !== "admin" && String(c.assigneA) !== req.user._id.toString()) {
      return res.status(403).json({ message: "Non autorisé" });
    }

    c.statut = statut;
    c.historique.push({ action: `Changement de statut à ${statut}`, actionPar: req.user._id });
    await c.save();

    res.json(c);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ----------------- UPDATE ASSIGNATION (admin) -----------------
router.put("/:id/assigner", protect, admin, async (req, res) => {
  const { agentId } = req.body;
  try {
    const caseItem = await Case.findById(req.params.id);
    if (!caseItem) return res.status(404).json({ message: "Signalement non trouvé" });

    caseItem.assigneA = agentId;
    caseItem.historique.push({
      action: `Assigné à un agent`,
      actionPar: req.user._id,
    });

    await caseItem.save();
    res.json(caseItem);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ----------------- ADD EVOLUTION -----------------
router.put("/:id/evolution", protect, async (req, res) => {
  try {
    const { etape, commentaire } = req.body;
    const c = await Case.findById(req.params.id);
    if (!c) return res.status(404).json({ message: "Dossier introuvable" });

    if (req.user.role !== "admin" && String(c.assigneA) !== req.user._id.toString()) {
      return res.status(403).json({ message: "Non autorisé" });
    }

    c.evolution.push({ etape, commentaire, creePar: req.user._id });
    await c.save();

    const updatedCase = await Case.findById(req.params.id)
      .populate("assigneA", "name")
      .populate("evolution.creePar", "name");

    res.json(updatedCase);
  } catch (err) {
    console.error("Erreur évolution dossier:", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// ----------------- GET CASE BY ID -----------------
router.get("/:id", protect, async (req, res) => {
  try {
    const c = await Case.findById(req.params.id)
      .populate("assigneA", "name")
      .populate("evolution.creePar", "name");

    if (!c) return res.status(404).json({ message: "Dossier introuvable" });
    if (req.user.role !== "admin" && String(c.assigneA?._id) !== req.user._id.toString()) {
      return res.status(403).json({ message: "Non autorisé" });
    }

    res.json(c);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
