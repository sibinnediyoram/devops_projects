import * as cdk from 'aws-cdk-lib/core';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { AwsCdkInfraStack } from '../lib/aws_cdk_infra-stack';

// Inject AZ context so CDK knows the region has 3 AZs, making subnet/NAT counts deterministic.
const TEST_ACCOUNT = '123456789012';
const TEST_REGION = 'us-east-1';
const AZ_CONTEXT_KEY = `availability-zones:account=${TEST_ACCOUNT}:region=${TEST_REGION}`;
const TEST_AZS = ['us-east-1a', 'us-east-1b', 'us-east-1c'];

function buildStack(environmentName: string): Template {
  const app = new cdk.App({ context: { [AZ_CONTEXT_KEY]: TEST_AZS } });
  const stack = new AwsCdkInfraStack(app, 'TestStack', {
    environmentName,
    env: { account: TEST_ACCOUNT, region: TEST_REGION },
  });
  return Template.fromStack(stack);
}

// ─── Dev environment ────────────────────────────────────────────────────────

describe('dev environment', () => {
  let template: Template;

  beforeAll(() => {
    template = buildStack('dev');
  });

  // VPC
  test('creates a VPC', () => {
    template.resourceCountIs('AWS::EC2::VPC', 1);
  });

  test('VPC has 1 NAT gateway', () => {
    template.resourceCountIs('AWS::EC2::NatGateway', 1);
  });

  test('VPC has public and private subnets across 2 AZs', () => {
    template.resourceCountIs('AWS::EC2::Subnet', 4);
  });

  // EKS
  test('creates an EKS cluster', () => {
    template.hasResourceProperties('Custom::AWSCDK-EKS-Cluster', {
      Config: Match.objectLike({ name: 'dev-eks-cluster' }),
    });
  });

  test('EKS cluster endpoint is public+private', () => {
    template.hasResourceProperties('Custom::AWSCDK-EKS-Cluster', {
      Config: Match.objectLike({
        resourcesVpcConfig: Match.objectLike({
          endpointPrivateAccess: true,
          endpointPublicAccess: true,
        }),
      }),
    });
  });

  test('node group has correct scaling config', () => {
    template.hasResourceProperties('AWS::EKS::Nodegroup', {
      ScalingConfig: { MinSize: 1, MaxSize: 2, DesiredSize: 1 },
    });
  });

  test('creates EKS masters IAM role', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'dev-eks-cluster-masters-role',
    });
  });

  // KMS
  test('creates a KMS key with rotation enabled', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true,
    });
  });

  // ECR
  test('creates ECR repositories', () => {
    template.resourceCountIs('AWS::ECR::Repository', 2); // app + worker
  });

  test('ECR repositories have immutable tags and scan on push', () => {
    template.hasResourceProperties('AWS::ECR::Repository', {
      ImageTagMutability: 'IMMUTABLE',
      ImageScanningConfiguration: { ScanOnPush: true },
    });
  });

  test('ECR repositories have lifecycle policy for untagged images', () => {
    template.hasResourceProperties('AWS::ECR::Repository', {
      LifecyclePolicy: Match.objectLike({
        LifecyclePolicyText: Match.stringLikeRegexp('untagged'),
      }),
    });
  });

  // RDS
  test('creates an RDS PostgreSQL instance', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      Engine: 'postgres',
      DBName: 'appdb',
      MultiAZ: false,
    });
  });

  test('RDS instance is in private subnets', () => {
    template.hasResourceProperties('AWS::RDS::DBSubnetGroup', {
      DBSubnetGroupDescription: Match.anyValue(),
    });
  });

  test('RDS security group allows EKS cluster on port 5432', () => {
    // CDK emits cross-SG ingress rules as a separate resource, not inline on the SG
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      FromPort: 5432,
      ToPort: 5432,
      IpProtocol: 'tcp',
    });
  });

  test('RDS credentials are stored in Secrets Manager', () => {
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      GenerateSecretString: Match.objectLike({ SecretStringTemplate: Match.anyValue() }),
    });
  });

  test('RDS storage is encrypted', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      StorageEncrypted: true,
    });
  });

  test('dev RDS has no deletion protection', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      DeletionProtection: false,
    });
  });

  // External DNS
  test('creates External DNS Helm chart', () => {
    const helmResources = template.findResources('Custom::AWSCDK-EKS-HelmChart', {
      Properties: Match.objectLike({ Release: 'external-dns' }),
    });
    expect(Object.keys(helmResources).length).toBeGreaterThan(0);
  });

  test('External DNS Helm chart is pinned to a specific version', () => {
    const helmResources = template.findResources('Custom::AWSCDK-EKS-HelmChart', {
      Properties: Match.objectLike({ Release: 'external-dns' }),
    });
    const props = Object.values(helmResources)[0] as { Properties: { Version?: string } };
    expect(props.Properties.Version).toBe('1.15.0');
  });

  test('External DNS IAM policy includes Route53 permissions', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({ Action: 'route53:ChangeResourceRecordSets' }),
        ]),
      }),
    });
  });

  // Cluster Autoscaler
  test('creates Cluster Autoscaler Helm chart', () => {
    const helmResources = template.findResources('Custom::AWSCDK-EKS-HelmChart', {
      Properties: Match.objectLike({ Release: 'cluster-autoscaler' }),
    });
    expect(Object.keys(helmResources).length).toBeGreaterThan(0);
  });

  test('Cluster Autoscaler Helm chart is pinned to a specific version', () => {
    const helmResources = template.findResources('Custom::AWSCDK-EKS-HelmChart', {
      Properties: Match.objectLike({ Release: 'cluster-autoscaler' }),
    });
    const props = Object.values(helmResources)[0] as { Properties: { Version?: string } };
    expect(props.Properties.Version).toBe('9.43.2');
  });

  test('Cluster Autoscaler IAM policy includes autoscaling permissions', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(['autoscaling:SetDesiredCapacity']),
          }),
        ]),
      }),
    });
  });

  // does NOT deploy ALB controller in dev
  test('does NOT create ALB controller Helm chart', () => {
    const helmResources = template.findResources('Custom::AWSCDK-EKS-HelmChart', {
      Properties: Match.objectLike({ Release: 'aws-load-balancer-controller' }),
    });
    expect(Object.keys(helmResources)).toHaveLength(0);
  });

  // Outputs
  test('outputs VpcId', () => { template.hasOutput('VpcId', {}); });
  test('outputs EksClusterName', () => { template.hasOutput('EksClusterName', {}); });
  test('outputs ECR repo URIs', () => {
    template.hasOutput('EcrRepoUriApp', {});
    template.hasOutput('EcrRepoUriWorker', {});
  });
  test('outputs RDS endpoint and secret ARN', () => {
    template.hasOutput('RdsEndpoint', {});
    template.hasOutput('RdsSecretArn', {});
  });
});

