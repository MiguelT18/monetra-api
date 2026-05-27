import type { User } from "@supabase/supabase-js";
import type { FullProfileResponse } from "./user.types.ts";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      profile?: FullProfileResponse;
    }
  }
}
