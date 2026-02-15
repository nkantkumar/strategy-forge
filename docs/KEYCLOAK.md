# Keycloak setup for Strategy Forge

This guide configures [Keycloak](https://www.keycloak.org/) as the identity provider for Strategy Forge. When enabled, users must log in via Keycloak before using the app; the gateway validates JWTs and the frontend sends a Bearer token on each API call.

---

## 1. Run Keycloak

**Docker (standalone):**

```bash
docker run -d --name keycloak \
  -p 8180:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:24 start-dev
```

- Admin console: http://localhost:8180  
- Login: `admin` / `admin`

**Or use an existing Keycloak server** (e.g. your company’s instance).

---

## 2. Create realm and client

1. Open Keycloak Admin Console → **Create realm** (e.g. name: `strategy-forge`).
2. In the realm, go to **Clients** → **Create client**.
   - **Client ID:** `strategy-forge-frontend` (or any name you use in the frontend env).
   - **Client authentication:** OFF (public client).
   - **Valid redirect URIs:**  
     - Dev: `http://localhost:5173/*`  
     - Prod: `https://your-app-domain.com/*`
   - **Valid post logout redirect URIs:** same as above (e.g. `http://localhost:5173`).
   - **Web origins:** `http://localhost:5173` (and your prod origin) so the frontend can call Keycloak.
3. Save.

4. **Create a user** (for testing): **Users** → **Add user** (e.g. username `alice`, set password in **Credentials**).

---

## 3. Gateway (Java) configuration

Set the **issuer URI** so the gateway can validate JWTs. It is the realm’s OpenID configuration URL:

- Format: `https://<keycloak-host>/realms/<realm-name>`
- Local example: `http://localhost:8180/realms/strategy-forge`

**Environment variable:**

```bash
export KEYCLOAK_ISSUER_URI="http://localhost:8180/realms/strategy-forge"
```

Then start the gateway (or add to `application.yml` / K8s deployment).

- **Actuator** (`/actuator/**`) remains public for health checks.
- **API key** (`AUTH_API_KEY` + `X-API-Key` header) still works if you need it for scripts or services alongside Keycloak.

---

## 4. Frontend configuration

The frontend needs the Keycloak server URL, realm, and client ID. Use build-time or runtime env (Vite uses `VITE_*`).

**Create `frontend/.env` (or set in CI/K8s):**

```env
VITE_KEYCLOAK_URL=http://localhost:8180
VITE_KEYCLOAK_REALM=strategy-forge
VITE_KEYCLOAK_CLIENT_ID=strategy-forge-frontend
```

- **VITE_KEYCLOAK_URL** – Keycloak server (no trailing slash).
- **VITE_KEYCLOAK_REALM** – Realm name.
- **VITE_KEYCLOAK_CLIENT_ID** – Client ID from step 2.

If any of these are missing, Keycloak is **disabled**: no redirect to login, and the app uses API key or no auth (depending on gateway config).

**Run the frontend:**

```bash
cd frontend
npm run dev
```

Opening the app will redirect to Keycloak login; after login, the UI sends the access token as `Authorization: Bearer <token>` on every API call. The header shows the username and a **Logout** button.

---

## 5. Docker Compose

Add Keycloak and env for gateway and frontend:

**Keycloak service:**

```yaml
keycloak:
  image: quay.io/keycloak/keycloak:24
  command: start-dev
  environment:
    KEYCLOAK_ADMIN: admin
    KEYCLOAK_ADMIN_PASSWORD: admin
  ports:
    - "8180:8080"
```

**Gateway env:**

```yaml
gateway:
  environment:
    KEYCLOAK_ISSUER_URI: http://keycloak:8080/realms/strategy-forge
```

For the frontend, build with `VITE_KEYCLOAK_*` pointing to the **browser-visible** Keycloak URL (e.g. `http://localhost:8180` if Keycloak is port-forwarded), not the internal Docker hostname.

---

## 6. Kubernetes

1. Deploy Keycloak (Helm or manifests) and create realm/client as above.
2. **Gateway deployment:** set `KEYCLOAK_ISSUER_URI` to the Keycloak realm URL (e.g. `https://keycloak.example.com/realms/strategy-forge`). Use Ingress so the URL is reachable from the cluster and from the browser if needed.
3. **Frontend:** build the image with `VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM`, `VITE_KEYCLOAK_CLIENT_ID` (e.g. ARG/ENV in Dockerfile or CI). Ensure **Valid redirect URIs** and **Web origins** in Keycloak match the frontend URL (e.g. `https://strategy-forge.example.com`).

---

## 7. Auth flow summary

| Component   | Without Keycloak              | With Keycloak                                      |
|------------|------------------------------|----------------------------------------------------|
| Gateway    | No auth or API key only      | Validates Bearer JWT from Keycloak (or API key)   |
| Frontend   | No login; optional API key   | Redirects to Keycloak login; sends Bearer token   |
| Logout     | N/A                          | **Logout** in header calls Keycloak logout        |

---

## 8. Troubleshooting

- **Redirect loop or “Invalid redirect URI”**  
  Check **Valid redirect URIs** and **Web origins** for the client. They must match the frontend origin (scheme + host + port) exactly.

- **401 from gateway**  
  Ensure `KEYCLOAK_ISSUER_URI` matches the realm (e.g. `https://keycloak/realms/strategy-forge`). Token must be from the same realm and not expired.

- **CORS**  
  If the frontend is on a different origin, add that origin to Keycloak client **Web origins** and to the gateway CORS config if you restrict origins.

- **Refresh token**  
  The frontend uses `updateToken(30)` so the access token is refreshed when it has less than 30 seconds validity. For long sessions, ensure the client has **Refresh token** enabled in Keycloak if needed.
