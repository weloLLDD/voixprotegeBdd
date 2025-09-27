import mongoose from "mongoose";

// ===== Personne impliquée =====
const PersonSchema = new mongoose.Schema({
  nom: { type: String },
  role: {
    type: String,
    enum: ["victime", "temoin", "suspect"]
  }
});

// ===== Évolution du dossier (timeline) =====
const EvolutionSchema = new mongoose.Schema({
  etape: { type: String, required: true }, // ex: "Début enquête", "Rapport envoyé"
  commentaire: { type: String },
  creeLe: { type: Date, default: Date.now },
  creePar: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
});

// ===== Cas (dossier) =====
const CaseSchema = new mongoose.Schema(
  {
    declarant: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // null si anonyme
    anonyme: { type: Boolean, default: false },
    nomDeclarant: { type: String }, // optionnel si non-anonyme

    titre: { type: String, required: true },
    typeViolation: {
      type: String,
      enum: ["arrestation_arbitraire", "torture", "disparition", "autre"],
      required: true
    },
    detailViolation: { type: String }, // si typeViolation = "autre"
     description: { type: String },

    localisation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordonnees: { type: [Number], index: "2dsphere" }, // [longitude, latitude]
      description: { type: String }
    },

    dateHeure: { type: Date, default: Date.now },

    personnes: [PersonSchema], // victimes, témoins, suspects

    piecesJointes: [
      {
        url: { type: String, required: true },
        typeFichier: { type: String, enum: ["image", "pdf", "video", "audio"] }
      }
    ],

    statut: {
      type: String,
      enum: [
        "en_attente",
        "en_cours",
        "en_investigation",
        "en_attente_info",
        "transmis_autorite",
        "resolu",
        "clos"
      ],
      default: "en_attente"
    },

    assigneA: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // agent assigné

    historique: [
      {
        action: String,
        actionPar: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        creeLe: { type: Date, default: Date.now }
      }
    ],

    evolution: [EvolutionSchema] // suivi détaillé du dossier
  },
  { timestamps: true }
);

export default mongoose.model("Case", CaseSchema);
