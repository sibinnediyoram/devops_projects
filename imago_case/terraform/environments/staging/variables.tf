variable "hcloud_token" {
  type      = string
  sensitive = true
}

variable "cluster_name" {
  type    = string
  default = "imago-staging"
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
