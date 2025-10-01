# Vmail Web Application

A Remix-based web application for managing temporary email addresses.

## Features

- Create temporary email addresses
- Receive and view emails
- Domain selection with random domain picker
- Multi-language support
- Responsive design

## Configuration

The application now fetches email domains from the API endpoint instead of environment variables.

### Environment Variables

- `EMAIL_API_URL`: URL of the email API (default: https://email-api.huutuan.workers.dev)
- `EMAIL_DOMAIN`: Fallback domains if API is unavailable (comma-separated)
- `TURNSTILE_KEY`: Cloudflare Turnstile site key
- `TURNSTILE_SECRET`: Cloudflare Turnstile secret key
- `TURSO_DB_URL`: Database connection URL
- `TURSO_DB_RO_AUTH_TOKEN`: Database authentication token
- `SEND_WORKER_URL`: Send worker URL for email sending

## Development

From your terminal:

```sh
npm run dev
```

This starts your app in development mode, rebuilding assets on file changes.

## Deployment

First, build your app for production:

```sh
npm run build
```

Then run the app in production mode:

```sh
npm start
```

Now you'll need to pick a host to deploy it to.

### DIY

If you're familiar with deploying node applications, the built-in Remix app server is production-ready.

Make sure to deploy the output of `remix build`

- `build/`
- `public/build/`
