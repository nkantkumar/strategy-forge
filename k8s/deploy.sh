#!/usr/bin/env bash
# Build images and deploy Strategy Forge to Kubernetes (Docker Desktop or local K8s).
# Run from repository root: ./k8s/deploy.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Building Docker images..."
docker build -t strategy-forge-python-api:latest ./backend-python
docker build -t strategy-forge-gateway:latest ./backend-java
docker build -t strategy-forge-frontend:latest ./frontend

echo "==> Applying Kubernetes manifests (single file)..."
kubectl apply -f k8s/all-in-one.yaml

echo "==> Waiting for rollout..."
kubectl rollout status deployment/redis -n strategy-forge --timeout=60s
kubectl rollout status deployment/mlflow -n strategy-forge --timeout=60s
kubectl rollout status deployment/python-api -n strategy-forge --timeout=120s
kubectl rollout status deployment/gateway -n strategy-forge --timeout=120s
kubectl rollout status deployment/frontend -n strategy-forge --timeout=60s

echo ""
echo "==> Strategy Forge deployed to namespace strategy-forge"
kubectl get svc -n strategy-forge
echo ""
echo "If frontend has EXTERNAL-IP (e.g. localhost), open it in a browser."
echo "Otherwise run: kubectl port-forward -n strategy-forge svc/frontend 3000:80"
echo "Then open http://localhost:3000"
