import { supabase } from "../lib/supabase.js";
import { prisma } from "../lib/prisma.js";

interface RegisterInput {
  email: string;
  username: string;
  password: string;
}

export async function signup({ email, username, password }: RegisterInput) {
  console.log("Signup called with:", { email, username, password });
}
