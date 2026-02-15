# Strategy Forge: Enterprise Readiness Guide

This document outlines how to evolve Strategy Forge from a development/demo setup to an **enterprise-grade** platform: security, scalability, observability, reliability, and operations.

---

## 1. Security

### Current state
- **Authentication:** API key auth is implemented at the gateway. When `AUTH_API_KEY` is set, clients must send header `X-API-Key` on `/api/v1/**`; `/actuator/**` stays public. Frontend supports `VITE_API_KEY` to send the key. When `AUTH_API_KEY` is not set, all requests are allowed (backward compatible).
- CORS still allows all origins (`allow_origins=["*"]`); restrict for production.
- Secrets (API keys, SMTP) come from env; not yet integrated with a vault.
- No audit trail of who did what; no RBAC.

### Enterprise steps

| Area | Action |
|------|--------|
| **Authentication** | **Done:** API key (`X-API-Key`) and **Keycloak** (OIDC JWT). Gateway validates Bearer tokens when `KEYCLOAK_ISSUER_URI` is set; frontend uses keycloak-js and sends the token. See [docs/KEYCLOAK.md](KEYCLOAK.md). Next: RBAC (roles per endpoint) and forward `X-User-Id`, `X-Roles` to Python. |
| **Authorization (RBAC)** | Define roles (e.g. `viewer`, `trader`, `admin`). In gateway or Python, check role per route (e.g. only `trader`/`admin` can run backtest or generate strategy). |
| **API security** | Restrict CORS to known frontend origins. Use HTTPS only (TLS termination at ingress or load balancer). Add API keys or mTLS for server-to-server if needed. |
| **Secrets** | Move secrets to a vault (HashiCorp Vault, AWS Secrets Manager, K8s Secrets with external sync). Inject at runtime; never commit secrets. |
| **Audit logging** | Log who (user/id), what (endpoint, strategy id, symbol), when, and outcome for sensitive actions (generate, backtest, signal check). Store in a dedicated audit log (e.g. ELK, Splunk, cloud logging). |

---

## 2. Scalability

### Current state
- Stateless Python and Java services (good for horizontal scaling).
- Single replica per deployment in K8s.
- Redis and MLflow/Chroma as shared state; no explicit connection pooling or backpressure.

### Enterprise steps

| Area | Action |
|------|--------|
| **Horizontal scaling** | Set `replicas: 2+` for gateway and Python API. Add **HorizontalPodAutoscaler (HPA)** based on CPU/memory or custom metrics (e.g. request rate). |
| **Load balancing** | Use K8s Service (already in place); add an **Ingress** (e.g. nginx, AWS ALB) with TLS and path-based routing instead of NodePort for production. |
| **Heavy operations** | Offload long-running jobs (e.g. backtest, strategy generation) to a **queue** (Redis + Celery, RabbitMQ, or SQS) and expose a “job id” API; frontend polls or uses WebSocket for status. Prevents timeouts and allows scaling workers independently. |
| **Caching** | Keep using Redis at the gateway for idempotent GETs; add cache headers and short TTLs for `/strategies/top`. Consider caching market data in Python (with invalidation by date/symbol). |
| **Data stores** | For production: persistent volumes for Chroma/MLflow; consider managed Redis and managed MLflow (e.g. Databricks). Add connection limits and health checks. |

---

## 3. Observability

### Current state
- Basic health endpoint (`/health`).
- Java gateway uses SLF4J logging; Python uses default logging. No centralized aggregation or request tracing.

### Enterprise steps

| Area | Action |
|------|--------|
| **Structured logging** | Use JSON logs (e.g. `structlog` in Python, JSON layout in Logback). Include `request_id`, `user_id`, `duration_ms`, `status`, and error details. |
| **Log aggregation** | Ship logs to a central store (ELK, Loki, Splunk, or cloud logging). Use sidecar or daemonset (e.g. Fluent Bit) in K8s. |
| **Metrics** | Expose **Prometheus** metrics from both Java (Micrometer) and Python (e.g. `prometheus_client`): request count, latency, error rate per endpoint; backtest/generate duration; queue depth if you add a job queue. |
| **Tracing** | Add **distributed tracing** (OpenTelemetry or Jaeger): trace from gateway → Python → external calls (market data, LLM). Correlate with logs via trace_id. |
| **Dashboards & alerting** | Build Grafana dashboards from Prometheus metrics. Alert on error rate, latency p99, circuit breaker open, and job failures. |
| **Health** | Keep `/health`; add **liveness** and **readiness** probes in K8s (readiness: depend on Redis/MLflow if required). |

