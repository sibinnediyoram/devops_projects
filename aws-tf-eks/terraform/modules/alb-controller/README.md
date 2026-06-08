# Module: alb-controller

Deploys the AWS Load Balancer Controller into an EKS cluster. Creates an IAM policy with the required ELB/EC2 permissions, an IRSA role scoped to the controller's service account, and installs the controller via Helm.

The controller watches Kubernetes Ingress resources and provisions AWS ALBs accordingly. Subnets must be tagged correctly for auto-discovery (handled by the `vpc` module).

## Resources

| Resource | Description |
|----------|-------------|
| `aws_iam_policy` | Permissions for ELB, EC2, ACM, WAF operations |
| `aws_iam_role` | IRSA role — assumable only by the controller's service account |
| `aws_iam_role_policy_attachment` | Attaches the policy to the role |
| `helm_release` | Installs `aws-load-balancer-controller` into `kube-system` |

## Inputs

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `cluster_name` | `string` | yes | EKS cluster name |
| `oidc_provider_arn` | `string` | yes | OIDC provider ARN from the `eks` module |
| `oidc_provider_url` | `string` | yes | OIDC provider URL (without `https://`) from the `eks` module |
| `vpc_id` | `string` | yes | VPC ID, passed to the controller for subnet discovery |
| `region` | `string` | yes | AWS region |
| `tags` | `map(string)` | no | Additional tags applied to IAM resources |

## Outputs

| Name | Description |
|------|-------------|
| `role_arn` | ARN of the IRSA role created for the controller |

## Usage

```hcl
module "alb_controller" {
  source = "../../modules/alb-controller"

  cluster_name      = module.eks.cluster_name
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url
  vpc_id            = module.vpc.vpc_id
  region            = "eu-central-1"
}
```

## Notes

- The IRSA trust policy includes two conditions: `:sub` restricts to the specific service account, `:aud` prevents other AWS services from assuming the role with the same token.
- Subnet tags (`kubernetes.io/role/elb` and `kubernetes.io/role/internal-elb`) must be present for the controller to discover which subnets to use for ALB placement. These are applied by the `vpc` module.
- The ACM certificate ARN for HTTPS must be supplied via the Helm chart's `values-prod.yaml` ingress annotation — it is not managed by this module.
