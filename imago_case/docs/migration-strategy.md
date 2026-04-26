# Migration Strategy

## Starting Point Assessment

Before any migration work begins, the first two weeks should be spent understanding what actually exists. This sounds obvious but is frequently skipped, leading to painful surprises later.

**Discovery checklist:**
- Inventory all servers (Hetzner Cloud VMs + bare metal): names, IPs, OS versions, installed software, who manages them
- Document which services run on which servers and their interdependencies
- Identify shared databases, shared disks, shared credentials
- Map network topology (what can reach what)
- Understand current deployment process: manual SSH? scripts? nothing?
- Flag Windows systems and what they do
- Identify any data stores that would be painful to migrate (large volumes, legacy formats)

Output: A plain-text or spreadsheet inventory. Not glamorous. Essential.

---

## Introducing IaC Into an Existing Environment

### Principle: Import Before Rewrite

The temptation is to declare "we're going full IaC from now on" and rewrite everything. This almost always fails because:
- Existing systems can't go offline during a long rewrite
- Operators lose confidence when the new system is unstable
- Undocumented behavior gets missed

**Instead: import, then iterate.**

#### Phase 1 — Terraform State Import (Weeks 1–4)

For every manually-provisioned Hetzner resource:

```bash
# Example: import an existing Hetzner server
terraform import hcloud_server.media_download_1 <server_id>

# Example: import an existing network
terraform import hcloud_network.main <network_id>
```

This brings existing infrastructure under Terraform state without destroying or modifying it. After import:
1. Run `terraform plan` — verify the plan shows no changes (if it does, align the HCL to match actual state)
2. Commit the HCL to Git
3. From this point, no changes are made manually — all changes go through `terraform apply`

#### Phase 2 — New Resources Are Always IaC (Ongoing)

Any new server, network, volume, or firewall rule **must** be provisioned via Terraform. No exceptions. Enforce this through:
- Team agreement and code review
- Tagging convention: resources without a `managed-by = terraform` tag are flagged in a weekly audit script

#### Phase 3 — Incremental Service Migration (Months 2–6)

For each service:
1. Provision the new Kubernetes-based version alongside the existing one
2. Route a small percentage of traffic to the new version (Traefik weighted routing or DNS-based)
3. Validate metrics and error rates
4. Gradually shift 100% of traffic
5. Keep old system running for 1–2 weeks as fallback
6. Decommission old system and remove from Terraform state

This is effectively blue/green at the infrastructure level.

---

## Linux and Windows Coexistence

### Reality Check

Eliminating Windows is a long-term goal. In the short term, Windows systems need to be managed consistently without becoming blockers for the Linux migration.

### Strategy for Windows Systems

**Immediate (no migration required):**
- Ansible for Windows (uses WinRM, not SSH) to manage configuration state
- Windows systems are inventoried and their configuration codified as Ansible playbooks
- This gives IaC-like repeatability without requiring containerization

```yaml
# ansible/inventories/production/hosts.yml
# K8s nodes are NOT listed here — Terraform + K3s cloud-init manages them.
all:
  children:
    bare_metal_linux:    # Linux servers awaiting K8s migration
      hosts:
        bm-media-legacy-01:
          ansible_host: 10.0.20.1
    windows_legacy:      # Windows servers — long-term Ansible managed
      vars:
        ansible_connection: winrm
        ansible_port: 5986
      hosts:
        win-internal-app-01:
          ansible_host: 10.0.10.5
```

**Medium term:**
- Evaluate each Windows workload:
  - Can it be replaced by a Linux equivalent? (e.g., .NET Framework → .NET 8 on Linux)
  - Can it be containerized with Windows containers? (useful transitional step, not a long-term target)
  - Is it a third-party application that only runs on Windows? (document and maintain as legacy with Ansible)

**Long term:**
- No Windows nodes in the K8s cluster (Windows node pools add significant operational overhead)
- Windows applications either migrated to Linux equivalents or isolated behind APIs

### What to Prioritize First

If I joined IMAGO tomorrow, this would be my first 90 days:

| Week | Priority | Reason |
|------|----------|--------|
| 1–2 | Complete infrastructure inventory | Can't improve what you don't understand |
| 3–4 | Import existing Hetzner resources into Terraform | Stop manual changes immediately |
| 5–6 | Set up CI/CD pipeline for Terraform (plan on PR, apply on merge) | Removes risk from IaC by adding review step |
| 7–8 | Bootstrap K8s cluster in staging | Low risk, high learning |
| 9–12 | Migrate lowest-risk service first (likely Web App) | Build team confidence and process |
| 13+ | Migrate Search Service, then Download Service | Progressively more complex |

