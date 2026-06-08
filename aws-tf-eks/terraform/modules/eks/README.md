# Module: eks

Creates an EKS cluster with managed node groups, IAM roles, an OIDC provider for IRSA, pinned managed add-ons, metrics-server, and Access Entries for cluster access control.

## Resources

| Resource | Description |
|----------|-------------|
| `aws_iam_role` (cluster) | IAM role for the EKS control plane |
| `aws_eks_cluster` | EKS control plane with API-mode access control |
| `aws_iam_role` (node) | IAM role for EC2 worker nodes |
| `aws_eks_node_group` | Managed node group(s) in private subnets |
| `aws_eks_addon` (coredns, kube-proxy, vpc-cni) | Core add-ons with pinned versions |
| `aws_iam_openid_connect_provider` | OIDC provider enabling IRSA |
| `helm_release` (metrics-server) | Required for HPA to function |
| `aws_eks_access_entry` | IAM principal → cluster access mapping |
| `aws_eks_access_policy_association` | Associates an EKS access policy to each entry |

## Inputs

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `cluster_name` | `string` | yes | — | Name of the EKS cluster |
| `cluster_version` | `string` | no | `"1.33"` | Kubernetes version |
| `vpc_id` | `string` | yes | — | VPC ID |
| `subnet_ids` | `list(string)` | yes | — | Private subnet IDs for node groups |
| `node_groups` | `map(object)` | yes | — | Node group configurations (see below) |
| `access_entries` | `map(object)` | no | `{}` | IAM principals and policies for cluster access |
| `addon_versions` | `object` | no | see variables.tf | Pinned versions for coredns, kube-proxy, vpc-cni |
| `metrics_server_version` | `string` | no | `"3.12.2"` | Helm chart version for metrics-server |
| `tags` | `map(string)` | no | `{}` | Additional tags applied to all resources |

### `node_groups` object shape

```hcl
node_groups = {
  default = {
    instance_types  = ["t3.large"]
    min_size        = 3
    max_size        = 6
    desired_size    = 3
    disk_size       = 50
    ami_type        = "AL2023_x86_64_STANDARD"  # optional, default: AL2023_x86_64_STANDARD
    release_version = "1.33.0-20250501"          # optional, omit to use latest
  }
}
```

### `access_entries` object shape

```hcl
access_entries = {
  admin = {
    principal_arn = "arn:aws:iam::ACCOUNT_ID:role/engineering-admin"
    policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
  }
  cicd = {
    principal_arn = "arn:aws:iam::ACCOUNT_ID:role/github-actions-deploy"
    policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSEditPolicy"
  }
}
```

Common EKS access policy ARNs:

| Policy | Use |
|--------|-----|
| `AmazonEKSClusterAdminPolicy` | Full cluster admin |
| `AmazonEKSAdminPolicy` | Namespace-level admin |
| `AmazonEKSEditPolicy` | Deploy workloads (CI/CD) |
| `AmazonEKSViewPolicy` | Read-only |

## Outputs

| Name | Description |
|------|-------------|
| `cluster_name` | Name of the EKS cluster |
| `cluster_endpoint` | API server endpoint |
| `cluster_certificate_authority_data` | Base64-encoded CA data for kubeconfig |
| `oidc_provider_arn` | OIDC provider ARN, passed to IRSA modules |
| `oidc_provider_url` | OIDC provider URL (without `https://`) |
| `node_role_arn` | ARN of the node IAM role |

## Usage

```hcl
module "eks" {
  source = "../../modules/eks"

  cluster_name    = "lemon-prod"
  cluster_version = "1.33"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids

  node_groups = {
    default = {
      instance_types = ["t3.large"]
      min_size       = 3
      max_size       = 6
      desired_size   = 3
      disk_size      = 50
    }
  }

  access_entries = {
    admin = {
      principal_arn = "arn:aws:iam::ACCOUNT_ID:role/engineering-admin"
      policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
    }
    cicd = {
      principal_arn = "arn:aws:iam::ACCOUNT_ID:role/github-actions-deploy"
      policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSEditPolicy"
    }
  }

  addon_versions = {
    coredns    = "v1.12.4-eksbuild.1"
    kube_proxy = "v1.33.3-eksbuild.10"
    vpc_cni    = "v1.20.4-eksbuild.1"
  }
}
```
