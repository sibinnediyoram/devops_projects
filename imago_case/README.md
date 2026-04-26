# IMAGO Infrastructure Design — Technical Challenge Submission

## Overview

This submission covers the infrastructure design for IMAGO's media delivery platform across three core services: the **Web App**, **Media Search Service** (with ElasticSearch), and **Media Download Service**. The approach is pragmatic — targeting modern, automated infrastructure while acknowledging the hybrid reality of an organization mid-migration.

---

## Repository Structure

```
imago_case/
├── README.md                          ← You are here
├── docs/
│   ├── architecture.md               ← Detailed architecture decisions and diagrams
│   ├── migration-strategy.md         ← IaC introduction and Windows/Linux transition
│   └── operations.md                 ← Runbooks, on-call, and operational strategy
├── terraform/
│   ├── environments/
│   │   ├── production/               ← Production environment root module
│   │   └── staging/                  ← Staging environment root module
│   └── modules/
│       ├── hcloud-k8s/               ← Hetzner K3s cluster provisioning
│       ├── hcloud-network/           ← Private network and firewall rules
│       └── hcloud-lb/                ← Load balancer configuration
├── kubernetes/
│   ├── namespaces/                   ← Namespace definitions (incl. traefik, cert-manager)
│   ├── apps/                         ← Base manifests — staging defaults (replicas: 1, no HPA)
│   │   ├── web-app/                  ← deployment, svc, rbac, networkpolicy, ingress, kustomization.yaml
│   │   ├── media-search/             ← deployment, elasticsearch (ECK), rbac, kustomization.yaml
│   │   └── media-download/           ← deployment, svc, ingress, rbac, kustomization.yaml
│   ├── overlays/
│   │   └── production/               ← Production patches: replicas: 2-3, HPA per service
│   │       ├── web-app/              ← kustomization.yaml, replica-patch.yaml, hpa.yaml
│   │       ├── media-search/         ← kustomization.yaml, replica-patch.yaml, hpa.yaml
│   │       └── media-download/       ← kustomization.yaml, replica-patch.yaml, hpa.yaml
│   ├── platform/
│   │   ├── cert-manager/             ← ClusterIssuer definitions (letsencrypt, letsencrypt-staging)
│   │   └── eck/                      ← ECK operator install instructions and namespace
│   ├── monitoring/                   ← Prometheus, Grafana, Loki configs
│   └── gitops/argocd/
│       ├── apps/
│       │   ├── staging/              ← ArgoCD Applications pointing to base (for staging cluster)
│       │   └── production/           ← ArgoCD Applications pointing to overlays (for prod cluster)
│       ├── app-of-apps-staging.yaml  ← Bootstrap for staging cluster ArgoCD
│       └── app-of-apps-production.yaml ← Bootstrap for production cluster ArgoCD
├── ansible/                          ← Manages non-K8s hosts during bare metal → cloud migration
|    ├── inventories/
|    │   ├── production/
|    │   │   └── hosts.yml            ← bare_metal_linux + windows_legacy groups (no K8s nodes)
|    │   └── staging/
|    │       └── hosts.yml            ← mirrors prod structure, fewer hosts
|    ├── playbooks/
|    │   ├── site.yml                 ← top-level entry point (imports all)
|    │   ├── linux-baseline.yml       ← OS hardening + node_exporter for Linux bare metal
|    │   └── windows-baseline.yml     ← WinRM HTTPS + windows_exporter for Windows hosts
|    └── roles/
|        ├── linux-baseline/          ← SSH hardening, ufw, NTP, unattended-upgrades
|        ├── monitoring-agent/        ← node_exporter systemd service (Prometheus parity)
|        └── windows-baseline/        ← windows_exporter, service state, WinRM config
└── .github/workflows/                ← CI/CD pipeline definitions
```

---

## Assumptions

These are explicitly stated so reviewers can evaluate my reasoning, not just the output.

| Area | Assumption |
|------|-----------|
| **Traffic** | Web App handles ~5K–50K requests/hour peak; Search Service is read-heavy (10:1 read/write); Download Service handles large file transfers with burst patterns |
| **Availability** | Web App and Download Service require 99.9% SLA; Search Service can tolerate brief degradation with graceful fallback to cached results |
| **Environments** | At minimum: production and staging. Development environments run locally via kind/k3d |
| **Team size** | Small-to-medium engineering team (5–15 engineers); not a fully platform-engineering-staffed org |
| **Existing state** | Mix of manually provisioned Hetzner servers (some bare metal, some cloud VMs), configuration managed inconsistently or by hand |
| **Windows** | Windows systems are used for legacy tooling or internal tools; not expected to run containerized workloads short-term |
| **Secrets** | I assume a secret store exists or will be bootstrapped (Vault or Hetzner Secrets Manager); secrets are not committed |
| **Domain/TLS** | IMAGO owns its domains; cert-manager with Let's Encrypt handles TLS automatically |
| **Bare metal role** | IMAGO currently runs a mix of bare metal and cloud. The **new target design** is all cloud VMs — hcloud-volumes (CSI) only attach to cloud VMs, making durable PVC-backed storage (required by Elasticsearch/ECK) impossible on bare metal. **Migration path:** existing bare metal workloads are managed with Ansible until individually migrated to Kubernetes. Once migrated and validated, the bare metal node is decommissioned. Windows systems follow the same Ansible-managed holding pattern. See `docs/migration-strategy.md`. |
| **Git hosting** | GitHub (or equivalent) — pipelines use GitHub Actions |

