import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface ExternalDnsModuleProps {
  readonly cluster: eks.Cluster;
  readonly domainFilter: string;
  readonly hostedZoneId?: string;
}

export class ExternalDnsModule extends Construct {
  constructor(scope: Construct, id: string, props: ExternalDnsModuleProps) {
    super(scope, id);

    const serviceAccount = props.cluster.addServiceAccount('ExternalDnsServiceAccount', {
      name: 'external-dns',
      namespace: 'kube-system',
    });

    // Scope record-set writes to a specific zone if provided; otherwise allow all zones.
    const hostedZoneArn = props.hostedZoneId
      ? `arn:aws:route53:::hostedzone/${props.hostedZoneId}`
      : 'arn:aws:route53:::hostedzone/*';

    serviceAccount.role.attachInlinePolicy(
      new iam.Policy(this, 'ExternalDnsPolicy', {
        statements: [
          new iam.PolicyStatement({
            actions: ['route53:ChangeResourceRecordSets'],
            resources: [hostedZoneArn],
          }),
          new iam.PolicyStatement({
            actions: [
              'route53:ListHostedZones',
              'route53:ListResourceRecordSets',
              'route53:ListTagsForResource',
            ],
            resources: ['*'],
          }),
        ],
      }),
    );

    props.cluster.addHelmChart('ExternalDns', {
      chart: 'external-dns',
      repository: 'https://kubernetes-sigs.github.io/external-dns',
      release: 'external-dns',
      namespace: 'kube-system',
      version: '1.15.0',
      values: {
        provider: { name: 'aws' },
        aws: { region: props.cluster.stack.region },
        domainFilters: [props.domainFilter],
        serviceAccount: {
          create: false,
          name: serviceAccount.serviceAccountName,
        },
        policy: 'sync',
        txtOwnerId: props.cluster.clusterName,
      },
      wait: false,
    });
  }
}
