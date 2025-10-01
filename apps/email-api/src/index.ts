import { getEmailsByMessageTo } from "database/dao";
import { getWebTursoDB } from "database/db";
import { Context, Hono, Next } from "hono";
import { cors } from "hono/cors";
import * as jose from "jose";
// @ts-ignore
import randomName from "@scaleway/random-name";

type Bindings = {
  TURSO_DB_URL: string;
  TURSO_DB_RO_AUTH_TOKEN: string;
  JWT_SECRET: string;
  TURNSTILE_SECRET: string;
  EMAIL_DOMAIN: string;
};

type Variables = {
  mailbox: string;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", cors());

// Swagger UI route
app.get("/docs", (c) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vmail API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/swagger.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>
  `;
  return c.html(html);
});

// OpenAPI JSON endpoint
app.get("/swagger.json", (c) => {
  return c.json({
    openapi: "3.0.0",
    info: {
      title: "Vmail Email API",
      version: "1.0.0",
      description: "API for managing temporary email addresses and retrieving emails",
      contact: {
        name: "Vmail Support",
        url: "https://github.com/vmail-app/vmail"
      }
    },
    servers: [
      {
        url: "https://email-api.huutuan.workers.dev",
        description: "Production server"
      },
      {
        url: "http://localhost:8787",
        description: "Development server"
      }
    ],
    paths: {
      "/mailbox": {
        post: {
          summary: "Create a new temporary mailbox",
          description: "Creates a new temporary email address with JWT token for authentication",
          tags: ["Mailbox"],
          requestBody: {
            required: true,
            content: {
              "application/x-www-form-urlencoded": {
                schema: {
                  type: "object",
                  properties: {
                    "cf-turnstile-response": {
                      type: "string",
                      description: "Cloudflare Turnstile response token"
                    }
                  },
                  required: ["cf-turnstile-response"]
                }
              },
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    "cf-turnstile-response": {
                      type: "string",
                      description: "Cloudflare Turnstile response token"
                    }
                  },
                  required: ["cf-turnstile-response"]
                }
              }
            }
          },
          responses: {
            "200": {
              description: "Mailbox created successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      mailbox: {
                        type: "string",
                        format: "email",
                        example: "john.doe@example.com"
                      },
                      token: {
                        type: "string",
                        description: "JWT token for authentication",
                        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      }
                    }
                  }
                }
              }
            },
            "400": {
              description: "Bad request - Missing or invalid Turnstile response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                        example: "Missing cf-turnstile-response"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/mails": {
        get: {
          summary: "Get emails for authenticated mailbox",
          description: "Retrieves all emails for the authenticated temporary mailbox",
          tags: ["Emails"],
          security: [
            {
              bearerAuth: []
            }
          ],
          responses: {
            "200": {
              description: "List of emails retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: {
                          type: "string",
                          example: "123e4567-e89b-12d3-a456-426614174000"
                        },
                        messageTo: {
                          type: "string",
                          format: "email",
                          example: "john.doe@example.com"
                        },
                        messageFrom: {
                          type: "string",
                          format: "email",
                          example: "sender@example.com"
                        },
                        subject: {
                          type: "string",
                          example: "Welcome to our service"
                        },
                        content: {
                          type: "string",
                          example: "Thank you for signing up..."
                        },
                        receivedAt: {
                          type: "string",
                          format: "date-time",
                          example: "2023-12-01T10:30:00Z"
                        }
                      }
                    }
                  }
                }
              }
            },
            "401": {
              description: "Unauthorized - Missing or invalid JWT token",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                        example: "Missing Authorization header"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              description: "Bad request - Invalid JWT token",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                        example: "Failed to verify"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/domains": {
        get: {
          summary: "Get all available email domains",
          description: "Retrieves a list of all available email domains for creating temporary email addresses",
          tags: ["Domains"],
          responses: {
            "200": {
              description: "List of available domains retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      domains: {
                        type: "array",
                        items: {
                          type: "string",
                          format: "hostname"
                        },
                        example: ["example.com", "test.org", "demo.net"]
                      },
                      count: {
                        type: "integer",
                        description: "Total number of available domains",
                        example: 3
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    }
  });
});

async function withMailbox(c: Context, next: Next) {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Missing Authorization header" }, 401);
    }
    const token = authHeader.split(" ")[1];
    const { payload } = await jose.jwtVerify(token, c.env.JWT_SECRET);
    c.set("mailbox", payload.mailbox);
    return next();
  } catch (e) {
    return c.json({ error: "Failed to verify" }, 400);
  }
}

async function withTurnstile(c: Context, next: Next) {
  try {
    let token: string | undefined;
    switch (c.req.header("content-type")) {
      case "application/x-www-form-urlencoded":
      case "multipart/form-data":
        token =
          (await c.req.formData()).get("cf-turnstile-response") || undefined;
      case "application/json":
        token = (await c.req.json())["cf-turnstile-response"] || undefined;
      default:
        token = c.req.query("cf-turnstile-response");
    }
    if (!token || typeof token !== "string") {
      return c.json({ error: "Missing cf-turnstile-response" }, 400);
    }
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: `secret=${encodeURIComponent(
          c.env.TURNSTILE_SECRET
        )}&response=${encodeURIComponent(token)}`,
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
      }
    );
    if (!res.ok) {
      return c.json({ error: "Failed to verify" }, 400);
    }
    const json = (await res.json()) as { success: boolean };
    if (!json.success) {
      return c.json({ error: "Failed to verify" }, 400);
    }
    return next();
  } catch (e) {
    return c.json({ error: "Failed to verify" }, 400);
  }
}

app.post("/mailbox", withTurnstile, async (c) => {
  const jwtSecret = new TextEncoder().encode(c.env.JWT_SECRET);
  const name = randomName("", ".");
  const domain = c.env.EMAIL_DOMAIN || "";
  const mailbox = `${name}@${domain}`;
  const token = await new jose.SignJWT({ mailbox })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("2h")
    .sign(jwtSecret);
  return c.json({ mailbox, token });
});

app.get("/mails", withMailbox, async (c) => {
  const mailbox = c.get("mailbox");
  const db = getWebTursoDB(c.env.TURSO_DB_URL, c.env.TURSO_DB_RO_AUTH_TOKEN);
  const mails = await getEmailsByMessageTo(db, mailbox);
  return c.json(mails);
});

app.get("/domains", (c) => {
  const domains = c.env.EMAIL_DOMAIN?.split(",") || [];
  return c.json({
    domains: domains.map(domain => domain.trim()),
    count: domains.length
  });
});

export default app;
