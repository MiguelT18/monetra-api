import UserRoutes from "./routes/user.routes.ts";
import express from "express";
import { env } from "./config/env.ts";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "./middleware/error.middleware.ts";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(errorMiddleware);

const port = env.PORT;

app.use("/api/auth", UserRoutes);
// TODO: Create products endpoint `/api/products`
// TODO: Create affiliates endpoint `/api/affiliates`

app.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});
