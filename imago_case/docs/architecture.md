# Architecture and Platform Design

## Infrastructure Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Hetzner Infrastructure                        │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                 Hetzner Cloud Load Balancer                   │    │
│  │           (Public IP, TCP/443 + TCP/80 → HTTPS redirect)     │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                             │                                         │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │                    Private Network (10.0.0.0/16)              │    │
│  │                                                               │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │    │
│  │  │ Control Plane│  │ Control Plane│  │  Control Plane   │   │    │
│  │  │  CX31 #1     │  │  CX31 #2     │  │   CX31 #3        │   │    │
│  │  │ 10.0.1.1     │  │ 10.0.1.2     │  │  10.0.1.3        │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘   │    │
│  │                                                               │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │    │
│  │  │ Worker Node  │  │ Worker Node  │  │   Worker Node    │   │    │
│  │  │  CX41 #1     │  │  CX41 #2     │  │    CX41 #3       │   │    │
│  │  │ 10.0.2.1     │  │ 10.0.2.2     │  │   10.0.2.3       │   │    │
│  │  │ (general)    │  │ (general)    │  │   (general)      │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘   │    │
│  │                                                               │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │    │
│  │  │ Storage Node │  │ Storage Node │  │  Storage Node    │   │    │
│  │  │  CX51 #1     │  │  CX51 #2     │  │   CX51 #3        │   │    │
│  │  │ 10.0.3.1     │  │ 10.0.3.2     │  │  10.0.3.3        │   │    │
│  │  │ (search/dl)  │  │ (search/dl)  │  │ (search/dl)      │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## Node Labeling and Scheduling Strategy

```yaml
# Control plane nodes
node-role.kubernetes.io/control-plane: ""
node.imago.io/pool: control-plane

# General workload nodes (CX41 cloud VMs)
node.imago.io/pool: general
node.imago.io/type: cloud

# Storage-pool nodes (CX51 cloud VMs — Elasticsearch + media-download)
node.imago.io/pool: storage
node.imago.io/type: cloud
```

Node affinity rules ensure:
- Elasticsearch (ECK) pods land only on storage-pool nodes (CX51, 32 GB) — hcloud-volumes attach here
- Media Download Service prefers storage-pool nodes for network throughput
- Web App and media-search service layer run on general-pool nodes (CX41)

> **Design decision — all cloud, no bare metal:**
> The task describes IMAGO's current infrastructure as a mix of bare metal and cloud. The **new target design** uses exclusively Hetzner Cloud VMs. Bare metal was considered for Elasticsearch (NVMe IOPS) but ruled out because:
> - `hcloud-volumes` (CSI) only attach to cloud VMs — bare metal uses the Robot API which has no block storage attachment
> - ES data on local NVMe is lost if the node is replaced; hcloud-volumes survive node lifecycle
> - CX51 (32 GB, network SSD) provides adequate performance for a read-heavy search index at IMAGO's assumed scale
> - Single API surface (Hetzner Cloud API) simplifies Terraform, removes Robot API dependency, eliminates hardware lead times

## Kubernetes Cluster Design

### Cluster Setup: K3s

K3s is deployed with:
- Embedded etcd (HA mode with 3 control plane nodes)
- External load balancer for the K8s API server (Hetzner private LB)
- Flannel CNI (default, sufficient for this scale; Cilium is an upgrade path)
- Traefik disabled by default — we install our own Traefik 2.x via Helm for full control

> **Important — Traefik must be pinned to general-pool nodes.** The Hetzner Load Balancer target selector (`role=worker`) routes traffic only to general-pool worker nodes (CX41). Traefik pods must be scheduled there to receive traffic. Configure via Helm values:
> ```yaml
> nodeSelector:
>   node.imago.io/pool: general
> ```
> If Traefik schedules onto storage-pool nodes (CX51), the LB health checks will fail silently and ingress will be unreachable.

### Namespace Architecture

```
cluster
├── kube-system           ← K8s system components
├── cert-manager          ← TLS certificate automation
├── traefik               ← Ingress controller
├── argocd                ← GitOps controller
├── monitoring            ← Prometheus, Grafana, Loki, Alertmanager
├── imago-web             ← Web App
├── imago-search          ← Media Search Service + ElasticSearch
└── imago-download        ← Media Download Service
```

RBAC: Each namespace has a dedicated ServiceAccount. CI/CD tools and ArgoCD use restricted roles. No wildcards on production namespaces.

## Service Design

### IMAGO Web App (imago-web)

