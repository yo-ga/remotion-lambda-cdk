import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { RemotionStack } from '../src/remotion-stack';

describe('RemotionStack', () => {
  let app: cdk.App;
  let stack: RemotionStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new RemotionStack(app, 'TestRemotionStack', {
      remotionVersion: '4-0-272',
      env: { region: 'us-east-1', account: '123456789012' },
    });
    template = Template.fromStack(stack);
  });

  describe('resource composition', () => {
    it('creates an IAM role (remotion-lambda-role)', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'remotion-lambda-role',
      });
    });

    it('creates a user managed policy (remotion-lambda-user-policy)', () => {
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        ManagedPolicyName: 'remotion-lambda-user-policy',
      });
    });

    it('creates an S3 bucket with remotionlambda- prefix', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: Match.stringLikeRegexp('^remotionlambda-'),
      });
    });

    it('creates a Lambda function matching remotion-render-* pattern', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: Match.stringLikeRegexp('^remotion-render-'),
      });
    });
  });

  describe('props forwarding', () => {
    it('uses the provided remotionVersion in the function name', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'remotion-render-2048mb-120s-4-0-272',
      });
    });

    it('forwards memorySizeMb to the Lambda function', () => {
      const customStack = new RemotionStack(app, 'CustomStack', {
        remotionVersion: '4-0-1',
        memorySizeMb: 4096,
        env: { region: 'us-east-1', account: '123456789012' },
      });
      const customTemplate = Template.fromStack(customStack);
      customTemplate.hasResourceProperties('AWS::Lambda::Function', {
        MemorySize: 4096,
      });
    });

    it('forwards renderExpirationDays to the S3 bucket', () => {
      const customStack = new RemotionStack(app, 'ExpireStack', {
        remotionVersion: '4-0-1',
        renderExpirationDays: 14,
        env: { region: 'us-east-1', account: '123456789012' },
      });
      const customTemplate = Template.fromStack(customStack);
      customTemplate.hasResourceProperties('AWS::S3::Bucket', {
        LifecycleConfiguration: {
          Rules: Match.arrayWith([
            Match.objectLike({ ExpirationInDays: 14 }),
          ]),
        },
      });
    });

    it('forwards bucketSuffix to the S3 bucket name', () => {
      const customStack = new RemotionStack(app, 'SuffixStack', {
        remotionVersion: '4-0-1',
        bucketSuffix: 'myapp',
        env: { region: 'us-east-1', account: '123456789012' },
      });
      const customTemplate = Template.fromStack(customStack);
      customTemplate.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'remotionlambda-myapp',
      });
    });
  });

  describe('CloudFormation outputs', () => {
    it('exports BucketName output', () => {
      template.hasOutput('BucketName', {
        Description: 'Remotion S3 bucket name',
      });
    });

    it('exports FunctionName output', () => {
      template.hasOutput('FunctionName', {
        Description: 'Remotion render Lambda function name',
      });
    });

    it('exports FunctionArn output', () => {
      template.hasOutput('FunctionArn', {
        Description: 'Remotion render Lambda function ARN',
      });
    });

    it('exports RoleArn output', () => {
      template.hasOutput('RoleArn', {
        Description: 'Remotion Lambda execution role ARN',
      });
    });
  });

  describe('construct properties', () => {
    it('exposes iam construct', () => {
      expect(stack.iam).toBeDefined();
    });

    it('exposes siteBucket construct', () => {
      expect(stack.siteBucket).toBeDefined();
    });

    it('exposes lambdaFunction construct', () => {
      expect(stack.lambdaFunction).toBeDefined();
    });
  });
});
