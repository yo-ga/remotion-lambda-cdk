import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { RemotionIam } from '../src/remotion-iam';

describe('RemotionIam', () => {
  let app: cdk.App;
  let stack: cdk.Stack;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
  });

  describe('Lambda execution role', () => {
    it('creates a role named remotion-lambda-role', () => {
      new RemotionIam(stack, 'RemotionIam');
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'remotion-lambda-role',
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: { Service: 'lambda.amazonaws.com' },
            },
          ],
        },
      });
    });

    it('allows the role to invoke remotion-render-* Lambda functions', () => {
      new RemotionIam(stack, 'RemotionIam');
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'remotion-lambda-role',
        Policies: [
          {
            PolicyDocument: {
              Statement: Match.arrayWith([
                Match.objectLike({
                  Action: 'lambda:InvokeFunction',
                  Resource: 'arn:aws:lambda:*:*:function:remotion-render-*',
                }),
              ]),
            },
          },
        ],
      });
    });

    it('allows the role to read/write remotionlambda-* S3 buckets', () => {
      new RemotionIam(stack, 'RemotionIam');
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'remotion-lambda-role',
        Policies: [
          {
            PolicyDocument: {
              Statement: Match.arrayWith([
                Match.objectLike({
                  Resource: 'arn:aws:s3:::remotionlambda-*',
                }),
              ]),
            },
          },
        ],
      });
    });
  });

  describe('User managed policy', () => {
    it('creates user policy by default', () => {
      new RemotionIam(stack, 'RemotionIam');
      const template = Template.fromStack(stack);

      template.resourceCountIs('AWS::IAM::ManagedPolicy', 1);
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        ManagedPolicyName: 'remotion-lambda-user-policy',
      });
    });

    it('skips user policy when createUserPolicy is false', () => {
      new RemotionIam(stack, 'RemotionIam', { createUserPolicy: false });
      const template = Template.fromStack(stack);

      template.resourceCountIs('AWS::IAM::ManagedPolicy', 0);
    });

    it('includes iam:PassRole for remotion-lambda-role in user policy', () => {
      new RemotionIam(stack, 'RemotionIam');
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'iam:PassRole',
              Resource: 'arn:aws:iam::*:role/remotion-lambda-role',
            }),
          ]),
        },
      });
    });

    it('includes FetchBinaries permission for Remotion Chromium layer', () => {
      new RemotionIam(stack, 'RemotionIam');
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'lambda:GetLayerVersion',
              Resource: Match.arrayWith([
                'arn:aws:lambda:*:678892195805:layer:remotion-binaries-*',
              ]),
            }),
          ]),
        },
      });
    });
  });

  describe('construct outputs', () => {
    it('exposes the role as a public property', () => {
      const construct = new RemotionIam(stack, 'RemotionIam');
      expect(construct.role).toBeDefined();
    });

    it('exposes userPolicy when createUserPolicy is true', () => {
      const construct = new RemotionIam(stack, 'RemotionIam', { createUserPolicy: true });
      expect(construct.userPolicy).toBeDefined();
    });

    it('userPolicy is undefined when createUserPolicy is false', () => {
      const construct = new RemotionIam(stack, 'RemotionIam', { createUserPolicy: false });
      expect(construct.userPolicy).toBeUndefined();
    });
  });
});
