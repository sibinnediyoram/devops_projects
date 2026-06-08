variable "name" {
  description = "Name prefix for all resources"
  type        = string
}

variable "cluster_name" {
  description = "EKS cluster name, used for subnet tags required by ALB controller"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "public_subnets" {
  description = "List of public subnet definitions with az and cidr"
  type = list(object({
    az   = string
    cidr = string
  }))
}

variable "private_subnets" {
  description = "List of private subnet definitions with az and cidr"
  type = list(object({
    az   = string
    cidr = string
  }))
}

variable "single_nat_gateway" {
  description = "Use a single NAT gateway instead of one per AZ (cost saving for non-prod)"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
