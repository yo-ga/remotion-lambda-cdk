import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { RemotionIam } from './remotion-iam';
import { RemotionSiteBucket } from './remotion-site-bucket';
import { RemotionLambdaFunction } from './remotion-lambda-function';

/**
 * Properties for RemotionStack.
 */
export interface RemotionStackProps extends cdk.StackProps {
  /**
   * Remotion version string used to name the Lambda function.
   * Format: major-minor-patch  e.g. "4-0-272"
   */
  readonly remotionVersion: string;

  /**
   * Memory allocated to the Lambda function (MB).
   * @default 2048
   */
  readonly memorySizeMb?: number;

  /**
   * Lambda function timeout (seconds).
   * @default 120
   */
  readonly timeoutSeconds?: number;

  /**
   * Ephemeral storage size for the Lambda function (MB).
   * @default 2048
   */
  readonly ephemeralstorageSizeMb?: number;

  /**
   * Lambda deployment package for the Remotion render function.
   *
   * @default - inline placeholder handler
   */
  readonly lambdaCode?: lambda.Code;

  /**
   * Handler exported by the Lambda deployment package.
   *
   * @default 'index.handler'
   */
  readonly lambdaHandler?: string;

  /**
   * Automatic expiration (days) for render output objects in S3.
   * @default - no expiration
   */
  readonly renderExpirationDays?: number;

  /**
   * Suffix for the S3 bucket name. Final name: remotionlambda-{suffix}
   * @default - auto-generated
   */
  readonly bucketSuffix?: string;
}

/**
 * High-level CDK Stack that composes all Remotion Lambda resources:
 * - `RemotionIam` — Lambda execution role + deployer managed policy
 * - `RemotionSiteBucket` — S3 bucket for sites, renders and metadata
 * - `RemotionLambdaFunction` — Render Lambda function with Chromium layer
 *
 * Deploying a single `RemotionStack` is sufficient to set up a complete
 * Remotion Lambda rendering environment.
 *
 * @example
 * ```typescript
 * const app = new cdk.App();
 * new RemotionStack(app, 'RemotionStack', {
 *   remotionVersion: '4-0-272',
 *   env: { region: 'us-east-1', account: '123456789012' },
 * });
 * ```
 */
export class RemotionStack extends cdk.Stack {
  /** IAM construct exposing the execution role and user policy. */
  public readonly iam: RemotionIam;

  /** S3 bucket for Remotion sites and renders. */
  public readonly siteBucket: RemotionSiteBucket;

  /** Remotion render Lambda function. */
  public readonly lambdaFunction: RemotionLambdaFunction;

  constructor(scope: Construct, id: string, props: RemotionStackProps) {
    super(scope, id, props);

    const {
      remotionVersion,
      memorySizeMb,
      timeoutSeconds,
      ephemeralstorageSizeMb,
      lambdaCode,
      lambdaHandler,
      renderExpirationDays,
      bucketSuffix,
    } = props;

    // -----------------------------------------------------------------------
    // 1. IAM
    // -----------------------------------------------------------------------
    this.iam = new RemotionIam(this, 'Iam');

    // -----------------------------------------------------------------------
    // 2. S3 bucket
    // -----------------------------------------------------------------------
    this.siteBucket = new RemotionSiteBucket(this, 'SiteBucket', {
      renderExpirationDays,
      bucketSuffix,
    });

    // -----------------------------------------------------------------------
    // 3. Lambda function (depends on IAM role)
    // -----------------------------------------------------------------------
    this.lambdaFunction = new RemotionLambdaFunction(this, 'LambdaFunction', {
      remotionVersion,
      memorySizeMb,
      timeoutSeconds,
      ephemeralstorageSizeMb,
      code: lambdaCode,
      handler: lambdaHandler,
      role: this.iam.role,
    });

    // Lambda function must be created after the IAM role
    this.lambdaFunction.node.addDependency(this.iam);

    // -----------------------------------------------------------------------
    // 4. CloudFormation Outputs
    // -----------------------------------------------------------------------
    new cdk.CfnOutput(this, 'BucketName', {
      description: 'Remotion S3 bucket name',
      value: this.siteBucket.bucket.bucketName,
      exportName: `${this.stackName}-BucketName`,
    });

    new cdk.CfnOutput(this, 'FunctionName', {
      description: 'Remotion render Lambda function name',
      value: this.lambdaFunction.function.functionName,
      exportName: `${this.stackName}-FunctionName`,
    });

    new cdk.CfnOutput(this, 'FunctionArn', {
      description: 'Remotion render Lambda function ARN',
      value: this.lambdaFunction.function.functionArn,
      exportName: `${this.stackName}-FunctionArn`,
    });

    new cdk.CfnOutput(this, 'RoleArn', {
      description: 'Remotion Lambda execution role ARN',
      value: this.iam.role.roleArn,
      exportName: `${this.stackName}-RoleArn`,
    });
  }
}
