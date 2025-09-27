// models/CaseHistory.js
import mongoose from "mongoose";

const CaseHistorySchema = new mongoose.Schema({
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: "Case", required: true },
  actionBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: { type: String, required: true }, // ex: "Création", "Changement de statut", "Ajout preuve"
  oldValue: { type: String },
  newValue: { type: String },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model("CaseHistory", CaseHistorySchema);