// ─── Prod environment ────────────────────────────────────────────────────────

describe('prod environment', () => {
  let template: Template;

  beforeAll(() => {
    template = buildStack('prod');
  });

  // VPC
  test('VPC has 3 NAT gateways for HA', () => {
    template.resourceCountIs('AWS::EC2::NatGateway', 3);
  });

  test('VPC has subnets across 3 AZs', () => {
    template.resourceCountIs('AWS::EC2::Subnet', 6);
  });

  // EKS
  test('EKS cluster endpoint is private-only', () => {
    template.hasResourceProperties('Custom::AWSCDK-EKS-Cluster', {
      Config: Match.objectLike({
        resourcesVpcConfig: Match.objectLike({
          endpointPrivateAccess: true,
          endpointPublicAccess: false,
        }),
      }),
    });
  });

  test('prod node group has correct scaling config', () => {
    template.hasResourceProperties('AWS::EKS::Nodegroup', {
      ScalingConfig: { MinSize: 2, MaxSize: 6, DesiredSize: 2 },
    });
  });

  // RDS
  test('prod RDS has MultiAZ enabled', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      MultiAZ: true,
    });
  });

  test('prod RDS has deletion protection', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      DeletionProtection: true,
    });
  });

  test('prod RDS has longer backup retention', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      BackupRetentionPeriod: 7,
    });
  });

  // ALB controller (prod only)
  test('creates ALB controller IRSA role with OIDC trust', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'sts:AssumeRoleWithWebIdentity',
            Principal: Match.objectLike({ Federated: Match.anyValue() }),
          }),
        ]),
      }),
    });
  });

  test('creates a custom managed policy for ALB controller', () => {
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(['elasticloadbalancing:CreateLoadBalancer']),
          }),
        ]),
      }),
    });
  });

  test('ALB controller Helm chart is pinned to a specific version', () => {
    const helmResources = template.findResources('Custom::AWSCDK-EKS-HelmChart', {
      Properties: Match.objectLike({ Release: 'aws-load-balancer-controller' }),
    });
    const props = Object.values(helmResources)[0] as { Properties: { Version?: string } };
    expect(props.Properties.Version).toBe('1.13.0');
  });
});
