# Strategy Forge

**AI-powered generative trading strategy platform** — scalable, resilient, low-latency. Built from the [strategy-forge PDF](strategy-forge.pdf) architecture (6 pillars: Data, Features, RAG Strategy Generation, Backtesting, MLOps, UI).

## Architecture

| Layer | Tech | Purpose |
|-------|------|--------|
| **Frontend** | React (Vite + TypeScript) | Dashboard: generate strategies, run backtests, view results |
| **Gateway** | Java 17 + Spring Boot | API gateway: proxy to Python, circuit breaker, Redis cache, single entrypoint |
| **Strategy API** | Python 3.11 + FastAPI | Data ingestion, feature extraction, RAG + LLM strategy generation, backtesting |
| **Data / ML** | Redis, ChromaDB, MLflow | Cache, vector store for RAG, experiment tracking |

- **Request flow:** Browser → Java (8080) → Python (8000). Frontend in dev proxies `/api` to Java.
- **Resilience:** Circuit breaker and retries (Resilience4j) on gateway; optional Redis for caching.
- **Scale:** Stateless services; horizontal scaling of gateway and Python workers; Redis and Chroma/MLflow as shared state.

## Quick start

### Prerequisites

- **Local:** Node 20+, Python 3.11+, Java 17+, Redis (optional), Docker (optional)
- **Env (optional):** `NEWS_API_KEY`, `ANTHROPIC_API_KEY` for news and LLM strategy generation

### 1. Run with Docker Compose

```bash
docker compose up -d
```

- Frontend: http://localhost:3000  
- Java API: http://localhost:8080  
- Python API: http://localhost:8000  
- MLflow: http://localhost:5000  

### 2. Run on Docker Desktop Kubernetes (single command)

With **Kubernetes enabled in Docker Desktop** (Settings → Kubernetes → Enable). No package manager—plain YAML + `kubectl` only.

**Build all images and deploy to K8s:**

```bash
./build-and-run.sh
```

Then open **http://localhost:30080**. To tear down: `kubectl delete -f k8s/all-in-one.yaml`.

See **[k8s/README.md](k8s/README.md)** for details.

### 3. Run locally (dev)

**Terminal 1 – Python**

```bash
cd backend-python
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Terminal 2 – Java**

```bash
cd backend-java
./gradlew bootRun   # or: gradle bootRun (if you have Gradle)
# If you don't have Gradle wrapper: gradle wrapper then ./gradlew bootRun
```

**Terminal 3 – Frontend**

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — Vite proxies `/api` to `http://localhost:8080`.

### 4. API (via Java gateway)

- `POST /api/v1/strategies/generate` — body: `{ "symbol", "start_date", "end_date", "risk_tolerance" }`
- `POST /api/v1/backtest/run` — body: `{ "strategy", "symbol", "start_date", "end_date", "initial_capital" }`
- `GET /api/v1/strategies/top?limit=10`
- `GET /api/v1/health`

## How to use the application

Once the app is running (Docker Compose or Kubernetes), open the **frontend** in your browser:

- **Docker Compose:** http://localhost:3000  
- **Kubernetes:** http://localhost:30080  

### 1. Dashboard

Home page shows API status and links to **Generate Strategy**, **Backtest**, and **Top Strategies**.

### 2. Generate a strategy

1. Go to **Generate Strategy**.
2. Enter a **symbol** (e.g. `AAPL`), **start** and **end** dates, and **risk tolerance** (low/medium/high).
3. Click **Generate Strategy**.  
   The app fetches market data, computes technical indicators, (optionally) fetches news and sentiment, and uses RAG + optional LLM to produce a strategy with entry/exit rules, position sizing, and risk settings.
4. Review the generated strategy (name, entry rules, exit rules, stop loss, take profit).  
   You can use this strategy in the Backtest page.

### 3. Run a backtest

1. Go to **Backtest**.
2. Enter **symbol**, **start** and **end** dates, and **initial capital** (e.g. 100000).
3. Either:
   - Use the **default strategy** in the JSON box, or  
   - Paste a **strategy** you got from **Generate Strategy** (or edit the JSON).
4. Click **Run Backtest**.  
   The app runs a simulated backtest and shows **Total return**, **Sharpe ratio**, **Max drawdown**, **Win rate**, **Trade count**, **Final equity**, and an **equity curve** chart.

### 4. Top strategies

Go to **Top Strategies** to see strategies ranked by performance (from MLflow). Run and log backtests to populate this list.

### Optional: API only

You can call the APIs directly (e.g. with `curl` or Postman) via the **gateway**:

- **Docker Compose:** base URL `http://localhost:8080`  
- **Kubernetes:** `kubectl port-forward -n strategy-forge svc/gateway 8080:8080`, then `http://localhost:8080`  

Example — generate a strategy:

```bash
curl -X POST http://localhost:8080/api/v1/strategies/generate \
  -H "Content-Type: application/json" \
  -d '{"symbol":"AAPL","start_date":"2023-01-01","end_date":"2024-01-01","risk_tolerance":"medium"}'
```

