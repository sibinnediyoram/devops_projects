import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Duration, RemovalPolicy } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';

export interface RdsModuleProps {
  readonly vpc: ec2.IVpc;
  readonly clusterSecurityGroup: ec2.ISecurityGroup;
  readonly instanceType: string;
  readonly databaseName: string;
  readonly multiAz: boolean;
  readonly backupRetention: number;
  readonly allocatedStorage: number;
  readonly encryptionKey?: kms.IKey;
}

export class RdsModule extends Construct {
  public readonly instance: rds.DatabaseInstance;
  public readonly secret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: RdsModuleProps) {
    super(scope, id);

    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc: props.vpc,
      description: 'PostgreSQL access from EKS cluster',
      allowAllOutbound: false,
    });

    dbSecurityGroup.addIngressRule(
      props.clusterSecurityGroup,
      ec2.Port.tcp(5432),
      'EKS cluster to PostgreSQL',
    );

    this.instance = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: new ec2.InstanceType(props.instanceType),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [dbSecurityGroup],
      databaseName: props.databaseName,
      credentials: rds.Credentials.fromGeneratedSecret('postgres', {
        encryptionKey: props.encryptionKey,
      }),
      storageEncrypted: true,
      storageEncryptionKey: props.encryptionKey,
      multiAz: props.multiAz,
      allocatedStorage: props.allocatedStorage,
      maxAllocatedStorage: props.allocatedStorage * 5,
      backupRetention: Duration.days(props.backupRetention),
      // Protect prod (multiAz) instances from accidental deletion
      deletionProtection: props.multiAz,
      removalPolicy: props.multiAz ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    // Always defined when using fromGeneratedSecret
    this.secret = this.instance.secret!;
  }
}
