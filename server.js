import express from "express";  
import dotenv from "dotenv";
import ImportData from "./DataImport.js";
import connectDatabase from "./configure/mongoConf.js"; 
import userRouter from "./Routes/userRoutes.js";
import { errorHandler, notFound } from "./middleware/error.js";    
import cors from "cors";  
import caseRoute from "./Routes/caseRoute.js";
import historyRouter from "./Routes/history.js";
import notificationRouter from "./Routes/notifications.js";

import http from "http";
import { Server } from "socket.io";
import alertRoute from "./Routes/alertRoute.js";

dotenv.config();
connectDatabase();

const app = express(); 
app.use(express.json());
app.use(cors());

// Routes
app.use("/api/import", ImportData); 
app.use("/api/users", userRouter); 
app.use("/api/case", caseRoute);
app.use("/api/history", historyRouter);
app.use("/api/notification", notificationRouter);
app.use("/api/alerts", alertRoute);

app.use(notFound);
app.use(errorHandler);

app.get("/", (req, res) => {
  res.send("API Is Running");
});

// ---------------------
// Créer le serveur HTTP pour Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" } // tu peux limiter à ton frontend
});

io.on("connection", (socket) => {
  console.log("Nouvel agent connecté :", socket.id);

  // L’agent rejoint sa room via son ID
  socket.on("joinAgent", (agentId) => {
    socket.join(agentId);
    console.log(`Agent ${agentId} a rejoint sa room`);
  });

  socket.on("disconnect", () => {
    console.log("Agent déconnecté :", socket.id);
  });
});

// Exporter io pour l’utiliser dans les routes
export { io };

// ---------------------
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
