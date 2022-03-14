#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LoadTestStack } from '../lib/load_test_stack';

const app = new cdk.App();
new LoadTestStack(app, 'LoadTestStack', {
  env: {
    // AWS region to deploy this stack to. (Required for defining ALB access logging)
    region: 'us-west-2',
    // Aws Account ID to deploy this stack to. (Also required only if you specify certificateArn below.)
    // account: '123456789012',
  },
  // Amazon Certificate Manager certificate ARN for Locust Web UI ALB.
  // ALB can be accessed with HTTP if you don't specify this argument.
  // certificateArn: "",

  // CIDRs that can access Locust Web UI ALB.
  // It is highly recommended to set this CIDR as narrowly as possible
  // since Locust Web UI does NOT have any authentication mechanism
  allowedCidrs: ['127.0.0.1/32'],
  
  // You can enable basic auth for Locust web UI uncommenting lines below:
  // webUsername: 'admin',
  // webPassword: 'passw0rd',
});
