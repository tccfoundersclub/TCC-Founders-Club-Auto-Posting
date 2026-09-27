import crypto from "node:crypto";

// Signs a JWT with the service account's private key and exchanges it for an
// OAuth access token. No external dependencies - just Node's built-in crypto.
export async function getDriveAccessToken() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON secret is not set");
  const creds = JSON.parse(raw);

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: creds.client_email,
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const b64url = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");

  const unsigned = `${b64url(header)}.${b64url(claims)}`;
  const signature = crypto
    .sign("RSA-SHA256", Buffer.from(unsigned), creds.private_key)
    .toString("base64url");
  const jwt = `${unsigned}.${signature}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const json = await resp.json();
  if (!resp.ok) throw new Error(`Drive auth failed: ${JSON.stringify(json)}`);
  return json.access_token;
}
