import * as eks from 'aws-cdk-lib/aws-eks';

export interface EnvironmentConfig {
  readonly account: string;
  readonly region: string;
  readonly stackName: string;
  readonly vpc: {
    readonly cidr: string;
    readonly maxAzs: number;
    readonly natGateways: number;
    readonly publicSubnetCidr: string[];
    readonly privateSubnetCidr: string[];
  };
  readonly eks: {
    readonly clusterName: string;
    readonly version: eks.KubernetesVersion;
    readonly endpointAccess: eks.EndpointAccess;
    readonly nodeInstanceType: string;
    readonly desiredCapacity: number;
    readonly minCapacity: number;
    readonly maxCapacity: number;
  };
  readonly ecr: {
    readonly repositories: string[];
  };
  readonly rds: {
    readonly instanceType: string;
    readonly databaseName: string;
    readonly multiAz: boolean;
    readonly backupRetention: number;
    readonly allocatedStorage: number;
  };
  readonly externalDns: {
    readonly domainFilter: string;
    readonly hostedZoneId?: string;
  };
  readonly modules: {
    readonly vpcModule: boolean;
    readonly eksModule: boolean;
    readonly albControllerModule: boolean;
    readonly kmsModule: boolean;
    readonly ecrModule: boolean;
    readonly rdsModule: boolean;
    readonly externalDnsModule: boolean;
    readonly clusterAutoscalerModule: boolean;
  };
}
