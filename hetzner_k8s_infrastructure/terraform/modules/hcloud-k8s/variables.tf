variable "cluster_name" {
  type        = string
  description = "Cluster name prefix"
}

variable "environment" {
  type        = string
  description = "Environment name (production, staging)"
}

variable "location" {
  type        = string
  default     = "nbg1"
  description = "Hetzner datacenter location (nbg1=Nuremberg, fsn1=Falkenstein, hel1=Helsinki)"
}

variable "k3s_version" {
  type        = string
  default     = "v1.31.4+k3s1"
  description = "K3s version to install"
}

variable "cluster_token" {
  type        = string
  sensitive   = true
  description = "Shared token for K3s cluster bootstrap — generate with: openssl rand -hex 32"
}

variable "api_server_ip" {
  type        = string
  description = "IP address for K8s API server SAN (use Hetzner private LB IP)"
}

variable "ssh_key_name" {
  type        = string
  description = "Name of SSH key already registered in Hetzner Cloud"
}

variable "server_image" {
  type        = string
  default     = "ubuntu-24.04"
}

variable "control_plane_count" {
  type        = number
  default     = 3
  description = "Number of control plane nodes (must be odd for etcd quorum)"
}

variable "control_plane_server_type" {
  type    = string
  default = "cx31"
}

variable "worker_count" {
  type    = number
  default = 3
}

variable "worker_server_type" {
  type    = string
  default = "cx41"
}

variable "storage_worker_count" {
  type        = number
  default     = 3
  description = "Cloud VMs for ElasticSearch (ECK) and media-download. Must be >= ES replica count (3) due to hard pod anti-affinity."
}

variable "storage_server_type" {
  type        = string
  default     = "cx51"
  description = "CX51 (16 vCPU, 32 GB) — required for ES 16Gi memory limit + OS overhead. hcloud-volumes attach only to cloud VMs."
}

variable "network_id" {
  type        = string
  description = "Hetzner private network ID"
}

variable "firewall_nodes_id" {
  type        = string
  description = "Hetzner firewall ID for cluster nodes"
}
