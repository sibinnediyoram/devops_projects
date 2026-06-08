variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.33"
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "access_entries" {
  description = "Map of IAM principals to grant cluster access via EKS Access Entries"
  type = map(object({
    principal_arn = string
    policy_arn    = string
  }))
  default = {}
}

variable "subnet_ids" {
  description = "Private subnet IDs for EKS nodes"
  type        = list(string)
}

variable "node_groups" {
  description = "Map of node group configurations"
  type = map(object({
    instance_types  = list(string)
    min_size        = number
    max_size        = number
    desired_size    = number
    disk_size       = number
    ami_type        = optional(string, "AL2023_x86_64_STANDARD")
    release_version = optional(string)
  }))
}

variable "addon_versions" {
  description = "Version overrides for EKS managed add-ons"
  type = object({
    coredns    = string
    kube_proxy = string
    vpc_cni    = string
  })
  default = {
    coredns    = "v1.12.4-eksbuild.1"
    kube_proxy = "v1.33.3-eksbuild.10"
    vpc_cni    = "v1.20.4-eksbuild.1"
  }
}

variable "metrics_server_version" {
  description = "Helm chart version for metrics-server"
  type        = string
  default     = "3.12.2"
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
