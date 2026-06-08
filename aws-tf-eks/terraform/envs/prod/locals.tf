locals {
  environment     = "prod"
  region          = "eu-central-1"
  cluster_name    = "lemon-prod"
  cluster_version = "1.33"

  vpc_cidr = "10.2.0.0/16"

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
  single_nat_gateway = false

  addon_versions = {
    coredns    = "v1.12.4-eksbuild.1"
    kube_proxy = "v1.33.3-eksbuild.10"
    vpc_cni    = "v1.20.4-eksbuild.1"
  }
  metrics_server_version = "3.12.2"

  # Replace ARNs with real IAM roles for engineers and CI/CD before applying.
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
  node_groups = {
    default = {
      instance_types = ["t3.large"]
      min_size       = 3
      max_size       = 6
      desired_size   = 3
      disk_size      = 50
      ami_type       = "AL2023_x86_64_STANDARD"
    }
  }
}
