# Strategy Forge on Kubernetes (Docker Desktop)

Deploy Strategy Forge to **Docker Desktop’s built-in Kubernetes** (or any local K8s cluster that uses images from your local Docker daemon).

**No package manager required** — we use plain Kubernetes YAML and `kubectl` only (no Helm, Kustomize, or other tools). One file, one command.

## Prerequisites

1. **Docker Desktop** with Kubernetes enabled:  
   Settings → Kubernetes → Enable Kubernetes → Apply.
2. **kubectl** (included with Docker Desktop, or install separately).
3. **Images must be built locally first** (see below). The manifests use `imagePullPolicy: Never` so the cluster uses only your local images and does not pull from a registry. Required image names:
   - `strategy-forge-gateway:latest`
   - `strategy-forge-python-api:latest`
   - `strategy-forge-frontend:latest`

## Quick deploy (single file)

From the **repository root**:

```bash
# 1. Build images (required for Docker Desktop K8s to use them)
docker build -t strategy-forge-python-api:latest ./backend-python
docker build -t strategy-forge-gateway:latest ./backend-java
docker build -t strategy-forge-frontend:latest ./frontend

# 2. Deploy all K8s objects with one command
kubectl apply -f k8s/all-in-one.yaml
```

Or use the script (builds images then applies the single file):

```bash
./k8s/deploy.sh
```

To remove everything:

```bash
kubectl delete -f k8s/all-in-one.yaml
```

## Access the app

- **Frontend (main entry):**  
  - If the `frontend` Service gets an External IP (common on Docker Desktop): open `http://<EXTERNAL-IP>` (often `http://localhost`).  
  - If External IP stays `<pending>`: use port-forward:
    ```bash
    kubectl port-forward -n strategy-forge svc/frontend 3000:80
    ```
  Then open **http://localhost:3000**.

- **Gateway API:**  
  `kubectl port-forward -n strategy-forge svc/gateway 8080:8080` → http://localhost:8080

- **Python API:**  
  `kubectl port-forward -n strategy-forge svc/python-api 8000:8000` → http://localhost:8000

- **MLflow:**  
  `kubectl port-forward -n strategy-forge svc/mlflow 5000:5000` → http://localhost:5000

## Useful commands

```bash
# Status
kubectl get all -n strategy-forge

# Logs
kubectl logs -n strategy-forge -l app=gateway -f
kubectl logs -n strategy-forge -l app=python-api -f
kubectl logs -n strategy-forge -l app=frontend -f

# Delete everything (same single file)
kubectl delete -f k8s/all-in-one.yaml
# Or: kubectl delete namespace strategy-forge
```

## Using NodePort for frontend (optional)

If you prefer a fixed node port instead of LoadBalancer/port-forward:

```bash
kubectl patch svc frontend -n strategy-forge -p '{"spec": {"type": "NodePort"}}'
kubectl get svc frontend -n strategy-forge   # note the NodePort (e.g. 31234)
# Open http://localhost:<NodePort>
```

Or edit `k8s/frontend.yaml`: set `type: NodePort` and add `nodePort: 30080` under `ports`, then re-apply.

## Troubleshooting: ImagePullBackOff

This usually means Kubernetes tried to pull an image from a remote registry (e.g. Docker Hub) and failed, because our app images exist only locally.

**Fix:**

1. **Build the images before deploying** (from repo root):
   ```bash
   docker build -t strategy-forge-python-api:latest ./backend-python
   docker build -t strategy-forge-gateway:latest ./backend-java
   docker build -t strategy-forge-frontend:latest ./frontend
   ```
2. **Confirm they exist:** `docker images | grep strategy-forge`
3. **Redeploy:** `kubectl apply -f k8s/all-in-one.yaml`

The manifests use `imagePullPolicy: Never`, so the cluster will only use these local images and will not try to pull them. If you still see ImagePullBackOff, ensure Docker Desktop’s Kubernetes is using the same Docker daemon (Settings → Kubernetes → “Use containerd for pulling and storing images” **unchecked** can help so it uses the Docker image store).
