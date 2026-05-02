import "dotenv/config";
import express from "express";
import cors from "cors";

import crimavRoutes from "./routes/crimav.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/crimav", crimavRoutes);

app.get("/", (req, res) => {
  res.send("API Crimav rodando 🚀");
});

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});