locals {
  k3s_version   = var.k3s_version
  cluster_token = var.cluster_token

  control_plane_install_script = <<-EOT
    #!/bin/bash
    set -euo pipefail

    # Install K3s on first control plane node (cluster init)
    curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="${local.k3s_version}" sh -s - server \
      --cluster-init \
      --token="${local.cluster_token}" \
      --tls-san="${var.api_server_ip}" \
      --disable=traefik \
      --disable=servicelb \
      --flannel-backend=vxlan \
      --node-label="node.hetzner_demo.io/pool=control-plane" \
      --node-label="node.hetzner_demo.io/type=cloud"

    # Wait for node to be ready
    until kubectl get nodes | grep -q " Ready"; do sleep 5; done
  EOT

  control_plane_join_script = <<-EOT
    #!/bin/bash
    set -euo pipefail

    curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="${local.k3s_version}" sh -s - server \
      --server="https://${var.api_server_ip}:6443" \
      --token="${local.cluster_token}" \
      --tls-san="${var.api_server_ip}" \
      --disable=traefik \
      --disable=servicelb \
      --flannel-backend=vxlan \
      --node-label="node.hetzner_demo.io/pool=control-plane" \
      --node-label="node.hetzner_demo.io/type=cloud"
  EOT

  worker_install_script = <<-EOT
    #!/bin/bash
    set -euo pipefail

    curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="${local.k3s_version}" sh -s - agent \
      --server="https://${var.api_server_ip}:6443" \
      --token="${local.cluster_token}" \
      --node-label="node.hetzner_demo.io/pool=general" \
      --node-label="node.hetzner_demo.io/type=cloud"
  EOT

  storage_worker_install_script = <<-EOT
    #!/bin/bash
    set -euo pipefail

    curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="${local.k3s_version}" sh -s - agent \
      --server="https://${var.api_server_ip}:6443" \
      --token="${local.cluster_token}" \
      --node-label="node.hetzner_demo.io/pool=storage" \
      --node-label="node.hetzner_demo.io/type=cloud"
  EOT
}

data "hcloud_ssh_key" "ops" {
  name = var.ssh_key_name
}

# Control plane nodes
resource "hcloud_server" "control_plane" {
  count        = var.control_plane_count
  name         = "${var.cluster_name}-cp-${count.index + 1}"
  server_type  = var.control_plane_server_type
  image        = var.server_image
  location     = var.location
  ssh_keys     = [data.hcloud_ssh_key.ops.id]
  firewall_ids = [var.firewall_nodes_id]

  network {
    network_id = var.network_id
    ip         = "10.0.1.${count.index + 1}"
  }

  labels = {
    managed-by  = "terraform"
    cluster     = var.cluster_name
    environment = var.environment
    role        = "control-plane"
  }

  user_data = count.index == 0 ? local.control_plane_install_script : local.control_plane_join_script

  depends_on = [var.network_id]

  lifecycle {
    prevent_destroy = true
  }
}

# General workload worker nodes (cloud VMs)
resource "hcloud_server" "workers" {
  count        = var.worker_count
  name         = "${var.cluster_name}-worker-${count.index + 1}"
  server_type  = var.worker_server_type
  image        = var.server_image
  location     = var.location
  ssh_keys     = [data.hcloud_ssh_key.ops.id]
  firewall_ids = [var.firewall_nodes_id]

  network {
    network_id = var.network_id
    ip         = "10.0.2.${count.index + 1}"
  }

  labels = {
    managed-by  = "terraform"
    cluster     = var.cluster_name
    environment = var.environment
    role        = "worker"
    pool        = "general"
  }

  user_data = local.worker_install_script

  depends_on = [hcloud_server.control_plane]
}

# Storage-pool nodes — cloud VMs (CX51, 32 GB) for Elasticsearch (ECK) and media-download.
# These are cloud VMs so hcloud-volumes can attach (block storage requires cloud API).
# ES pods use hard pod anti-affinity, so count must equal the ES replica count (3 in prod).
resource "hcloud_server" "storage_workers" {
  count        = var.storage_worker_count
  name         = "${var.cluster_name}-storage-${count.index + 1}"
  server_type  = var.storage_server_type
  image        = var.server_image
  location     = var.location
  ssh_keys     = [data.hcloud_ssh_key.ops.id]
  firewall_ids = [var.firewall_nodes_id]

  network {
    network_id = var.network_id
    ip         = "10.0.3.${count.index + 1}"
  }

  labels = {
    managed-by  = "terraform"
    cluster     = var.cluster_name
    environment = var.environment
    role        = "storage-worker"
    pool        = "storage"
  }

  user_data = local.storage_worker_install_script

  depends_on = [hcloud_server.control_plane]

  lifecycle {
    prevent_destroy = true
  }
}