---

## 4. Reliability

### Current state
- Circuit breaker and retries in the Java gateway (Resilience4j).
- No explicit rate limiting; no bulkhead for downstream calls.

### Enterprise steps

| Area | Action |
|------|--------|
| **High availability** | Multiple replicas for gateway and Python; anti-affinity or spread across zones if multi-AZ. Redis and MLflow in HA mode or managed services. |
| **Rate limiting** | Add rate limiting at the gateway (per user or per API key): e.g. Resilience4j `RateLimiter` or nginx/Ingress limits. Protect /generate and /backtest from overload. |
| **Timeouts & retries** | Keep circuit breaker; tune timeouts for Python and external APIs. Use retries with backoff for transient failures (already partially there). |
| **Disaster recovery** | Back up Chroma, MLflow, and config. Document restore procedure. Consider RTO/RPO and replicate critical data across regions if required. |
| **Graceful shutdown** | Ensure Java and Python drain in-flight requests on SIGTERM (FastAPI/uvicorn and Spring Boot support this with proper timeout). |

---

## 5. Operations

### Current state
- Manual build and deploy (`build-and-run.sh`); K8s YAML in a single file. No CI/CD, no staged environments.

### Enterprise steps

| Area | Action |
|------|--------|
| **CI/CD** | Pipeline (GitHub Actions, GitLab CI, or Jenkins): run tests (unit + integration), build images, push to registry, deploy to dev/staging. Promote to production via approval or canary. |
| **Environments** | Separate configs and namespaces for dev, staging, prod. Use different env vars and secrets per environment. |
| **Config management** | Keep 12-factor config (env); for advanced cases use ConfigMaps/Secrets or a config server. Feature flags for gradual rollout of new behavior. |
| **Image security** | Scan images (Trivy, Snyk) in CI. Use minimal base images and non-root user in containers. |
| **Kubernetes** | Consider splitting `all-in-one.yaml` into smaller manifests (or Helm chart) for clarity. Add ResourceQuota and LimitRange in namespaces. Use Ingress and TLS (e.g. cert-manager). |

---

## 6. Compliance & Governance

| Area | Action |
|------|--------|
| **Audit trail** | Log all sensitive operations (strategy generation, backtest, signal check, alert config) with user, timestamp, and input summary (e.g. symbol, strategy id). Retain according to policy. |
| **Data retention** | Define retention for MLflow runs, Chroma vectors, and logs. Automate deletion or archival. |
| **Access control** | Enforce RBAC; restrict production data and destructive actions to authorized roles. |
| **Regulatory** | If used for real trading or in regulated entities, involve legal/compliance for disclosure, record-keeping, and access policies. |

---

## 7. Suggested priority order

1. **Security**: Auth at gateway + RBAC; restrict CORS; secrets in vault.
2. **Observability**: Structured logs + metrics (Prometheus) + one dashboard and critical alerts.
3. **Reliability**: Rate limiting; HPA and 2+ replicas; health/readiness probes.
4. **Operations**: CI/CD for test and deploy; separate staging; image scanning.
5. **Scalability**: Ingress + TLS; optional job queue for heavy work; persistent storage for stateful components.

---

## Summary

Strategy Forge already has a solid base: stateless services, circuit breaker, Redis, and K8s manifests. Making it **enterprise-level** means adding **authentication and RBAC**, **observability (logs, metrics, tracing)**, **rate limiting and HA**, **CI/CD and config/secrets management**, and **audit and compliance** so it can be run securely and reliably at scale in a controlled environment.
