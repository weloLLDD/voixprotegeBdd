import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
    },

    email: {
      type: String,
      unique: true,
      trim: true,
      sparse: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please enter a valid email",
      ],
    },

    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Please add a password"],
      minlength: [6, "Password must be at least 6 characters"],
    },

    role: {
      type: String,
      enum: ["admin", "citoyen", "agent"],
      default: "citoyen",
      required: true,
    },

    // 🔥 AJOUTS POUR DISPATCH CNDH 🔥
    serviceCNDH: {
      type: String,
      enum: [
        "Droits Civils et Politiques",
        "Enquête et Suivi",
        "Protection Femmes et Enfants",
        "Plaintes et Réclamations"
      ],
    },

    typesViolation: [
      {
        type: String,
        enum: [
          "arrestation_arbitraire",
          "torture",
          "disparition",
          "violence_femme_enfant",
          "autre"
        ],
      },
    ],

    fonctionOfficielle: {
      type: String, // ex: "Commissaire", "Rapporteur", "Chef de service"
    },
  },
  {
    timestamps: true,
  }
);

// 🔐 Vérification mot de passe
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 🔐 Hash mot de passe
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model("User", userSchema);
export default User;
