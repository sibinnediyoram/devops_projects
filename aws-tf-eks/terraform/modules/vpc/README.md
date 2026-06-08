# Module: vpc

Creates a VPC with public and private subnets across multiple availability zones, an internet gateway, NAT gateways, and route tables.

Public subnets are tagged for ALB discovery by the AWS Load Balancer Controller. Private subnets host EKS nodes and are tagged for internal load balancers.

## Resources

| Resource | Description |
|----------|-------------|
| `aws_vpc` | VPC with DNS support enabled |
| `aws_internet_gateway` | Internet gateway attached to the VPC |
| `aws_subnet` (public) | One public subnet per AZ, auto-assigns public IPs |
| `aws_subnet` (private) | One private subnet per AZ |
| `aws_eip` + `aws_nat_gateway` | 1 NAT GW (non-prod) or one per AZ (prod) |
| `aws_route_table` | Separate route tables for public (via IGW) and private (via NAT) |

## Inputs

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `name` | `string` | yes | — | Name prefix for all resources |
| `cluster_name` | `string` | yes | — | EKS cluster name, used for subnet discovery tags |
| `vpc_cidr` | `string` | yes | — | CIDR block for the VPC |
| `public_subnets` | `list(object({az, cidr}))` | yes | — | Public subnet definitions |
| `private_subnets` | `list(object({az, cidr}))` | yes | — | Private subnet definitions |
| `single_nat_gateway` | `bool` | no | `true` | Use one shared NAT GW (cost saving for non-prod) |
| `tags` | `map(string)` | no | `{}` | Additional tags applied to all resources |

## Outputs

| Name | Description |
|------|-------------|
| `vpc_id` | ID of the VPC |
| `public_subnet_ids` | List of public subnet IDs |
| `private_subnet_ids` | List of private subnet IDs |

## Usage

```hcl
module "vpc" {
  source = "../../modules/vpc"

  name         = "lemon-prod"
  cluster_name = "lemon-prod"
  vpc_cidr     = "10.2.0.0/16"

  public_subnets = [
    { az = "eu-central-1a", cidr = "10.2.1.0/24" },
    { az = "eu-central-1b", cidr = "10.2.2.0/24" },
    { az = "eu-central-1c", cidr = "10.2.3.0/24" },
  ]
  private_subnets = [
    { az = "eu-central-1a", cidr = "10.2.11.0/24" },
    { az = "eu-central-1b", cidr = "10.2.12.0/24" },
    { az = "eu-central-1c", cidr = "10.2.13.0/24" },
  ]

  # false = one NAT GW per AZ for production HA
  single_nat_gateway = false
}
```