---

## Architecture and Design Decisions
### Platform: Kubernetes on Hetzner (K3s)

**Why K3s:** K3s is production-grade, runs well on Hetzner's VMs and bare metal, has a minimal footprint, and doesn't require managing etcd yourself. The entire control plane fits on a modest server. It's the practical choice for a team that wants Kubernetes without the operational overhead of full upstream K8s.

**Why not managed Kubernetes (e.g., DOKS, EKS):** IMAGO runs on Hetzner infrastructure specifically. Hetzner's managed Kubernetes (HKCP) is an option, but K3s gives more control and is better tested against bare metal scenarios.

**Node pools (all Hetzner Cloud VMs):**
- **Control plane:** 3× CX31 (4 vCPU, 8 GB RAM) — HA etcd embedded
- **General workloads:** 3× CX41 (8 vCPU, 16 GB RAM) — Web App, Media Search service layer
- **Storage workloads:** 3× CX51 (16 vCPU, 32 GB RAM) — Elasticsearch (ECK) and Media Download Service

> **Why all cloud, no bare metal?** Hetzner block volumes (hcloud-volumes via CSI) only attach to cloud VMs. Elasticsearch requires PVC-backed storage for data durability across node replacements — local NVMe on bare metal would lose data if the node is decommissioned. CX51 with 32 GB RAM provides sufficient headroom for the 16 GB ES JVM heap plus OS overhead at IMAGO's assumed traffic scale.


### Service Architecture

```
Internet
   │
   ▼
Hetzner Cloud Load Balancer (Layer 4)
   │
   ▼
Traefik Ingress Controller (Layer 7, TLS termination)
   │
   ├──► web-app (namespace: imago-web)
   │         │
   │         └──► media-search-service (namespace: imago-search)
   │                    │
   │                    └──► ElasticSearch (ECK-managed, hcloud-volumes PVCs)
   │
   └──► media-download-service (namespace: imago-download)
              │
              └──► Object Storage (Hetzner S3-compatible)
```

**Namespace isolation:** Each service runs in its own namespace with NetworkPolicies that restrict lateral movement. The Web App can call Search; nothing should call Download except through its ingress.

### Infrastructure as Code Approach

- **Terraform** provisions all Hetzner resources (servers, networks, load balancers, volumes, firewalls)
- **Helm** manages third-party software (kube-prometheus-stack, ArgoCD, cert-manager, Traefik)
- **Raw Kubernetes manifests** for IMAGO's own services — keeps them readable and diff-able in PRs, also can use with Kustomize overlays for multi-env.
- **ArgoCD** for GitOps: the cluster reconciles itself against the Git repository continuously

State is stored in an S3-compatible backend with Hetzner Object Storage. State locking is mandatory.

### Observability Stack

| Layer | Tool | Rationale |
|-------|------|-----------|
| Metrics | Prometheus + kube-prometheus-stack | Industry standard, works well with K8s, pre-built dashboards |
| Dashboards | Grafana | Unified view across metrics, logs, traces |
| Logs | Loki + Promtail | Pairs with Grafana, low-cost log aggregation, label-based querying |
| Tracing | Tempo (optional initially) | Distributed tracing when debugging cross-service latency becomes needed |
| Alerting | Alertmanager → PagerDuty/Slack | Route alerts to on-call; Slack for low-urgency, PagerDuty for SLA-critical |

Key dashboards to build first:
1. **Platform health** — node CPU/memory, pod restarts, PVC usage
2. **Service SLOs** — request rate, error rate, p99 latency per service
3. **ElasticSearch cluster health** — shard state, indexing rate, JVM heap
4. **Media download throughput** — bytes served, concurrent connections, CDN hit rate

---

## Trade-offs

| Decision | Trade-off |
|----------|-----------|
| K3s over full K8s | Simpler operation, but less flexibility for advanced features (e.g., custom API server webhooks). Acceptable for this scale. |
| Raw manifests over Helm for IMAGO services | More readable diffs and easier PR review, but requires more manual templating for multi-env config. |
| ArgoCD for GitOps | Requires ArgoCD itself to be healthy for deployments. Bootstrap chicken-and-egg problem mitigated by having a manual deploy fallback. |
| Loki over ELK for logging | Much cheaper to operate than Elasticsearch-based logging stack. Trade-off: less powerful full-text search on logs. |
| All cloud, no bare metal | Task mentions bare metal as part of IMAGO's current reality. New design uses Hetzner Cloud VMs exclusively. Trade-off: lose bare metal NVMe IOPS, gain hcloud-volumes durability (data survives node replacement), single Terraform API, no Robot API complexity, no hardware lead times. Acceptable at assumed traffic scale. |
| Hetzner-only | Cost-effective, but single-provider risk. Multi-cloud is out of scope for a 6-hour exercise; documented as future concern. |

