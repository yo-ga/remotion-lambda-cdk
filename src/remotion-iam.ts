import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

/**
 * Properties for the RemotionIam construct.
 */
export interface RemotionIamProps {
  /**
   * Whether to create a managed policy document for the deploying IAM user.
   * @default true
   */
  readonly createUserPolicy?: boolean;
}

/**
 * CDK Construct that provisions IAM resources required by Remotion Lambda:
 * - `remotion-lambda-role`: execution role assumed by the Lambda function
 * - User policy: inline policy document the deploying IAM user should attach
 *
 * @see https://www.remotion.dev/docs/lambda/permissions
 */
export class RemotionIam extends Construct {
  /**
   * The IAM role to be assumed by the Remotion Lambda function.
   * Role name: `remotion-lambda-role`
   */
  public readonly role: iam.Role;

  /**
   * Managed policy containing the permissions the deploying IAM user needs.
   * Only created when `createUserPolicy` is true (default).
   */
  public readonly userPolicy?: iam.ManagedPolicy;

  constructor(scope: Construct, id: string, props?: RemotionIamProps) {
    super(scope, id);

    const createUserPolicy = props?.createUserPolicy ?? true;

    // -----------------------------------------------------------------------
    // Lambda execution role
    // -----------------------------------------------------------------------
    this.role = new iam.Role(this, 'LambdaRole', {
      roleName: 'remotion-lambda-role',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for Remotion Lambda render functions',
      inlinePolicies: {
        RemotionLambdaRolePolicy: new iam.PolicyDocument({
          statements: [
            // List all buckets (needed to detect existing Remotion bucket)
            new iam.PolicyStatement({
              sid: 'ListAllBuckets',
              effect: iam.Effect.ALLOW,
              actions: ['s3:ListAllMyBuckets'],
              resources: ['*'],
            }),
            // Read/write to remotionlambda-* buckets
            new iam.PolicyStatement({
              sid: 'RemotionBucketAccess',
              effect: iam.Effect.ALLOW,
              actions: [
                's3:CreateBucket',
                's3:ListBucket',
                's3:PutBucketAcl',
                's3:GetObject',
                's3:DeleteObject',
                's3:PutObjectAcl',
                's3:PutObject',
                's3:GetBucketLocation',
              ],
              resources: ['arn:aws:s3:::remotionlambda-*'],
            }),
            // Invoke other render Lambda functions (fan-out)
            new iam.PolicyStatement({
              sid: 'InvokeLambda',
              effect: iam.Effect.ALLOW,
              actions: ['lambda:InvokeFunction'],
              resources: ['arn:aws:lambda:*:*:function:remotion-render-*'],
            }),
            // Create Lambda Insights log group
            new iam.PolicyStatement({
              sid: 'LambdaInsightsLogGroup',
              effect: iam.Effect.ALLOW,
              actions: ['logs:CreateLogGroup'],
              resources: ['arn:aws:logs:*:*:log-group:/aws/lambda-insights'],
            }),
            // Write logs for render functions
            new iam.PolicyStatement({
              sid: 'RenderFunctionLogs',
              effect: iam.Effect.ALLOW,
              actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
              resources: [
                'arn:aws:logs:*:*:log-group:/aws/lambda/remotion-render-*',
                'arn:aws:logs:*:*:log-group:/aws/lambda-insights:*',
              ],
            }),
          ],
        }),
      },
    });

    // -----------------------------------------------------------------------
    // User (deployer) policy
    // -----------------------------------------------------------------------
    if (createUserPolicy) {
      this.userPolicy = new iam.ManagedPolicy(this, 'UserPolicy', {
        managedPolicyName: 'remotion-lambda-user-policy',
        description: 'Policy for the IAM user that deploys and manages Remotion Lambda',
        document: new iam.PolicyDocument({
          statements: [
            // Service quota management
            new iam.PolicyStatement({
              sid: 'HandleQuotas',
              effect: iam.Effect.ALLOW,
              actions: [
                'servicequotas:GetServiceQuota',
                'servicequotas:GetAWSDefaultServiceQuota',
                'servicequotas:RequestServiceQuotaIncrease',
                'servicequotas:ListRequestedServiceQuotaChangeHistoryByQuota',
              ],
              resources: ['*'],
            }),
            // Permission validation (simulate)
            new iam.PolicyStatement({
              sid: 'PermissionValidation',
              effect: iam.Effect.ALLOW,
              actions: ['iam:SimulatePrincipalPolicy'],
              resources: ['*'],
            }),
            // Allow passing the Lambda execution role
            new iam.PolicyStatement({
              sid: 'LambdaInvocation',
              effect: iam.Effect.ALLOW,
              actions: ['iam:PassRole'],
              resources: ['arn:aws:iam::*:role/remotion-lambda-role'],
            }),
            // S3 bucket and object management for remotionlambda-* buckets
            new iam.PolicyStatement({
              sid: 'Storage',
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:DeleteObject',
                's3:PutObjectAcl',
                's3:PutObject',
                's3:CreateBucket',
                's3:ListBucket',
                's3:GetBucketLocation',
                's3:PutBucketAcl',
                's3:DeleteBucket',
                's3:PutBucketOwnershipControls',
                's3:PutBucketPublicAccessBlock',
                's3:PutBucketPolicy',
                's3:PutLifecycleConfiguration',
              ],
              resources: ['arn:aws:s3:::remotionlambda-*'],
            }),
            // List all buckets to detect existing Remotion bucket
            new iam.PolicyStatement({
              sid: 'BucketListing',
              effect: iam.Effect.ALLOW,
              actions: ['s3:ListAllMyBuckets'],
              resources: ['*'],
            }),
            // List and inspect Lambda functions
            new iam.PolicyStatement({
              sid: 'FunctionListing',
              effect: iam.Effect.ALLOW,
              actions: ['lambda:ListFunctions', 'lambda:GetFunction'],
              resources: ['*'],
            }),
            // Create / delete / invoke render functions
            new iam.PolicyStatement({
              sid: 'FunctionManagement',
              effect: iam.Effect.ALLOW,
              actions: [
                'lambda:InvokeAsync',
                'lambda:InvokeFunction',
                'lambda:CreateFunction',
                'lambda:DeleteFunction',
                'lambda:PutFunctionEventInvokeConfig',
                'lambda:PutRuntimeManagementConfig',
                'lambda:TagResource',
              ],
              resources: ['arn:aws:lambda:*:*:function:remotion-render-*'],
            }),
            // Set log retention for render functions
            new iam.PolicyStatement({
              sid: 'LogsRetention',
              effect: iam.Effect.ALLOW,
              actions: ['logs:CreateLogGroup', 'logs:PutRetentionPolicy'],
              resources: ['arn:aws:logs:*:*:log-group:/aws/lambda/remotion-render-*'],
            }),
            // Fetch Remotion-provided Chromium layer
            new iam.PolicyStatement({
              sid: 'FetchBinaries',
              effect: iam.Effect.ALLOW,
              actions: ['lambda:GetLayerVersion'],
              resources: [
                'arn:aws:lambda:*:678892195805:layer:remotion-binaries-*',
                'arn:aws:lambda:*:580247275435:layer:LambdaInsightsExtension*',
              ],
            }),
          ],
        }),
      });
    }
  }
}
