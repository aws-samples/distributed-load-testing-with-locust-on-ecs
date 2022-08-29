import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

export interface LocustWorkerServiceProps {
  readonly image: ecs.ContainerImage;
  readonly cluster: ecs.ICluster;
  readonly locustMasterHostName: string;
}

export class LocustWorkerService extends Construct {
  public readonly service: ecs.FargateService;

  constructor(scope: Construct, id: string, props: LocustWorkerServiceProps) {
    super(scope, id);

    const { cluster, image } = props;

    const workerTaskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      // a locust worker can use only 1 core: https://github.com/locustio/locust/issues/1493
      cpu: 1024,
      memoryLimitMiB: 2048,
    });

    workerTaskDefinition
      .addContainer('locust', {
        image,
        command: ['--worker', '--master-host', props.locustMasterHostName],
        logging: ecs.LogDriver.awsLogs({
          streamPrefix: 'locust-worker',
          logRetention: RetentionDays.SIX_MONTHS,
        }),
        environment: {},
      })
      .addUlimits({
        name: ecs.UlimitName.NOFILE,
        // Set as Locust recommendation https://github.com/locustio/locust/pull/1375
        hardLimit: 10000,
        softLimit: 10000,
      });

    const service = new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition: workerTaskDefinition,
      // You can adjust spot:on-demand ratio here
      capacityProviderStrategies: [
        {
          capacityProvider: 'FARGATE_SPOT',
          weight: 1,
        },
        {
          capacityProvider: 'FARGATE',
          weight: 0,
        },
      ],
      minHealthyPercent: 0,
    });

    this.service = service;
  }
}
