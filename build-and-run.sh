#!/usr/bin/env bash
# Strategy Forge: build all images and deploy to Kubernetes (Docker Desktop or local K8s).
# Run from repository root: ./build-and-run.sh
kubectl delete -f k8s/all-in-one.yaml

set -e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "==> Building Docker images..."
docker build -t strategy-forge-python-api:latest ./backend-python
docker build -t strategy-forge-gateway:latest ./backend-java
docker build -t strategy-forge-frontend:latest ./frontend

echo "==> Deploying to Kubernetes..."
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
echo "    Frontend:  http://localhost:30080"
echo "    Stop:      kubectl delete -f k8s/all-in-one.yaml"
