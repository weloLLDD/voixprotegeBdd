// models/Alert.js
import mongoose from "mongoose";

const alertSchema = mongoose.Schema(
  {
    message: { type: String, required: true },
    type: { type: String, default: "info" }, // ex: info, violation, urgent
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // destinataire
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: "Case", default: null },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Alert = mongoose.model("Alert", alertSchema);
export default Alert;


