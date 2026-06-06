import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { devEnvironment } from './env/dev';
import { prodEnvironment } from './env/prod';
import { AlbControllerModule } from './modules/alb-controller-module';
import { ClusterAutoscalerModule } from './modules/cluster-autoscaler-module';
import { EcrModule } from './modules/ecr-module';
import { EksModule } from './modules/eks-module';
import { ExternalDnsModule } from './modules/external-dns-module';
import { KmsModule } from './modules/kms-module';
import { RdsModule } from './modules/rds-module';
import { VpcModule } from './modules/vpc-module';

export interface AwsCdkInfraStackProps extends cdk.StackProps {
  readonly environmentName?: string;
}

export class AwsCdkInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AwsCdkInfraStackProps = {}) {
    super(scope, id, props);

    const environmentName = props.environmentName ?? process.env.CDK_ENV ?? 'dev';
    const environment = environmentName === 'prod' ? prodEnvironment : devEnvironment;

    let kmsModule: KmsModule | undefined;
    let vpcModule: VpcModule | undefined;
    let eksModule: EksModule | undefined;
    let ecrModule: EcrModule | undefined;
    let rdsModule: RdsModule | undefined;

    if (environment.modules.kmsModule) {
      kmsModule = new KmsModule(this, 'KmsModule');
    }

    if (environment.modules.vpcModule) {
      vpcModule = new VpcModule(this, 'VpcModule', {
        cidr: environment.vpc.cidr,
        maxAzs: environment.vpc.maxAzs,
        natGateways: environment.vpc.natGateways,
        publicSubnetCidr: environment.vpc.publicSubnetCidr,
        privateSubnetCidr: environment.vpc.privateSubnetCidr,
      });
    }

    if (environment.modules.eksModule && vpcModule) {
      eksModule = new EksModule(this, 'EksModule', {
        vpc: vpcModule.vpc,
        clusterName: environment.eks.clusterName,
        version: environment.eks.version,
        endpointAccess: environment.eks.endpointAccess,
        nodeInstanceType: environment.eks.nodeInstanceType,
        desiredCapacity: environment.eks.desiredCapacity,
        minCapacity: environment.eks.minCapacity,
        maxCapacity: environment.eks.maxCapacity,
      });
    }

    if (environment.modules.ecrModule) {
      ecrModule = new EcrModule(this, 'EcrModule', {
        repositories: environment.ecr.repositories,
        encryptionKey: kmsModule?.key,
      });
    }

    if (environment.modules.rdsModule && vpcModule && eksModule) {
      rdsModule = new RdsModule(this, 'RdsModule', {
        vpc: vpcModule.vpc,
        clusterSecurityGroup: eksModule.cluster.clusterSecurityGroup,
        instanceType: environment.rds.instanceType,
        databaseName: environment.rds.databaseName,
        multiAz: environment.rds.multiAz,
        backupRetention: environment.rds.backupRetention,
        allocatedStorage: environment.rds.allocatedStorage,
        encryptionKey: kmsModule?.key,
      });
    }

    if (environment.modules.albControllerModule && eksModule) {
      new AlbControllerModule(this, 'AlbControllerModule', {
        cluster: eksModule.cluster,
      });
    }

    if (environment.modules.externalDnsModule && eksModule) {
      new ExternalDnsModule(this, 'ExternalDnsModule', {
        cluster: eksModule.cluster,
        domainFilter: environment.externalDns.domainFilter,
        hostedZoneId: environment.externalDns.hostedZoneId,
      });
    }

    if (environment.modules.clusterAutoscalerModule && eksModule) {
      new ClusterAutoscalerModule(this, 'ClusterAutoscalerModule', {
        cluster: eksModule.cluster,
      });
    }

    // Outputs
    if (vpcModule) {
      new cdk.CfnOutput(this, 'VpcId', {
        value: vpcModule.vpc.vpcId,
        description: 'VPC ID',
      });
    }

    if (eksModule) {
      new cdk.CfnOutput(this, 'EksClusterName', {
        value: eksModule.cluster.clusterName,
        description: 'EKS cluster name',
      });
    }

    if (ecrModule) {
      for (const [name, repo] of ecrModule.repositories) {
        const pascalName = name.charAt(0).toUpperCase() + name.slice(1);
        new cdk.CfnOutput(this, `EcrRepoUri${pascalName}`, {
          value: repo.repositoryUri,
          description: `ECR repository URI for ${name}`,
        });
      }
    }

    if (rdsModule) {
      new cdk.CfnOutput(this, 'RdsEndpoint', {
        value: rdsModule.instance.dbInstanceEndpointAddress,
        description: 'RDS instance endpoint',
      });
      new cdk.CfnOutput(this, 'RdsSecretArn', {
        value: rdsModule.secret.secretArn,
        description: 'Secrets Manager ARN for RDS credentials',
      });
    }
  }
}