---

## Limitations of This Solution

- **No secrets management implementation** — Vault integration or External Secrets Operator would be the next step; secrets are templated as placeholders
- **No autoscaling for ElasticSearch** — ECK supports node count changes but adding ES nodes requires provisioning a new CX51 storage-pool VM first (Terraform). Horizontal scaling is manual; runbook in `docs/operations.md`
- **No CDN layer configured** — Media Download Service would benefit from Cloudflare or Hetzner's CDN; architecture accommodates it but it's not provisioned
- **No multi-region setup** — Hetzner has multiple DCs; geo-redundancy is not covered here
- **Ansible covers baseline only** — Roles exist for OS hardening, node_exporter, and Windows baseline (WinRM, windows_exporter, service state). Service-specific migration playbooks (e.g. moving a legacy media pipeline to K8s) are out of scope; those are per-workload tasks documented in the migration strategy.
- **Monitoring alert rules are illustrative** — Thresholds need tuning based on actual baseline metrics

---

## What I Would Add With More Time

1. **Vault** for secrets management with K8s auth backend
2. **External Secrets Operator** to sync Vault secrets into K8s
3. **Velero** for cluster backup and disaster recovery
4. **Goldilocks** for right-sizing resource requests/limits based on VPA recommendations
5. **OPA/Gatekeeper** for policy enforcement (no privileged pods, required labels, etc.)
6. **Crossplane** if IMAGO wants to manage infrastructure from within K8s
7. **Global helm chart for imago apps** no need to maintain plain manifests, overlays or individual helm chart for apps, only values needed to override in argocd app manifest
8. **Full Ansible role library** for both Linux bare metal and Windows systems during transition — currently only a skeleton exists; a complete set of roles would cover OS hardening, monitoring agent deployment, and service-specific configuration for every class of non-K8s host
9. **A proper DR runbook** with RTO/RPO targets per service
10. **Load testing harness** Benchmarking to validate the platform before go-live
11. **Kubernetes Distribution Evolution** I selected K3s to quickly and reliably bridge the gap between Hetzner Cloud VMs and Bare Metal with low operational overhead. For a long-term enterprise target, I would evaluate upgrading to RKE2(Rancher Kubernetes Engine 2).

---

## How to Navigate This Repository

Start here → `README.md` for the big picture.

For architecture depth → `docs/architecture.md`

For migration approach → `docs/migration-strategy.md`

For running the IaC:
1. `terraform/environments/production/` — bootstrap Hetzner infrastructure
2. `kubernetes/namespaces/` → `kubernetes/apps/` → `kubernetes/monitoring/` — apply in order
3. `kubernetes/gitops/argocd/` — once ArgoCD is running, it takes over reconciliation

For CI/CD → `.github/workflows/` contains the pipeline definitions with inline comments.

---

## Quick Start (Staging Environment)

```bash
# 1. Provision infrastructure
cd terraform/environments/staging
cp terraform.tfvars.example terraform.tfvars
# Fill in your HCLOUD_TOKEN and other vars
terraform init
terraform plan
terraform apply

# 2. Bootstrap the cluster (K3s installed via Terraform cloud-init)
# kubeconfig must be copied manually — see the next_steps output printed by terraform apply:
#   ssh ubuntu@<first_control_plane_ip>
#   sudo cat /etc/rancher/k3s/k3s.yaml | sed 's/127.0.0.1/<lb_public_ip>/g' > ~/.kube/config

# 3. Install cluster-level components (ArgoCD, cert-manager, Traefik, ECK)
kubectl apply -f kubernetes/namespaces/namespaces.yaml
kubectl apply -f kubernetes/platform/cert-manager/cluster-issuer.yaml
helm repo add elastic https://helm.elastic.co
helm upgrade --install elastic-operator elastic/eck-operator \
  --namespace elastic-system --create-namespace --version 2.14.0
kubectl apply -k kubernetes/gitops/argocd/

# 4. Bootstrap ArgoCD with the environment-specific App-of-Apps
# Staging cluster:
kubectl apply -f kubernetes/gitops/argocd/app-of-apps-staging.yaml
# Production cluster:
kubectl apply -f kubernetes/gitops/argocd/app-of-apps-production.yaml

# ArgoCD will auto-discover and deploy:
#   Staging  → kubernetes/apps/*          (replicas: 1, no HPA)
#   Prod     → kubernetes/overlays/production/* (replicas: 2-3, with HPA)

# 5. Access Grafana
kubectl port-forward svc/grafana 3000:80 -n monitoring
```
