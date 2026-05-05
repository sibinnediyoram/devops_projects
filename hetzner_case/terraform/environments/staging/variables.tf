variable "hcloud_token" {
  type      = string
  sensitive = true
}

variable "cluster_name" {
  type    = string
  default = "hetzner_demo-staging"
}

variable "cluster_token" {
  type      = string
  sensitive = true
}

variable "ssh_key_name" {
  type = string
}

variable "bastion_ips" {
  type = list(string)
}
