import AuthRoutes from "../src/routes/auth.routes.js";
import express from "express";

const app = express();

app.use(express.json()); // middleware que transforma req.body en JSON

const port = process.env.PORT;

app.use("/api", AuthRoutes);

app.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});
