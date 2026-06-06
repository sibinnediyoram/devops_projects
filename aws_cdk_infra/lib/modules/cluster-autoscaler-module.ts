import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import { CfnJson } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';

export interface ClusterAutoscalerModuleProps {
  readonly cluster: eks.Cluster;
}

export class ClusterAutoscalerModule extends Construct {
  constructor(scope: Construct, id: string, props: ClusterAutoscalerModuleProps) {
    super(scope, id);

    const serviceAccount = props.cluster.addServiceAccount('ClusterAutoscalerServiceAccount', {
      name: 'cluster-autoscaler',
      namespace: 'kube-system',
    });

    serviceAccount.role.attachInlinePolicy(
      new iam.Policy(this, 'ClusterAutoscalerPolicy', {
        statements: [
          // Read-only describe permissions — no resource scoping needed
          new iam.PolicyStatement({
            actions: [
              'autoscaling:DescribeAutoScalingGroups',
              'autoscaling:DescribeAutoScalingInstances',
              'autoscaling:DescribeLaunchConfigurations',
              'autoscaling:DescribeScalingActivities',
              'autoscaling:DescribeTags',
              'ec2:DescribeLaunchTemplateVersions',
              'ec2:DescribeInstanceTypes',
            ],
            resources: ['*'],
          }),
          // Mutating permissions scoped to ASGs owned by this cluster.
          // CfnJson defers token resolution (cluster name Ref) to deploy time so
          // it can be used as a JSON object key in the IAM condition.
          new iam.PolicyStatement({
            actions: [
              'autoscaling:SetDesiredCapacity',
              'autoscaling:TerminateInstanceInAutoScalingGroup',
            ],
            resources: ['*'],
            conditions: {
              StringEquals: new CfnJson(this, 'CaCondition', {
                value: {
                  [`autoscaling:ResourceTag/k8s.io/cluster-autoscaler/${props.cluster.clusterName}`]: 'owned',
                  'autoscaling:ResourceTag/k8s.io/cluster-autoscaler/enabled': 'true',
                },
              }),
            },
          }),
        ],
      }),
    );

    props.cluster.addHelmChart('ClusterAutoscaler', {
      chart: 'cluster-autoscaler',
      repository: 'https://kubernetes.github.io/autoscaler',
      release: 'cluster-autoscaler',
      namespace: 'kube-system',
      version: '9.43.2',
      values: {
        autoDiscovery: { clusterName: props.cluster.clusterName },
        awsRegion: props.cluster.stack.region,
        serviceAccount: {
          create: false,
          name: serviceAccount.serviceAccountName,
        },
        extraArgs: {
          'balance-similar-node-groups': true,
          'skip-nodes-with-system-pods': false,
        },
      },
      wait: false,
    });
  }
}
