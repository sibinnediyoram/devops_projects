import * as eks from 'aws-cdk-lib/aws-eks';
import { EnvironmentConfig } from '../types';

export const devEnvironment: EnvironmentConfig = {
  account: process.env.CDK_DEFAULT_ACCOUNT ?? '123456789012',
  region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  stackName: 'aws-cdk-infra-dev',
  vpc: {
    cidr: '10.10.0.0/16',
    maxAzs: 2,
    natGateways: 1,
    publicSubnetCidr: ['10.10.1.0/24', '10.10.2.0/24'],
    privateSubnetCidr: ['10.10.11.0/24', '10.10.12.0/24'],
  },
  eks: {
    clusterName: 'dev-eks-cluster',
    version: eks.KubernetesVersion.V1_31,
    endpointAccess: eks.EndpointAccess.PUBLIC_AND_PRIVATE,
    nodeInstanceType: 't3.medium',
    desiredCapacity: 1,
    minCapacity: 1,
    maxCapacity: 2,
  },
  ecr: {
    repositories: ['app', 'worker'],
  },
  rds: {
    instanceType: 'db.t3.medium',
    databaseName: 'appdb',
    multiAz: false,
    backupRetention: 1,
    allocatedStorage: 20,
  },
  externalDns: {
    domainFilter: 'dev.example.com',
  },
  modules: {
    vpcModule: true,
    eksModule: true,
    albControllerModule: false,
    kmsModule: true,
    ecrModule: true,
    rdsModule: true,
    externalDnsModule: true,
    clusterAutoscalerModule: true,
  },
};
