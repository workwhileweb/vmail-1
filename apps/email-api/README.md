# Vmail Email API

A Cloudflare Workers API for managing temporary email addresses and retrieving emails.

## Features

- Create temporary email addresses with JWT authentication
- Retrieve emails for authenticated mailboxes
- Cloudflare Turnstile integration for bot protection
- OpenAPI/Swagger documentation

## API Endpoints

### POST /mailbox
Creates a new temporary email address.

**Request Body:**
- `cf-turnstile-response` (string): Cloudflare Turnstile response token

**Response:**
```json
{
  "mailbox": "user@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### GET /mails
Retrieves all emails for the authenticated mailbox.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Response:**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "messageTo": "user@example.com",
    "messageFrom": "sender@example.com",
    "subject": "Welcome to our service",
    "content": "Thank you for signing up...",
    "receivedAt": "2023-12-01T10:30:00Z"
  }
]
```

## Documentation

Visit `/docs` to access the interactive Swagger UI documentation.

Visit `/swagger.json` to get the OpenAPI specification in JSON format.

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Deploy to Cloudflare Workers
pnpm deploy
```

## Environment Variables

- `TURSO_DB_URL`: Database connection URL
- `TURSO_DB_RO_AUTH_TOKEN`: Database authentication token
- `JWT_SECRET`: Secret key for JWT token signing
- `TURNSTILE_SECRET`: Cloudflare Turnstile secret key
- `EMAIL_DOMAIN`: Email domain for temporary addresses

## Authentication

The API uses JWT tokens for authentication. When you create a mailbox, you receive a JWT token that must be included in the `Authorization` header for subsequent requests.

Example:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```