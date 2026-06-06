import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Duration, RemovalPolicy } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';

export interface EcrModuleProps {
  readonly repositories: string[];
  readonly encryptionKey?: kms.IKey;
}

export class EcrModule extends Construct {
  public readonly repositories: Map<string, ecr.Repository> = new Map();

  constructor(scope: Construct, id: string, props: EcrModuleProps) {
    super(scope, id);

    for (const repoName of props.repositories) {
      const repo = new ecr.Repository(this, `Repo-${repoName}`, {
        repositoryName: repoName,
        imageScanOnPush: true,
        imageTagMutability: ecr.TagMutability.IMMUTABLE,
        encryptionKey: props.encryptionKey,
        removalPolicy: RemovalPolicy.RETAIN,
        lifecycleRules: [
          {
            description: 'Remove untagged images after 7 days',
            tagStatus: ecr.TagStatus.UNTAGGED,
            maxImageAge: Duration.days(7),
          },
        ],
      });
      this.repositories.set(repoName, repo);
    }
  }
}
