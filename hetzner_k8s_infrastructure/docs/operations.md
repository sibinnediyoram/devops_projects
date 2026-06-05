# Operational Strategy

## On-Call and Alerting Philosophy

Alerts should be **actionable**. An alert that fires and requires no human action is noise that trains people to ignore alerts. Every alert should have a clear runbook action.

**Alert routing:**
- **P1 (Service down, SLA breach imminent):** PagerDuty → phone call to on-call engineer
- **P2 (Degraded performance, elevated error rate):** PagerDuty → push notification to on-call
- **P3 (Warning thresholds, non-urgent):** Slack `#infra-alerts` channel — no on-call wake-up

## Key Runbooks

### Runbook: ElasticSearch Cluster Yellow/Red

```
Trigger: ES cluster health is yellow or red

1. Check cluster health:
   kubectl exec -n hetzner_demo-search elasticsearch-0 -- \
     curl -s localhost:9200/_cluster/health?pretty

2. Identify unassigned shards:
   curl -s localhost:9200/_cat/shards?h=index,shard,prirep,state,unassigned.reason

3. If node is down — check pod status:
   kubectl get pods -n hetzner_demo-search -l app=elasticsearch

4. If pod is in CrashLoopBackOff — check logs:
   kubectl logs -n hetzner_demo-search elasticsearch-0 --previous

5. If disk full — expand Hetzner volume:
   hcloud volume resize <volume-id> --size <new-size-gb>
   # Then resize filesystem (ext4):
   resize2fs /dev/disk/by-id/scsi-0HC_Volume_<id>

6. If shard allocation is stuck:
   curl -XPOST localhost:9200/_cluster/reroute?retry_failed=true
```

### Runbook: Web App High Error Rate

```
Trigger: HTTP 5xx rate > 1% for 5 minutes

1. Check pod status:
   kubectl get pods -n hetzner_demo-web

2. Check recent logs:
   kubectl logs -n hetzner_demo-web -l app=web-app --tail=100

3. Check if Search Service is healthy:
   kubectl get pods -n hetzner_demo-search

4. Check if it's a deployment issue (recent rollout):
   kubectl rollout history deployment/web-app -n hetzner_demo-web
   # If yes, rollback:
   kubectl rollout undo deployment/web-app -n hetzner_demo-web

5. Check Traefik logs for upstream errors:
   kubectl logs -n traefik -l app=traefik --tail=100
```

### Runbook: Node Not Ready

```
Trigger: Node in NotReady state > 5 minutes

1. Check node status:
   kubectl describe node <node-name>

2. SSH to node (via bastion):
   ssh -J bastion.hetzner_demo.de ubuntu@<node-ip>

3. Check kubelet:
   systemctl status k3s-agent
   journalctl -u k3s-agent -n 100

4. If node is unrecoverable — cordon, drain, replace:
   kubectl cordon <node-name>
   kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
   # Provision new node via Terraform:
   terraform apply -var="worker_count=N+1"
   # Once new node joins:
   kubectl delete node <old-node-name>
```

## Deployment Process

### Standard Application Deployment

All deployments are GitOps-driven via ArgoCD. The process:

1. Developer opens PR with application changes
2. CI runs tests, builds Docker image, pushes to registry
3. CI updates image tag in Kubernetes manifests (or Helm values)
4. PR is reviewed and merged
5. ArgoCD detects the change in Git and applies it to the cluster
6. ArgoCD reports sync status; Slack notification sent

No direct `kubectl apply` in production. Ever.

### Emergency Hotfix (Breaking Glass)

For true production emergencies when the normal pipeline is too slow:

```bash
# 1. Document that you're doing this in Slack
# 2. Apply the fix directly:
kubectl set image deployment/web-app web-app=registry.hetzner_demo.de/web-app:<hotfix-tag> -n hetzner_demo-web
# 3. Verify:
kubectl rollout status deployment/web-app -n hetzner_demo-web
# 4. Within 24 hours: create a PR that makes the same change through Git
#    ArgoCD will reconcile and the diff will disappear
```

## Platform Upgrades

### K3s Version Upgrades

Use the System Upgrade Controller:

```yaml
# plan for upgrading K3s
apiVersion: upgrade.cattle.io/v1
kind: Plan
metadata:
  name: k3s-server
  namespace: system-upgrade
spec:
  concurrency: 1
  cordon: true
  nodeSelector:
    matchExpressions:
      - key: node-role.kubernetes.io/control-plane
        operator: In
        values: ["true"]
  serviceAccountName: system-upgrade
  upgrade:
    image: rancher/k3s-upgrade
  channel: https://update.k3s.io/v1-release/channels/stable
```

Always upgrade control plane nodes one at a time, then workers.

### ElasticSearch Upgrades

Rolling upgrades only. Never skip major versions.

```bash
# 1. Disable shard allocation
curl -XPUT localhost:9200/_cluster/settings -d '{"persistent":{"cluster.routing.allocation.enable":"primaries"}}'
# 2. Stop non-essential indexing if possible
# 3. Upgrade one node at a time via kubectl rollout
kubectl rollout restart statefulset/elasticsearch -n hetzner_demo-search
# 4. Wait for cluster to go green before continuing
# 5. Re-enable allocation
curl -XPUT localhost:9200/_cluster/settings -d '{"persistent":{"cluster.routing.allocation.enable":null}}'
```

## Capacity Planning

Review monthly:
- CPU/memory utilization per node pool (via Grafana dashboard)
- ElasticSearch index size growth rate
- Object storage usage (media assets)
- Network egress costs (Hetzner bills by traffic)

Target utilization: 60–70% average CPU/memory. Above 80% consistently = add nodes.

## Cost Management

Hetzner is already cost-efficient, but:
- Review unused volumes and snapshots monthly — they accumulate silently
- Power off test servers when not in use
- Use Hetzner Object Storage for all long-term storage (vs. volumes)
- Audit backup retention policies — daily snapshots older than 30 days rarely needed

## Security Operations

- **CVE scanning:** Trivy can be added in CI pipeline that scans all Docker images before push
- **RBAC audits:** Quarterly review of ServiceAccount permissions
- **Network policy audits:** Quarterly review that default-deny is in place on all app namespaces
- **Certificate expiry:** cert-manager handles renewal automatically; Grafana dashboard shows cert age
- **Access review:** SSH keys and Hetzner API tokens reviewed semi-annually
