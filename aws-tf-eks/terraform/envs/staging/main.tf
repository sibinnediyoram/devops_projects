module "vpc" {
  source = "../../modules/vpc"

  name               = local.cluster_name
  cluster_name       = local.cluster_name
  vpc_cidr           = local.vpc_cidr
  public_subnets     = local.public_subnets
  private_subnets    = local.private_subnets
  single_nat_gateway = local.single_nat_gateway
}

module "eks" {
  source = "../../modules/eks"

  cluster_name           = local.cluster_name
  cluster_version        = local.cluster_version
  vpc_id                 = module.vpc.vpc_id
  subnet_ids             = module.vpc.private_subnet_ids
  node_groups            = local.node_groups
  addon_versions         = local.addon_versions
  metrics_server_version = local.metrics_server_version
  access_entries         = local.access_entries
}

module "alb_controller" {
  source = "../../modules/alb-controller"

  cluster_name      = local.cluster_name
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url
  vpc_id            = module.vpc.vpc_id
  region            = local.region
}
