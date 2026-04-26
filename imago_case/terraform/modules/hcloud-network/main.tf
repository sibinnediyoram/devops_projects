resource "hcloud_network" "main" {
  name     = "${var.cluster_name}-network"
  ip_range = var.network_cidr

  labels = {
    managed-by  = "terraform"
    cluster     = var.cluster_name
    environment = var.environment
  }
}

resource "hcloud_network_subnet" "control_plane" {
  type         = "cloud"
  network_id   = hcloud_network.main.id
  network_zone = var.network_zone
  ip_range     = var.control_plane_subnet_cidr
}

resource "hcloud_network_subnet" "workers" {
  type         = "cloud"
  network_id   = hcloud_network.main.id
  network_zone = var.network_zone
  ip_range     = var.worker_subnet_cidr
}

resource "hcloud_network_subnet" "storage" {
  type         = "cloud"
  network_id   = hcloud_network.main.id
  network_zone = var.network_zone
  ip_range     = var.storage_subnet_cidr
}

resource "hcloud_firewall" "nodes" {
  name = "${var.cluster_name}-nodes"

  labels = {
    managed-by  = "terraform"
    cluster     = var.cluster_name
    environment = var.environment
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = var.bastion_ips
    description = "SSH from bastion/VPN only"
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "6443"
    source_ips = var.bastion_ips
    description = "K8s API server access from authorized IPs"
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "any"
    source_ips = [var.network_cidr]
    description = "All internal cluster traffic"
  }

  rule {
    direction  = "in"
    protocol   = "udp"
    port       = "any"
    source_ips = [var.network_cidr]
    description = "All internal cluster traffic (UDP)"
  }
}

resource "hcloud_firewall" "load_balancer" {
  name = "${var.cluster_name}-lb"

  labels = {
    managed-by  = "terraform"
    cluster     = var.cluster_name
    environment = var.environment
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
    description = "HTTP (redirect to HTTPS)"
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
    description = "HTTPS"
  }
}
