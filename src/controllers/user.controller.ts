import UserService from "../services/user.service.ts";
import { fail, ok } from "../utils/helpers.ts";
import type { Request, Response, RequestHandler } from "express";
import { supabase } from "../lib/supabase.ts";
import { env } from "../config/env.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { updateProfileSchema } from "../schemas/user.schema.ts";
import { removeUndefined } from "../utils/helpers.ts";
import { HttpError } from "../errors/http-error.ts";

const OAUTH_PROVIDERS = ["google", "github"] as const;
type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

function setAuthCookies(
  res: Response,
  access_token: string,
  refresh_token: string,
  role: string,
) {
  const isProduction = env.NODE_ENV === "production";

  res.cookie("access_token", access_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 60 * 60 * 1000,
  });

  res.cookie("refresh_token", refresh_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.cookie("user_role", role, {
    httpOnly: false,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 60 * 60 * 1000,
  });
}

async function ensureProfileForAuthUser(
  authUser: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  },
) {
  const existing = await UserService.getFullUser(authUser.id);
  if (existing) return existing;

  const email = authUser.email ?? "";
  const meta = authUser.user_metadata ?? {};
  const fullname =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    email.split("@")[0] ||
    "Usuario";
  const baseUsername =
    (typeof meta.user_name === "string" && meta.user_name) ||
    email.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "_") ||
    "user";
  const username = `${baseUsername}_${authUser.id.slice(0, 6)}`;

  await UserService.createUser(
    authUser.id,
    { fullname, username, role: "STUDENT" },
    email,
  );

  const user = await UserService.getFullUser(authUser.id);
  if (!user) {
    throw new HttpError(500, "No se pudo crear el perfil del usuario");
  }
  return user;
}

export const register: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { fullname, email, username, password, role = "STUDENT" } = req.body;

    if (!email || !password || !username || !fullname) {
      throw new HttpError(400, "Faltan campos requeridos");
    }

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error || !data?.user) {
      throw new HttpError(400, error?.message || "Error al registrar usuario");
    }

    const user = await UserService.createUser(
      data.user.id,
      {
        fullname,
        username,
        role,
      },
      email,
    );

    res.status(201).json(ok("Usuario registrado correctamente", { user }));
  },
);

export const login: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new HttpError(400, "Faltan campos requeridos");
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.user || !data.session) {
      throw new HttpError(400, "Correo o contraseña incorrectos");
    }

    const user = await UserService.getFullUser(data.user.id);

    if (!user) {
      throw new HttpError(400, "Usuario no encontrado");
    }

    const { access_token, refresh_token } = data.session;

    setAuthCookies(res, access_token, refresh_token, user.role);

    res.json(ok("Iniciaste sesión!", { user }));
  },
);

export const forgotPassword: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      throw new HttpError(400, "El correo es obligatorio");
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${env.FRONTEND_URL}/auth/reset-password`,
    });

    if (error) {
      throw new HttpError(400, error.message);
    }

    res.json(
      ok(
        "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña",
      ),
    );
  },
);

export const recoverySession: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { access_token, refresh_token } = req.body;

    if (!access_token || !refresh_token) {
      throw new HttpError(400, "Tokens de recuperación inválidos");
    }

    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error || !data.session || !data.user) {
      throw new HttpError(400, "Enlace de recuperación inválido o expirado");
    }

    const user = await ensureProfileForAuthUser(data.user);

    setAuthCookies(
      res,
      data.session.access_token,
      data.session.refresh_token,
      user.role,
    );

    res.json(ok("Sesión de recuperación iniciada", { user }));
  },
);

export const updatePassword: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { password } = req.body;
    const accessToken = req.cookies?.access_token;
    const refreshToken = req.cookies?.refresh_token;

    if (!password || typeof password !== "string" || password.length < 8) {
      throw new HttpError(400, "La contraseña debe tener al menos 8 caracteres");
    }

    if (!accessToken || !refreshToken) {
      throw new HttpError(401, "Sesión no válida. Abre el enlace del correo de nuevo");
    }

    const { data: sessionData, error: sessionError } =
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

    if (sessionError || !sessionData.session) {
      throw new HttpError(401, "Sesión expirada. Solicita un nuevo enlace");
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      throw new HttpError(400, error.message);
    }

    setAuthCookies(
      res,
      sessionData.session.access_token,
      sessionData.session.refresh_token,
      (await UserService.getFullUser(sessionData.user!.id))?.role ?? "STUDENT",
    );

    res.json(ok("Contraseña actualizada correctamente"));
  },
);

export const oauthUrl: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const provider = req.params.provider as OAuthProvider;

    if (!OAUTH_PROVIDERS.includes(provider)) {
      throw new HttpError(400, "Proveedor no soportado");
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${env.FRONTEND_URL}/auth/callback`,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      throw new HttpError(400, error?.message ?? "No se pudo iniciar OAuth");
    }

    res.json(ok("URL de autenticación generada", { url: data.url }));
  },
);

export const oauthCallback: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { code } = req.body;

    if (!code || typeof code !== "string") {
      throw new HttpError(400, "Código de autorización inválido");
    }

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.session || !data.user) {
      throw new HttpError(400, "No se pudo completar el inicio de sesión social");
    }

    const user = await ensureProfileForAuthUser(data.user);

    setAuthCookies(
      res,
      data.session.access_token,
      data.session.refresh_token,
      user.role,
    );

    res.json(ok("Iniciaste sesión!", { user }));
  },
);

export const updateProfile: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = updateProfileSchema.parse(req.body);
    const data = removeUndefined(parsed);

    const user = await UserService.updateProfile(req.user!.id, data);

    res.json(ok("Actualizaste tu perfil correctamente!", { user }));
  },
);

export const updateRole: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError(401, "Sin autorización");
    }

    const { role } = req.body;

    const VALID_ROLES = ["STUDENT", "PRODUCER", "AFFILIATE"];

    if (!role || !VALID_ROLES.includes(role)) {
      throw new HttpError(400, "Rol inválido");
    }

    const user = await UserService.updateRole(userId, role);

    res.json(ok("Rol actualizado correctamente", { user }));
  },
);

export const getUserProfile: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json(fail("Sin autorización"));
    }

    const user = await UserService.getFullUser(userId);

    if (!user) {
      return res.status(404).json(fail("Usuario no encontrado"));
    }

    return res.json(ok("Perfil del usuario obtenido", user));
  },
);

export const refreshSession: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      throw new HttpError(400, "Falta el token de refresco");
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      throw new HttpError(400, "Token de refresco inválido");
    }

    const { access_token, refresh_token } = data.session;

    res.cookie("access_token", access_token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 1000,
    });

    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({ message: "Sesión refrescada" });
  },
);

export const logout: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const accessToken = req.cookies?.access_token;

    if (accessToken) {
      await supabase.auth.signOut();
    }

    res.clearCookie("access_token");
    res.clearCookie("refresh_token");

    res.json(ok("Cerraste sesión"));
  },
);