- **Deployment:** 3+ replicas, rolling update strategy
- **Resource requests:** 250m CPU, 512Mi memory per pod
- **HPA:** Scale 3–10 based on CPU (70%); media-search and media-download also have HPAs (2–6 and 2–8 respectively)
- **Ingress:** `app.imago.de` → TLS via cert-manager (Let's Encrypt)
- **Calls to:** Media Search Service (internal ClusterIP), Media Download Service (internal or via signed URLs)
- **Health checks:** `/healthz` (liveness), `/readyz` (readiness)

### Media Search Service (imago-search)

- **Deployment:** 2–4 replicas of the search API layer
- **ElasticSearch:** 3-node cluster managed by ECK (Elastic Cloud on Kubernetes operator), anti-affinity across cloud nodes
- **ElasticSearch storage:** Hetzner Cloud Volumes (`hcloud-volumes`, 500Gi per node) — durable, survives node replacement
- **Node placement:** General cloud nodes (`node.imago.io/pool: general`) — bare metal is not required; `hcloud-volumes` cannot attach to bare metal
- **Resource requests (ES):** 2 CPU request / 4 CPU limit, 16Gi memory (JVM heap = 8Gi)
- **TLS:** ECK manages TLS certificates automatically (self-signed CA); secrets injected into media-search pods
- **Credentials:** ECK auto-creates `imago-media-search-es-elastic-user` secret; no manual password management
- **Ingress:** Not externally exposed — only reachable from `imago-web` namespace via NetworkPolicy
- **Backup:** Elasticsearch snapshots to Hetzner Object Storage daily

### Media Download Service (imago-download)

- **Deployment:** 2–4 replicas
- **Ingress:** `dl.imago.de` → TLS
- **Security:** Signed URLs with short TTL (15 min) — prevents hotlinking and unauthorized access
- **Storage access:** Mounts Hetzner Object Storage via s3fs or streams from S3 API directly
- **NetworkPolicy:** Only accepts inbound from LB; egresses to object storage only
- **Rate limiting:** Traefik middleware (100 req/min per IP for signed URL generation)

## Networking and Security

### Firewall Rules (Hetzner Cloud Firewall)

```
Inbound allowed:
  - TCP 443 (HTTPS) from 0.0.0.0/0 → Load Balancer only
  - TCP 80 (HTTP) from 0.0.0.0/0 → Load Balancer only (redirect to HTTPS)
  - TCP 6443 (K8s API) from bastion/VPN IP only
  - TCP 22 (SSH) from bastion/VPN IP only

Internal (private network):
  - All traffic allowed between nodes in 10.0.0.0/16

Outbound:
  - All allowed (OS updates, image pulls, Letsencrypt ACME)
```

### TLS Strategy

- cert-manager with ClusterIssuer pointing to Let's Encrypt production
- Certificates stored as K8s secrets
- Traefik reads certificates automatically via IngressRoute annotations
- Wildcard certificate for `*.imago.de` for flexibility

### Secret Management

Current approach (pragmatic for this exercise):
- Kubernetes Secrets (base64 encoded) — acceptable with RBAC and namespace isolation
- Secrets created manually or via sealed-secrets for GitOps safety

Recommended next step:
- HashiCorp Vault with K8s auth backend
- External Secrets Operator to sync Vault → K8s Secrets automatically

## Storage Design

| Use Case | Solution | Rationale |
|----------|----------|-----------|
| ElasticSearch data | Bare metal local NVMe (or Hetzner Volume) | Low latency, high IOPS required |
| Media assets (originals) | Hetzner Object Storage (S3-compatible) | Cost-effective, durable, decoupled from compute |
| Grafana/Prometheus data | Hetzner Cloud Volumes (50–200 GB) | Persistent, survives node restarts |
| Loki chunks | Hetzner Object Storage | Cheap long-term log storage |

## Scalability Considerations

- **Web App:** Horizontal scaling via HPA is the primary lever. Stateless by design.
- **Media Search:** ElasticSearch scales by adding data nodes (requires care — not automated). Query load balanced across replicas. Consider adding coordinating-only nodes for large query bursts.
- **Media Download:** Horizontally scalable; the bottleneck is network bandwidth and object storage throughput, not compute.
- **Control plane:** 3 nodes provide HA. Not a scaling bottleneck at this scale.

## Disaster Recovery Considerations (Documented, Not Implemented)

| Scenario | Recovery approach | RTO estimate |
|----------|-------------------|--------------|
| Single node failure | K8s reschedules pods automatically | < 5 min |
| Control plane node loss | etcd quorum maintained with 3 nodes; replace node | 30–60 min |
| Full cluster loss | Rebuild from Terraform + restore from Velero backup | 2–4 hours |
| Data loss (ElasticSearch) | Restore from daily snapshot in object storage | 1–2 hours |
| Object storage unavailable | No direct mitigation — single-provider risk | N/A |
