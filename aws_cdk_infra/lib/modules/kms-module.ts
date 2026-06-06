import * as kms from 'aws-cdk-lib/aws-kms';
import { RemovalPolicy } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';

export class KmsModule extends Construct {
  public readonly key: kms.Key;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.key = new kms.Key(this, 'Key', {
      enableKeyRotation: true,
      description: 'Shared CMK for ECR, RDS, and Secrets Manager',
      removalPolicy: RemovalPolicy.RETAIN,
    });
  }
}
