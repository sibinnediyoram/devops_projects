variable "cluster_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "location" {
  type    = string
  default = "nbg1"
}

variable "lb_type" {
  type    = string
  default = "lb11"
  description = "Hetzner LB type. lb11 handles ~10K concurrent connections."
}

variable "network_id" {
  type = string
}
