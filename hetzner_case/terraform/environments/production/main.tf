terraform {
  required_version = ">= 1.6"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.47"
    }
    helm = {
      source  = "hashicorp/helm"
      version = ">= 2.0.1"
    }
  }
}

provider "hcloud" {
  token = var.hcloud_token
}

module "network" {
  source = "../../modules/hcloud-network"

  cluster_name = var.cluster_name
  environment  = "production"
  network_zone = "eu-central"
  network_cidr = "10.0.0.0/16"
  bastion_ips  = var.bastion_ips
}

module "k8s" {
  source = "../../modules/hcloud-k8s"

  cluster_name         = var.cluster_name
  environment          = "production"
  location             = "nbg1"
  k3s_version          = "v1.33.10+k3s1"
  cluster_token        = var.cluster_token
  api_server_ip        = module.lb.lb_public_ip
  ssh_key_name         = var.ssh_key_name
  control_plane_count  = 3
  worker_count         = 3
  storage_worker_count = 3
  network_id           = module.network.network_id
  firewall_nodes_id    = module.network.firewall_nodes_id
}

module "lb" {
  source = "../../modules/hcloud-lb"

  cluster_name = var.cluster_name
  environment  = "production"
  location     = "nbg1"
  lb_type      = "lb21"
  network_id   = module.network.network_id
}

# Hetzner Object Storage bucket for media assets
# Note: Hetzner Object Storage uses S3-compatible API but is managed via UI or hcloud CLI.
# The bucket creation is documented here; actual bucket is created via hcloud CLI or console.
# resource "hcloud_object_storage_bucket" "media" { ... }  # Not yet in provider

# Output the kubeconfig location reminder
output "next_steps" {
  value = <<-EOT
    Phase 1 complete. Next steps:

    1. Set up kubeconfig:
         ssh ubuntu@${module.k8s.first_control_plane_ip}
         sudo cat /etc/rancher/k3s/k3s.yaml \
           | sed 's/127.0.0.1/${module.lb.lb_public_ip}/g' > ~/.kube/config
         kubectl get nodes  # verify all nodes Ready

    2. Create Hetzner API token secret for CSI driver:
         kubectl create secret generic hcloud \
           --from-literal=token=<HCLOUD_TOKEN> -n kube-system

    3. Run phase-2 apply to install hcloud-csi via Helm:
         terraform apply

    4. Install remaining cluster components:
         kubectl apply -f kubernetes/namespaces/namespaces.yaml
         kubectl apply -f kubernetes/platform/cert-manager/cluster-issuer.yaml
         helm upgrade --install elastic-operator elastic/eck-operator \
           --namespace elastic-system --create-namespace --version 2.14.0
         kubectl apply -k kubernetes/gitops/argocd/
  EOT
}
