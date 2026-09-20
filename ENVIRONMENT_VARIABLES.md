# Environment Variables

Reference for environment variables read by the backend (`backend/src/main/resources/application.properties`).
Existing infrastructure variables (database, AWS, Stripe, OAuth, SMTP, Firebase) are documented in
`A_DEPLOYMENT_QUICK_REFERENCE.md` and `A_LOCAL_TESTING_GUIDE.md`; this file covers the newer feature flags.

## AI Feed Scope Parser (OpenAI)

The natural-language feed input ("show me my family and my church") is translated into a structured
`FeedScope` by OpenAI Structured Outputs. The model is only called when a user changes their scope,
never when the feed loads. If `OPENAI_API_KEY` is empty the feature degrades gracefully to the
rule-based parser and quick chips.

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | _(empty = disabled)_ | Secret key from https://platform.openai.com/api-keys |
| `OPENAI_MODEL` | `gpt-4o-mini` | Any model that supports `response_format: json_schema` |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Override for proxies / Azure OpenAI gateways |
| `OPENAI_TIMEOUT_MS` | `10000` | Connect + read timeout for the completion call |
| `FEED_SCOPE_PARSE_RATE_LIMIT` | `20` | Max natural-language parses per user per hour |

Elastic Beanstalk: add these under Configuration -> Software -> Environment properties.
Local: put them in your shell or a `.env` loaded by your IDE run configuration. Never commit the key.

## Organization Geocoding (OpenStreetMap Nominatim)

When a church admin saves an address, the backend converts it to latitude/longitude so
"churches within N miles" feed scopes can find the organization. Nominatim is free and keyless
but requires a descriptive `User-Agent` and at most one request per second.

| Variable | Default | Description |
|----------|---------|-------------|
| `GEOCODING_ENABLED` | `true` | Set `false` to skip server-side geocoding (admins can still capture GPS) |
| `GEOCODING_NOMINATIM_BASE_URL` | `https://nominatim.openstreetmap.org` | Self-hosted Nominatim or a commercial mirror |
| `GEOCODING_USER_AGENT` | `TheGathering-ChurchApp/1.0 (contact: admin@thegathrd.com)` | Required by Nominatim's usage policy; use a real contact |
| `GEOCODING_TIMEOUT_MS` | `5000` | Connect + read timeout |
