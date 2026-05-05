variable "cluster_name" {
  type        = string
  description = "Name prefix for all resources"
}

variable "environment" {
  type        = string
  description = "Deployment environment (production, staging)"
}

variable "network_zone" {
  type        = string
  default     = "eu-central"
  description = "Hetzner network zone"
}

variable "network_cidr" {
  type        = string
  default     = "10.0.0.0/16"
}

variable "control_plane_subnet_cidr" {
  type    = string
  default = "10.0.1.0/24"
}

variable "worker_subnet_cidr" {
  type    = string
  default = "10.0.2.0/24"
}

variable "storage_subnet_cidr" {
  type    = string
  default = "10.0.3.0/24"
}

variable "bastion_ips" {
  type        = list(string)
  description = "List of CIDR blocks allowed to SSH and access K8s API"
}
