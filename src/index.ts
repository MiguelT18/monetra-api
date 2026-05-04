import cors from "cors";
import UserRoutes from "./routes/user.routes.ts";
import ProductRoutes from "./routes/product.routes.ts";
import express from "express";
import { env } from "./config/env.ts";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "./middleware/error.middleware.ts";

const app = express();

app.use(express.json());
app.use(cookieParser());
// app.use({
//   cors({
//     origin: "http://localhost:3000",
//     credentials: true,  })
// })
app.use(cors());

const port = env.PORT;

app.use("/api/auth", UserRoutes);
app.use("/api/products", ProductRoutes);

app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});
