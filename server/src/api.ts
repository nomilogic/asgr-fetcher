import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// OpenAPI spec (minimal but complete; extend as needed)
const openapi = {
  openapi: "3.0.3",
  info: {
    title: "ASGR Data API",
    version: "1.0.0",
    description:
      "Read-only API for players, high schools, circuit teams, and colleges. Backed by Supabase.",
  },
  servers: [{ url: "http://localhost:3000" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Player: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          rank: { type: "integer", nullable: true },
          grade_year: { type: "integer", nullable: true },
          position: { type: "string", nullable: true },
          height: { type: "string", nullable: true },
          high_school: { type: "string", nullable: true },
          high_school_id: { type: "integer", nullable: true },
          circuit_program: { type: "string", nullable: true },
          circuit_team_id: { type: "integer", nullable: true },
          state: { type: "string", nullable: true },
          committed_college: { type: "string", nullable: true },
          committed_college_id: { type: "integer", nullable: true },
          image_path: { type: "string", nullable: true },
          source_url: { type: "string", nullable: true },
          ranks: { type: "object", additionalProperties: { type: "integer" } },
          ratings: { type: "object", additionalProperties: { type: "integer" } },
          notes: { type: "object", additionalProperties: { type: "string" } },
          positions: { type: "object", additionalProperties: { type: "string" } },
          heights: { type: "object", additionalProperties: { type: "string" } },
          high_schools: { type: "object", additionalProperties: { type: "string" } },
          circuit_programs: { type: "object", additionalProperties: { type: "string" } },
          committed_colleges: { type: "object", additionalProperties: { type: "string" } },
          source_urls: { type: "array", items: { type: "string" } },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      HighSchool: {
        type: "object",
        properties: {
          id: { type: "integer" },
          school: { type: "string" },
          logo_path: { type: "string", nullable: true },
          ranks: { type: "object", additionalProperties: { type: "integer" } },
          records: { type: "object", additionalProperties: { type: "string" } },
          key_wins: { type: "object", additionalProperties: { type: "string" } },
          source_urls: { type: "array", items: { type: "string" } },
        },
      },
      CircuitTeam: {
        type: "object",
        properties: {
          id: { type: "integer" },
          team: { type: "string" },
          circuit: { type: "string", nullable: true },
          ranks: { type: "object", additionalProperties: { type: "integer" } },
          records: { type: "object", additionalProperties: { type: "string" } },
          key_wins: { type: "object", additionalProperties: { type: "string" } },
          placements: { type: "object", additionalProperties: { type: "string" } },
          source_urls: { type: "array", items: { type: "string" } },
        },
      },
      College: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          logo_path: { type: "string", nullable: true },
          logo_url: { type: "string", nullable: true },
        },
      },
      PaginatedPlayers: {
        type: "object",
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/Player" } },
          count: { type: "integer" },
          limit: { type: "integer" },
          offset: { type: "integer" },
        },
      },
    },
    parameters: {
      Limit: { in: "query", name: "limit", schema: { type: "integer", default: 50, maximum: 500 } },
      Offset: { in: "query", name: "offset", schema: { type: "integer", default: 0 } },
      Season: { in: "query", name: "season", schema: { type: "string" }, description: "Season key, e.g. 2024" },
      Name: { in: "query", name: "name", schema: { type: "string" }, description: "Case-insensitive partial match" },
    },
  },
  paths: {
    "/auth/register": {
      post: {
        summary: "Register user",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { email: { type: "string" }, password: { type: "string" }, display_name: { type: "string" } }, required: ["email", "password"] } } } },
        responses: { 200: { description: "OK" }, 400: { description: "Bad request" } }
      }
    },
    "/auth/login": {
      post: {
        summary: "Login",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { email: { type: "string" }, password: { type: "string" } }, required: ["email", "password"] } } } },
        responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } }
      }
    },
    "/auth/logout": {
      post: {
        summary: "Logout (revoke current session)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "OK" } }
      }
    },
    "/me": {
      get: {
        summary: "Current user",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } }
      }
    },
    "/players": {
      get: {
        summary: "List players",
        parameters: [
          { $ref: "#/components/parameters/Limit" },
          { $ref: "#/components/parameters/Offset" },
          { $ref: "#/components/parameters/Season" },
          { $ref: "#/components/parameters/Name" },
        ],
        responses: {
          200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedPlayers" } } } },
        },
      },
      post: {
        summary: "Upsert player (by name)",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Player" } } } },
        responses: { 200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Player" } } } }, 400: { description: "Bad request" } },
      }
    },
    "/players/{id}": {
      get: {
        summary: "Get a player",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Player" } } } }, 404: { description: "Not found" } },
      },
      patch: {
        summary: "Update player by id",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Player" } } } },
        responses: { 200: { description: "OK" } },
      },
      put: {
        summary: "Replace player by id",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Player" } } } },
        responses: { 200: { description: "OK" } },
      },
    },
    "/high-schools": {
      get: { summary: "List high schools", parameters: [{ $ref: "#/components/parameters/Limit" }, { $ref: "#/components/parameters/Offset" }], responses: { 200: { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/HighSchool" } } } } } } },
      post: { summary: "Upsert high school (by school)", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/HighSchool" } } } }, responses: { 200: { description: "OK" } } }
    },
    "/high-schools/{id}": {
      patch: { summary: "Update high school by id", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/HighSchool" } } } }, responses: { 200: { description: "OK" } } },
      put: { summary: "Replace high school by id", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/HighSchool" } } } }, responses: { 200: { description: "OK" } } }
    },
    "/circuit-teams": {
      get: { summary: "List circuit teams", parameters: [{ $ref: "#/components/parameters/Limit" }, { $ref: "#/components/parameters/Offset" }], responses: { 200: { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/CircuitTeam" } } } } } } },
      post: { summary: "Upsert circuit team (by team)", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CircuitTeam" } } } }, responses: { 200: { description: "OK" } } }
    },
    "/circuit-teams/{id}": {
      patch: { summary: "Update circuit team by id", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CircuitTeam" } } } }, responses: { 200: { description: "OK" } } },
      put: { summary: "Replace circuit team by id", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CircuitTeam" } } } }, responses: { 200: { description: "OK" } } }
    },
    "/colleges": {
      get: { summary: "List colleges", parameters: [{ $ref: "#/components/parameters/Limit" }, { $ref: "#/components/parameters/Offset" }], responses: { 200: { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/College" } } } } } } },
      post: { summary: "Upsert college (by name)", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/College" } } } }, responses: { 200: { description: "OK" } } }
    },
    "/colleges/{id}": {
      patch: { summary: "Update college by id", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/College" } } } }, responses: { 200: { description: "OK" } } },
      put: { summary: "Replace college by id", security: [{ bearerAuth: [] }], parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/College" } } } }, responses: { 200: { description: "OK" } } }
    },
  },
} as const;

import swaggerUi from "swagger-ui-express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi as any));

// Auth middleware (JWT bearer)
const JWT_SECRET = process.env.API_JWT_SECRET || "change-me";
const JWT_TTL_SECONDS = parseInt(process.env.API_JWT_TTL_SECONDS || "3600", 10);

async function verifyAndLoadSession(token: string) {
  const payload = jwt.verify(token, JWT_SECRET) as any;
  const jti = payload?.jti;
  if (!jti) throw new Error("Missing jti");
  const { data, error } = await supabase
    .from("app_sessions")
    .select("jti, revoked, expires_at, user_id")
    .eq("jti", jti)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.revoked) throw new Error("Revoked or missing session");
  if (data.expires_at && new Date(data.expires_at) < new Date()) throw new Error("Session expired");
  return payload;
}

async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const header = req.headers.authorization || "";
    const m = header.match(/^Bearer\s+(.*)$/i);
    if (!m) return res.status(401).json({ error: "Missing bearer token" });
    const payload = await verifyAndLoadSession(m[1]);
    (req as any).user = payload;
    return next();
  } catch (e: any) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

async function issueToken(user: any) {
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + JWT_TTL_SECONDS * 1000).toISOString();
  const { error } = await supabase
    .from("app_sessions")
    .insert({ jti, user_id: user.id, expires_at: expiresAt, revoked: false })
    .select("id");
  if (error) throw new Error(error.message);
  const token = jwt.sign(
    { sub: user.id, jti, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_TTL_SECONDS }
  );
  return { token, expires_at: expiresAt };
}

// Simple helpers
function parseLimitOffset(q: any) {
  const limit = Math.min(Math.max(parseInt(String(q.limit ?? "50"), 10) || 50, 1), 500);
  const offset = Math.max(parseInt(String(q.offset ?? "0"), 10) || 0, 0);
  return { limit, offset };
}

// Auth routes
app.post("/auth/register", async (req, res) => {
  try {
    const { email, password, display_name } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password required" });
    const emailNorm = String(email).trim().toLowerCase();
    const password_hash = await bcrypt.hash(String(password), 10);
    const { data, error } = await supabase
      .from("app_users")
      .insert({ email: emailNorm, password_hash, display_name })
      .select("id, email, display_name, role, is_active")
      .single();
    if (error) return res.status(500).json({ error: error.message });
    const { token, expires_at } = await issueToken(data);
    return res.json({ user: data, token, expires_at });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password required" });
    const emailNorm = String(email).trim().toLowerCase();
    const { data: user, error } = await supabase
      .from("app_users")
      .select("id, email, display_name, role, is_active, password_hash")
      .eq("email", emailNorm)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!user || !user.is_active) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    const { token, expires_at } = await issueToken(user);
    delete (user as any).password_hash;
    return res.json({ user, token, expires_at });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.post("/auth/logout", requireAuth, async (req, res) => {
  try {
    const header = req.headers.authorization as string;
    const token = header.split(" ")[1];
    const payload = jwt.decode(token) as any;
    const jti = payload?.jti;
    if (jti) {
      await supabase.from("app_sessions").update({ revoked: true }).eq("jti", jti);
    }
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.sub as string;
    const { data, error } = await supabase
      .from("app_users")
      .select("id, email, display_name, role, is_active, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// GET /players
app.get("/players", async (req, res) => {
  try {
    const { limit, offset } = parseLimitOffset(req.query);
    const season = req.query.season as string | undefined;
    const name = (req.query.name as string | undefined)?.trim();

    let query = supabase.from("players").select("*", { count: "exact" });

    if (season && name) {
      query = query
        .or(`grade_year.eq.${parseInt(season)},ranks->>'${season}'.not.is.null`)
        .ilike("name", `%${name}%`);
    } else if (season) {
      query = query
        .or(`grade_year.eq.${parseInt(season)},ranks->>'${season}'.not.is.null`);
    } else if (name) {
      query = query.ilike("name", `%${name}%`);
    }

    query = query.order("id", { ascending: true }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      console.error('Query error:', error);
      return res.status(500).json({ error: error ? error.message : "Unknown error" });
    }
    return res.json({ data: data || [], count: count || 0, limit, offset });
  } catch (e: any) {
    console.error('Unexpected error:', e);
    return res.status(500).json({ error: e.message });
  }
});

// GET /players/:id
app.get("/players/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { data, error } = await supabase.from("players").select("*").eq("id", id).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Not found" });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /players (upsert by name)
app.post("/players", requireAuth, async (req, res) => {
  try {
    const body = req.body;
    if (!body?.name) return res.status(400).json({ error: "name is required" });
    const { data, error } = await supabase.from("players").upsert(body, { onConflict: "name" }).select("*").single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// PATCH /players/:id
app.patch("/players/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const body = req.body;
    const { data, error } = await supabase.from("players").update(body).eq("id", id).select("*").single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// PUT /players/:id
app.put("/players/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const body = req.body;
    const { data, error } = await supabase.from("players").update(body).eq("id", id).select("*").single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// GET /high-schools
app.get("/high-schools", async (req, res) => {
  try {
    const { limit, offset } = parseLimitOffset(req.query);
    const { data, error } = await supabase
      .from("high_schools")
      .select("*")
      .order("school", { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /high-schools (upsert by school)
app.post("/high-schools", requireAuth, async (req, res) => {
  try {
    const body = req.body;
    if (!body?.school) return res.status(400).json({ error: "school is required" });
    const { data, error } = await supabase.from("high_schools").upsert(body, { onConflict: "school" }).select("*").single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.patch("/high-schools/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { data, error } = await supabase.from("high_schools").update(req.body).eq("id", id).select("*").single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.put("/high-schools/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { data, error } = await supabase.from("high_schools").update(req.body).eq("id", id).select("*").single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// GET /circuit-teams
app.get("/circuit-teams", async (req, res) => {
  try {
    const { limit, offset } = parseLimitOffset(req.query);
    const { data, error } = await supabase
      .from("circuit_teams")
      .select("*")
      .order("team", { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /circuit-teams (upsert by team)
app.post("/circuit-teams", requireAuth, async (req, res) => {
  try {
    const body = req.body;
    if (!body?.team) return res.status(400).json({ error: "team is required" });
    const { data, error } = await supabase.from("circuit_teams").upsert(body, { onConflict: "team" }).select("*").single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.patch("/circuit-teams/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { data, error } = await supabase.from("circuit_teams").update(req.body).eq("id", id).select("*").single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.put("/circuit-teams/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { data, error } = await supabase.from("circuit_teams").update(req.body).eq("id", id).select("*").single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// GET /colleges
app.get("/colleges", async (req, res) => {
  try {
    const { limit, offset } = parseLimitOffset(req.query);
    const { data, error } = await supabase
      .from("colleges")
      .select("*")
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /colleges (upsert by name)
app.post("/colleges", requireAuth, async (req, res) => {
  try {
    const body = req.body;
    if (!body?.name) return res.status(400).json({ error: "name is required" });
    const { data, error } = await supabase.from("colleges").upsert(body, { onConflict: "name" }).select("*").single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.patch("/colleges/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { data, error } = await supabase.from("colleges").update(req.body).eq("id", id).select("*").single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.put("/colleges/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { data, error } = await supabase.from("colleges").update(req.body).eq("id", id).select("*").single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

const port = parseInt(process.env.PORT || "3000", 10);
app.listen(port, () => {
  console.log(`ASGR Data API running at http://localhost:${port} (docs at /docs)`);
});
