// models/Attachment.js
import mongoose from "mongoose";

const AttachmentSchema = new mongoose.Schema({
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: "Case", required: true },
  filename: { type: String, required: true },
  type: { type: String, enum: ["image", "video", "pdf", "audio"], required: true },
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
});

export default mongoose.model("Attachment", AttachmentSchema);
