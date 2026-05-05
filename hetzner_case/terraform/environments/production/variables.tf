variable "hcloud_token" {
  type        = string
  sensitive   = true
  description = "Hetzner Cloud API token — read/write scope required"
}

variable "cluster_name" {
  type    = string
  default = "hetzner_demo-production"
}

variable "cluster_token" {
  type      = string
  sensitive = true
}

variable "ssh_key_name" {
  type        = string
  description = "Name of the SSH key in Hetzner Cloud console"
}

variable "bastion_ips" {
  type        = list(string)
  description = "CIDR ranges allowed to access K8s API and SSH"
}
