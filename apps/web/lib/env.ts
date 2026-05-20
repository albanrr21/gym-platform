const requiredPublic = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

const requiredServer = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "RAPIDAPI_KEY",
] as const;

let validatedPublic = false;
let validatedServer = false;

export function validatePublicEnv() {
  if (validatedPublic) return;
  const missing = requiredPublic.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
  validatedPublic = true;
}

export function validateServerEnv() {
  if (validatedServer) return;
  const missing = requiredServer.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
  validatedServer = true;
}
