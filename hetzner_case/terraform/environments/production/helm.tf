# Helm-managed cluster components
#
# TWO-PHASE APPLY REQUIRED — the Helm provider needs a live cluster:
#
#   Phase 1 — provision infrastructure only:
#     terraform apply -target=module.network -target=module.lb -target=module.k8s
#
#   Then set up kubeconfig manually (see next_steps output), then:
#     kubectl create secret generic hcloud \
#       --from-literal=token=<HCLOUD_TOKEN> -n kube-system
#
#   Phase 2 — install Helm charts:
#     terraform apply
#
# The hcloud secret is created manually so the API token never passes through
# Terraform state. The CSI driver reads it directly from kube-system.

provider "helm" {
  # Uses KUBECONFIG env var or ~/.kube/config automatically — same as kubectl.
  # Set kubeconfig up after phase-1 apply before running phase-2.
}

# Hetzner CSI Driver
# Creates StorageClass "hcloud-volumes" (provisioner: csi.hetzner.cloud)
# Required by: Elasticsearch PVCs, Prometheus, Grafana, Alertmanager
resource "helm_release" "hcloud_csi" {
  name       = "hcloud-csi"
  repository = "https://charts.hetzner.cloud"
  chart      = "hcloud-csi"
  version    = "2.9.0"
  namespace  = "kube-system"

  # Token is read by the CSI driver from the pre-created "hcloud" secret in
  # kube-system — no sensitive values needed here in Terraform state
  values = [
    yamlencode({
      storageClasses = [
        {
          name                = "hcloud-volumes"
          defaultStorageClass = false
          # Retain keeps the Hetzner volume if the PVC is deleted — prevents
          # accidental data loss; manual cleanup required when volumes are intentional
          reclaimPolicy = "Retain"
        }
      ]
    })
  ]

  depends_on = [module.k8s]
}
