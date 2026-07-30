import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { RemotionLambdaFunction } from '../src/remotion-lambda-function';

describe('RemotionLambdaFunction', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let role: iam.Role;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', { env: { region: 'us-east-1', account: '123456789012' } });

    // Create a minimal execution role for use in tests
    role = new iam.Role(stack, 'ExecRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });
  });

  describe('function naming', () => {
    it('names the function remotion-render-{mem}mb-{timeout}s-{version}', () => {
      new RemotionLambdaFunction(stack, 'RenderFn', {
        remotionVersion: '4-0-272',
        role,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'remotion-render-2048mb-120s-4-0-272',
      });
    });

    it('reflects custom memory and timeout in the function name', () => {
      new RemotionLambdaFunction(stack, 'RenderFn', {
        memorySizeMb: 3008,
        timeoutSeconds: 300,
        remotionVersion: '4-0-272',
        role,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'remotion-render-3008mb-300s-4-0-272',
      });
    });
  });

  describe('runtime and defaults', () => {
    it('uses Node.js 18.x runtime', () => {
      new RemotionLambdaFunction(stack, 'RenderFn', {
        remotionVersion: '4-0-1',
        role,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs18.x',
      });
    });

    it('defaults to 2048 MB memory', () => {
      new RemotionLambdaFunction(stack, 'RenderFn', {
        remotionVersion: '4-0-1',
        role,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        MemorySize: 2048,
      });
    });

    it('defaults to 120s timeout', () => {
      new RemotionLambdaFunction(stack, 'RenderFn', {
        remotionVersion: '4-0-1',
        role,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        Timeout: 120,
      });
    });

    it('allows custom memory size', () => {
      new RemotionLambdaFunction(stack, 'RenderFn', {
        memorySizeMb: 4096,
        remotionVersion: '4-0-1',
        role,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        MemorySize: 4096,
      });
    });

    it('allows custom timeout', () => {
      new RemotionLambdaFunction(stack, 'RenderFn', {
        timeoutSeconds: 600,
        remotionVersion: '4-0-1',
        role,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        Timeout: 600,
      });
    });
  });

  describe('deployment package', () => {
    it('uses an inline placeholder handler by default', () => {
      new RemotionLambdaFunction(stack, 'RenderFn', {
        remotionVersion: '4-0-1',
        role,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        Code: {
          ZipFile: 'exports.handler = async () => ({ statusCode: 200 });',
        },
        Handler: 'index.handler',
      });
    });

    it('allows consumers to provide a real lambda package asset', () => {
      new RemotionLambdaFunction(stack, 'RenderFn', {
        remotionVersion: '4-0-1',
        role,
        code: lambda.Code.fromAsset(__dirname),
        handler: 'render.handler',
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        Code: {
          S3Bucket: Match.anyValue(),
          S3Key: Match.anyValue(),
        },
        Handler: 'render.handler',
      });
    });
  });

  describe('layer', () => {
    it('attaches a layer to the function', () => {
      new RemotionLambdaFunction(stack, 'RenderFn', {
        remotionVersion: '4-0-1',
        role,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        Layers: Match.arrayWith([Match.anyValue()]),
      });
    });
  });

  describe('environment variables', () => {
    it('sets REMOTION_VERSION environment variable', () => {
      new RemotionLambdaFunction(stack, 'RenderFn', {
        remotionVersion: '4-0-272',
        role,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            REMOTION_VERSION: '4-0-272',
          }),
        },
      });
    });
  });

  describe('event invoke config', () => {
    it('sets retry attempts to 0', () => {
      new RemotionLambdaFunction(stack, 'RenderFn', {
        remotionVersion: '4-0-1',
        role,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::EventInvokeConfig', {
        MaximumRetryAttempts: 0,
      });
    });
  });

  describe('construct outputs', () => {
    it('exposes the Lambda function as a public property', () => {
      const construct = new RemotionLambdaFunction(stack, 'RenderFn', {
        remotionVersion: '4-0-1',
        role,
      });
      expect(construct.function).toBeDefined();
    });
  });
});
