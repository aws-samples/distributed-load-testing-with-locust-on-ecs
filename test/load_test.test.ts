import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as LoadTest from '../lib/load_test_stack';

test('Snapshot test', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new LoadTest.LoadTestStack(app, 'MyTestStack', {
    env: {
      region: 'us-west-2',
    },
    allowedCidrs: ['0.0.0.0/0'],
  });
  // THEN
  const template = Template.fromStack(stack);
  expect(template).toMatchSnapshot();
});
