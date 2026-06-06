#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { AwsCdkInfraStack } from '../lib/aws_cdk_infra-stack';
import { devEnvironment } from '../lib/env/dev';
import { prodEnvironment } from '../lib/env/prod';

const app = new cdk.App();

const environmentName = app.node.tryGetContext('env') ?? process.env.CDK_ENV ?? 'dev';
const environment = environmentName === 'prod' ? prodEnvironment : devEnvironment;

new AwsCdkInfraStack(app, environment.stackName, {
  stackName: environment.stackName,
  env: {
    account: environment.account,
    region: environment.region,
  },
  environmentName,
});
