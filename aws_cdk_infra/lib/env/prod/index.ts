import * as eks from 'aws-cdk-lib/aws-eks';
import { EnvironmentConfig } from '../types';

export const prodEnvironment: EnvironmentConfig = {
  account: process.env.CDK_DEFAULT_ACCOUNT ?? '123456789012',
  region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  stackName: 'aws-cdk-infra-prod',
  vpc: {
    cidr: '10.20.0.0/16',
    maxAzs: 3,
    natGateways: 3,
    publicSubnetCidr: ['10.20.1.0/24', '10.20.2.0/24', '10.20.3.0/24'],
    privateSubnetCidr: ['10.20.11.0/24', '10.20.12.0/24', '10.20.13.0/24'],
  },
  eks: {
    clusterName: 'prod-eks-cluster',
    version: eks.KubernetesVersion.V1_31,
    endpointAccess: eks.EndpointAccess.PRIVATE,
    nodeInstanceType: 't3.medium',
    desiredCapacity: 2,
    minCapacity: 2,
    maxCapacity: 6,
  },
  ecr: {
    repositories: ['app', 'worker'],
  },
  rds: {
    instanceType: 'db.t3.large',
    databaseName: 'appdb',
    multiAz: true,
    backupRetention: 7,
    allocatedStorage: 100,
  },
  externalDns: {
    domainFilter: 'example.com',
  },
  modules: {
    vpcModule: true,
    eksModule: true,
    albControllerModule: true,
    kmsModule: true,
    ecrModule: true,
    rdsModule: true,
    externalDnsModule: true,
    clusterAutoscalerModule: true,
  },
};
