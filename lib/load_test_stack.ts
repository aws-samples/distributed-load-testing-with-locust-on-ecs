import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { AssetImage } from 'aws-cdk-lib/aws-ecs';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { LocustMasterService } from './constructs/locust_master_service';
import { LocustWorkerService } from './constructs/locust_worker_service';

interface LoadTestStackProps extends StackProps {
  readonly allowedCidrs: string[];
  readonly certificateArn?: string;
  readonly webUsername?: string;
  readonly webPassword?: string;
}

export class LoadTestStack extends Stack {
  constructor(scope: Construct, id: string, props: LoadTestStackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'Vpc', {
      natGateways: 1,
    });

    const logBucket = new Bucket(this, 'LogBucket', {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    });

    // Uncomment this if you don't need VPC flow logs.
    vpc.addFlowLog('FlowLogS3', {
      destination: ec2.FlowLogDestination.toS3(logBucket, 'vpcFlowLog'),
    });

    // Add explicit dependency https://github.com/aws/aws-cdk/issues/18985
    vpc.node.findChild('FlowLogS3').node.findChild('FlowLog').node.addDependency(logBucket);

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      defaultCloudMapNamespace: { name: 'locust' },
      containerInsights: true,
    });

    const locustImage = new AssetImage('app');

    const master = new LocustMasterService(this, 'Master', {
      image: locustImage,
      cluster,
      certificateArn: props.certificateArn,
      allowedCidrs: props.allowedCidrs,
      logBucket,
      webUsername: props.webUsername,
      webPassword: props.webPassword,
    });

    const worker = new LocustWorkerService(this, 'Worker', {
      image: locustImage,
      cluster,
      locustMasterHostName: master.configMapHostname,
    });

    master.allowWorkerConnectionFrom(worker);

    new CfnOutput(this, 'WorkerServiceName', {
      value: worker.service.serviceName,
    });

    new CfnOutput(this, 'EcsClusterArn', {
      value: cluster.clusterArn,
    });
  }
}