### Where I Would Accept Temporary Compromises

- **Keeping manually managed Windows systems** during the transition — forcing immediate migration risks destabilizing production
- **Using Kubernetes Secrets** instead of Vault for the first few months — reduces bootstrap complexity
- **Not having full observability** on day one — basic Prometheus is fine; advanced SLO tracking comes later
- **Manual scaling of ElasticSearch** — auto-scaling ES in K8s is non-trivial; manual runbooks are acceptable early on
- **Single environment (production only)** if staging hasn't been provisioned — staging should be built quickly but not at the cost of delaying production improvements

### Where I Would Push for Standardization

- **No direct SSH to production servers for config changes** — this is a hard line; Ansible or K8s only
- **All new infrastructure via Terraform** — no exceptions after state import is done
- **All deployments via CI/CD** — no manual `kubectl apply` from developer machines in production
- **Secrets never in Git** — even in base64 form without Sealed Secrets or equivalent

---

## Bare Metal to Cloud VM Migration

### The target state

All application workloads run on Hetzner Cloud VMs managed by Kubernetes (K3s). No workloads run on bare metal in the target state. This is a deliberate decision: Hetzner block storage (hcloud-volumes via CSI) only attaches to cloud VMs, which means durable PVC-backed storage — required for stateful workloads like Elasticsearch — is only achievable on cloud.

### The transition reality

IMAGO currently operates a mix of bare metal and cloud servers. During migration, bare metal servers that have not yet been migrated to Kubernetes fall into one of two categories:

| Category | Approach |
|---|---|
| **Linux bare metal — migratable service** | Run the service in parallel on K8s, validate, cut over traffic, decommission bare metal node |
| **Linux bare metal — not yet migratable** | Manage with Ansible until migrated; import server into Terraform state for visibility |
| **Windows bare metal** | Manage with Ansible (WinRM); evaluate per-workload migration path separately |

### Ansible as the interim management layer

Any bare metal server not yet on Kubernetes must be managed with Ansible — not by hand. This applies to both Linux and Windows systems. Ansible gives:
- Repeatable, version-controlled configuration (playbooks in Git)
- A clear audit trail for what changed and when
- A path to decommission: once the workload moves to K8s, the Ansible inventory entry is removed

The Ansible inventory separates bare metal from Kubernetes nodes explicitly:

```yaml
# ansible/inventories/production/hosts.yml
all:
  children:
    kubernetes:           # managed by K8s — no Ansible config management here
      hosts:
        k8s-storage-1:
        k8s-storage-2:
        k8s-storage-3:
    bare_metal_linux:     # Linux bare metal awaiting migration to K8s
      hosts:
        bm-legacy-01:
          ansible_host: 10.0.10.10
    windows:              # Windows systems — long-term Ansible managed
      hosts:
        win-internal-01:
          ansible_host: 10.0.10.20
          ansible_connection: winrm
```

### Migration order for bare metal workloads

Migrate in order of risk, lowest first:

1. **Stateless services** (e.g. a web frontend, a simple API) — easiest; no persistent state to migrate
2. **Services with external state** (e.g. app that writes to an external DB or object storage) — straightforward; storage doesn't move with the service
3. **Stateful services** (e.g. a search index, a database) — hardest; requires data migration and cut-over window

For each bare metal workload migration:
```
1. Provision K8s equivalent alongside the existing bare metal service
2. Snapshot/backup bare metal data if stateful
3. Shift a fraction of traffic to K8s (Traefik weighted routing)
4. Monitor error rates and latency for 48–72h
5. Shift 100% of traffic
6. Keep bare metal node running for 1 week as fallback
7. Decommission: remove from Ansible inventory, remove from Terraform state, return node to Hetzner
```

### Acceptance criteria for decommissioning a bare metal node

A bare metal node can only be decommissioned when:
- All services it ran have been validated on K8s for ≥1 week
- No monitoring alerts reference the bare metal node's IP
- The Ansible inventory entry has been removed and the playbook re-run to verify idempotency
- Terraform state shows no resources associated with the server

---

## Risk Management

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Terraform state drift from manual changes | High (during transition) | Medium | Weekly audit script; team education |
| ElasticSearch data loss during migration | Low | Critical | Snapshot before any migration step; keep old cluster running |
| Windows workload dependency on new services | Medium | High | Interface definition first; don't migrate until interfaces are stable |
| Team resistance to new process | Medium | Medium | Involve team in design; start with pain points they already have |
| Underestimated migration complexity | High | Medium | Time-box each migration; rollback plan for every step |
