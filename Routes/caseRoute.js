// routes/caseRoute.js
import express from "express";
import multer from "multer";
import Case from "../models/Case.js";
import User from "../models/userModels.js";
import CaseHistory from "../models/CaseHistory.js";
import { protect, admin } from "../middleware/AuthMiddleware.js";
import cloudinary from "../cloudinary_temp.js";
import { io } from "../server.js";

const caseRoute = express.Router();

// Multer en mémoire pour Cloudinary
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload fichier sur Cloudinary
const uploadToCloudinary = (fileBuffer, folder = "cases") =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (error, result) => (result ? resolve(result.secure_url) : reject(error))
    );
    stream.end(fileBuffer);
  });

// ===== Helper : assigner l’agent le moins chargé
const assignAgent = async () => {
  const agents = await User.find({ role: "agent" });
  if (!agents || agents.length === 0) return null;

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

// ===== POST /api/case ===== Créer un signalement
caseRoute.post("/", protect, upload.array("piecesJointes", 10), async (req, res) => {
  try {
    const { titre, typeViolation, detailViolation,description, anonyme, nomDeclarant, dateHeure } = req.body;

    if (!titre || !typeViolation) {
      return res.status(400).json({ message: "Champs obligatoires manquants" });
    }

    const boolAnonyme = anonyme === true || anonyme === "true";
    const dateTimeObj = dateHeure ? new Date(dateHeure) : new Date();

    // Upload fichiers vers Cloudinary
    const piecesJointes = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const url = await uploadToCloudinary(file.buffer);
          piecesJointes.push({
            url,
            typeFichier: file.mimetype.split("/")[0],
          });
        } catch (err) {
          console.error("Erreur Cloudinary:", err);
          return res.status(500).json({ message: "Erreur Cloudinary", error: err.message });
        }
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

    // Assignation automatique
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

    // Socket.IO – notifier l’agent
    if (agent && io) io.to(agent._id.toString()).emit("nouveauCas", newCase);

    res.status(201).json({ message: "Signalement créé", case: newCase });
  } catch (err) {
    console.error("Erreur serveur:", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// ✅ GET /api/case/all – Tous les cas (admin uniquement)
caseRoute.get("/all", protect, admin, async (req, res) => {
  try {
    const allCases = await Case.find()
      .populate("assigneA", "name email")
      .populate("declarant", "name email")
      .sort({ createdAt: -1 });

    res.json(allCases);
  } catch (err) {
    console.error("Erreur récupération tous les dossiers :", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// ===== GET /api/case/mescas – Dossiers assignés à l’agent
caseRoute.get("/mescas", protect, async (req, res) => {
  try {
    const mesCas = await Case.find({ assigneA: req.user._id })
      .populate("assigneA", "name")
      .sort({ createdAt: -1 });

    res.json(mesCas);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===== GET /api/case/mesdossiers – Dossiers déclarés par le citoyen
caseRoute.get("/mesdossiers", protect, async (req, res) => {
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

// ===== PUT /api/case/:id/statut – Mettre à jour le statut
caseRoute.put("/:id/statut", protect, async (req, res) => {
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

// ===== PUT /api/case/:id/assigner – Assigner un agent (admin)
caseRoute.put("/:id/assigner", protect, admin, async (req, res) => {
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

// ===== PUT /api/case/:id/evolution – Ajouter une évolution
caseRoute.put("/:id/evolution", protect, async (req, res) => {
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

// ===== GET /api/case/:id – Récupérer un dossier par ID
caseRoute.get("/:id", protect, async (req, res) => {
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

export default caseRoute;
