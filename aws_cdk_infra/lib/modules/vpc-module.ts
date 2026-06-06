import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface VpcModuleProps {
  readonly cidr: string;
  readonly maxAzs: number;
  readonly natGateways: number;
  readonly publicSubnetCidr: string[];
  readonly privateSubnetCidr: string[];
}

export class VpcModule extends Construct {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props: VpcModuleProps) {
    super(scope, id);

    const publicCidrMask = props.publicSubnetCidr[0] ? Number(props.publicSubnetCidr[0].split('/')[1]) : 24;
    const privateCidrMask = props.privateSubnetCidr[0] ? Number(props.privateSubnetCidr[0].split('/')[1]) : 24;

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      ipAddresses: ec2.IpAddresses.cidr(props.cidr),
      maxAzs: props.maxAzs,
      natGateways: props.natGateways,
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: publicCidrMask,
        },
        {
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: privateCidrMask,
        },
      ],
    });
  }
}
