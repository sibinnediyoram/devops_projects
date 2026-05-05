provider "helm" {
  # Uses KUBECONFIG env var or ~/.kube/config automatically.
}

resource "helm_release" "hcloud_csi" {
  name       = "hcloud-csi"
  repository = "https://charts.hetzner.cloud"
  chart      = "hcloud-csi"
  version    = "2.9.0"
  namespace  = "kube-system"

  values = [
    yamlencode({
      storageClasses = [
        {
          name                = "hcloud-volumes"
          defaultStorageClass = false
          reclaimPolicy       = "Delete"  # staging: auto-delete volumes to avoid cost
        }
      ]
    })
  ]

  depends_on = [module.k8s]
}