## Project layout

```
strategy-forge/
├── backend-python/          # FastAPI app
│   ├── app/
│   │   ├── api/routes.py     # REST: generate, backtest, top, health
│   │   ├── services/        # market_data, news_data, feature_engineering,
│   │   │                    # sentiment_analysis, vector_db, strategy_generator,
│   │   │                    # backtest_engine, mlflow_tracking
│   │   └── config.py
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── backend-java/             # Spring Boot gateway
│   ├── src/main/java/com/strategyforge/
│   │   ├── config/           # RestTemplate, Python base URL
│   │   ├── client/           # PythonApiClient
│   │   └── web/              # GatewayController (proxy + circuit breaker)
│   ├── build.gradle.kts
│   └── Dockerfile
├── frontend/                 # React + Vite + TS
│   ├── src/
│   │   ├── api/client.ts     # generateStrategy, runBacktest, getTopStrategies
│   │   ├── components/
│   │   └── pages/            # Dashboard, Generate, Backtest, TopStrategies
│   ├── package.json
│   ├── nginx.conf            # for Docker serve + /api proxy
│   └── Dockerfile
├── docker-compose.yml        # gateway, python-api, frontend, redis, mlflow
├── k8s/                      # Kubernetes manifests for Docker Desktop K8s
│   ├── all-in-one.yaml       # single-file template: kubectl apply -f k8s/all-in-one.yaml
│   ├── deploy.sh             # build images + kubectl apply -f all-in-one.yaml
│   └── README.md
├── .github/workflows/ci.yml  # Python lint, Java build, Frontend build
└── README.md
```

## Configuration

- **Python:** `backend-python/.env` or env: `NEWS_API_KEY`, `ANTHROPIC_API_KEY`, `MLFLOW_TRACKING_URI`, `REDIS_URL`, `CHROMA_PERSIST_DIR`
- **Java:** `application.yml`: `strategy-forge.python-api.base-url`, `spring.data.redis.*`
- **Frontend:** In dev, `vite.config.ts` proxies `/api` to port 8080.

### Email configuration (for entry/exit alerts)

Email is **optional**. Set these only if you want the app to send alerts when entry or exit conditions match (Alerts page or `POST /api/v1/signals/check`).

| Variable | Required | Description |
|----------|----------|-------------|
| `SMTP_HOST` | Yes* | SMTP server hostname |
| `SMTP_PORT` | No | Port (default `587`) |
| `SMTP_USER` | Yes* | SMTP login (often your email) |
| `SMTP_PASSWORD` | Yes* | SMTP password or app password |
| `SMTP_USE_TLS` | No | `true` (default) or `false` |
| `ALERT_EMAIL_FROM` | No | From address (defaults to `SMTP_USER`) |
| `ALERT_EMAIL_TO` | No** | Default recipients, comma-separated |

\* Required for email to be sent. If any of these are missing, alerts are skipped.  
\** If not set, you must pass `emails` in the request when calling the signal check.

**Where to configure**

1. **Local run (Python only)**  
   In `backend-python/` create a `.env` file (see `backend-python/.env.example`):
   ```bash
   cd backend-python
   cp .env.example .env
   # Edit .env and set SMTP_* and ALERT_EMAIL_TO
   ```

2. **Docker Compose**  
   Add the variables under `python-api` in `docker-compose.yml` or use an env file:
   ```yaml
   python-api:
     environment:
       # ... existing ...
       SMTP_HOST: smtp.gmail.com
       SMTP_PORT: "587"
       SMTP_USER: your-email@gmail.com
       SMTP_PASSWORD: ${SMTP_PASSWORD}   # set in shell or .env
       ALERT_EMAIL_TO: you@example.com
   ```

3. **Kubernetes**  
   Create a Secret for SMTP and add env to the `python-api` deployment in `k8s/all-in-one.yaml`, or use a ConfigMap for non-secret values and Secret for `SMTP_PASSWORD` and `ALERT_EMAIL_TO`.

**Example: Gmail**

- Use an [App Password](https://support.google.com/accounts/answer/185833) (2FA required), not your normal password.
- `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USE_TLS=true`, `SMTP_USER` = your Gmail, `SMTP_PASSWORD` = app password.

**Example: SendGrid / other**

- Use the provider’s SMTP host and port, and the API key or SMTP credentials they give you for `SMTP_USER` / `SMTP_PASSWORD`.

## Extending

- **LLM:** Set `ANTHROPIC_API_KEY`; strategy generator uses Claude (RAG + ChromaDB) when available.
- **FinBERT:** In `sentiment_analysis.py`, use `FinancialSentimentAnalyzer(use_finbert=True)` (requires `transformers`, `torch`).
- **Email alerts:** Use the **Alerts** page or `POST /api/v1/signals/check` with `{ "strategy", "symbol", "emails"?: [] }` to check latest data and send entry/exit emails when SMTP is configured.

## License

Use as reference or starting point for your own strategy platform.
