import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import { KubectlV31Layer } from '@aws-cdk/lambda-layer-kubectl-v31';
import { Construct } from 'constructs';

export interface EksModuleProps {
  readonly vpc: ec2.IVpc;
  readonly clusterName: string;
  readonly version: eks.KubernetesVersion;
  readonly endpointAccess?: eks.EndpointAccess;
  readonly nodeInstanceType?: string;
  readonly desiredCapacity?: number;
  readonly minCapacity?: number;
  readonly maxCapacity?: number;
}

export class EksModule extends Construct {
  public readonly cluster: eks.Cluster;

  constructor(scope: Construct, id: string, props: EksModuleProps) {
    super(scope, id);

    const mastersRole = new iam.Role(this, 'EksMastersRole', {
      assumedBy: new iam.AccountRootPrincipal(),
      roleName: `${props.clusterName}-masters-role`,
    });

    this.cluster = new eks.Cluster(this, 'EksCluster', {
      clusterName: props.clusterName,
      version: props.version,
      vpc: props.vpc,
      mastersRole,
      kubectlLayer: new KubectlV31Layer(this, 'KubectlLayer'),
      vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
      defaultCapacity: 0,
      outputClusterName: true,
      outputConfigCommand: true,
      endpointAccess: props.endpointAccess ?? eks.EndpointAccess.PUBLIC_AND_PRIVATE,
    });

    this.cluster.addNodegroupCapacity('DefaultNodeGroup', {
      instanceTypes: [new ec2.InstanceType(props.nodeInstanceType ?? 't3.medium')],
      minSize: props.minCapacity ?? 1,
      maxSize: props.maxCapacity ?? 3,
      desiredSize: props.desiredCapacity ?? 1,
    });
  }
}
