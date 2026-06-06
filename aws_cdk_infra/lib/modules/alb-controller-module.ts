import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import albControllerPolicyDocument from '../policies/alb-controller-iam-policy.json';

export interface AlbControllerModuleProps {
  readonly cluster: eks.Cluster;
}

export class AlbControllerModule extends Construct {
  constructor(scope: Construct, id: string, props: AlbControllerModuleProps) {
    super(scope, id);

    const serviceAccount = props.cluster.addServiceAccount('AlbControllerServiceAccount', {
      name: 'aws-load-balancer-controller',
      namespace: 'kube-system',
    });

    const albPolicy = new iam.ManagedPolicy(this, 'AlbControllerPolicy', {
      document: iam.PolicyDocument.fromJson(albControllerPolicyDocument),
    });

    serviceAccount.role.addManagedPolicy(albPolicy);

    props.cluster.addHelmChart('AwsLoadBalancerController', {
      chart: 'aws-load-balancer-controller',
      repository: 'https://aws.github.io/eks-charts',
      release: 'aws-load-balancer-controller',
      namespace: 'kube-system',
      version: '1.13.0',
      values: {
        clusterName: props.cluster.clusterName,
        serviceAccount: {
          create: false,
          name: serviceAccount.serviceAccountName,
        },
      },
      wait: true,
    });
  }
}
