import UserRoutes from "./routes/user.routes.ts";
import express from "express";
import { env } from "./config/env.ts";
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json()); // middleware que transforma req.body en JSON
app.use(cookieParser());

const port = env.PORT;

app.use("/api/auth", UserRoutes);

app.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});
