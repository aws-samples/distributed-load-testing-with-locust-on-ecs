import { Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { ApplicationProtocol, SslPolicy } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { LocustWorkerService } from './locust_worker_service';

export interface LocustMasterServiceProps {
  readonly image: ecs.ContainerImage;
  readonly cluster: ecs.ICluster;
  readonly certificateArn?: string;
  readonly allowedCidrs: string[];
  readonly logBucket: IBucket;
  readonly webUsername?: string;
  readonly webPassword?: string;
}

export class LocustMasterService extends Construct {
  public readonly configMapHostname: string;
  private readonly service: ecs.FargateService;

  constructor(scope: Construct, id: string, props: LocustMasterServiceProps) {
    super(scope, id);

    const { cluster, image, webUsername, webPassword } = props;

    const configMapName = 'master';

    const protocol = props.certificateArn != null ? ApplicationProtocol.HTTPS : ApplicationProtocol.HTTP;

    let certificate = undefined;
    if (props.certificateArn != null) {
      certificate = Certificate.fromCertificateArn(this, 'Cert', props.certificateArn);
    }

    const masterTaskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      cpu: 1024,
      memoryLimitMiB: 2048,
    });

    const command = ['--master'];
    if (webUsername != null && webPassword != null) {
      command.push('--web-auth');
      command.push(`${webUsername}:${webPassword}`);
    }

    masterTaskDefinition.addContainer('locust', {
      image,
      command,
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: 'locust-master',
        logRetention: RetentionDays.SIX_MONTHS,
      }),
      portMappings: [
        {
          containerPort: 8089,
        },
      ],
    });

    const master = new ApplicationLoadBalancedFargateService(this, 'Service', {
      cluster,
      // We only need just one instance for Locust master
      desiredCount: 1,
      targetProtocol: ApplicationProtocol.HTTP,
      openListener: false,
      cloudMapOptions: {
        name: configMapName,
      },
      cpu: 1024,
      memoryLimitMiB: 2048,
      taskDefinition: masterTaskDefinition,
      healthCheckGracePeriod: Duration.seconds(20),
      protocol,
      certificate,
      sslPolicy: protocol == ApplicationProtocol.HTTPS ? SslPolicy.RECOMMENDED : undefined,
      circuitBreaker: { rollback: true },
    });

    // https://github.com/aws/aws-cdk/issues/4015
    master.targetGroup.setAttribute('deregistration_delay.timeout_seconds', '10');

    master.targetGroup.configureHealthCheck({
      interval: Duration.seconds(15),
      healthyThresholdCount: 2,
      // regard 401 as healthy because we cannot use basic auth for health check
      healthyHttpCodes: '200,401',
    });

    const port = protocol == ApplicationProtocol.HTTPS ? 443 : 80;
    props.allowedCidrs.forEach((cidr) =>
      master.loadBalancer.connections.allowFrom(ec2.Peer.ipv4(cidr), ec2.Port.tcp(port)),
    );

    master.loadBalancer.logAccessLogs(props.logBucket, 'locustAlbAccessLog');

    this.service = master.service;
    this.configMapHostname = `${configMapName}.${cluster.defaultCloudMapNamespace!.namespaceName}`;
  }

  public allowWorkerConnectionFrom(worker: LocustWorkerService) {
    // 5557 is a port number from which master accept connection from workers
    // https://docs.locust.io/en/2.8.1/running-distributed.html
    this.service.connections.allowFrom(worker.service, ec2.Port.tcp(5557));
  }
}
