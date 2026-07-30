import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

/**
 * Remotion-provided runtime layer ARNs per region.
 * Layer account: 678892195805 (Remotion)
 *
 * @see https://www.remotion.dev/docs/lambda/runtime
 */
const REMOTION_LAYER_ARNS: Record<string, string[]> = {
  'us-east-1': [
    'arn:aws:lambda:us-east-1:678892195805:layer:remotion-binaries-fonts-arm64:31',
    'arn:aws:lambda:us-east-1:678892195805:layer:remotion-binaries-chromium-arm64:39',
    'arn:aws:lambda:us-east-1:678892195805:layer:remotion-binaries-emoji-google-arm64:14',
    'arn:aws:lambda:us-east-1:678892195805:layer:remotion-binaries-cjk-arm64:14',
  ],
  'us-east-2': [
    'arn:aws:lambda:us-east-2:678892195805:layer:remotion-binaries-fonts-arm64:26',
    'arn:aws:lambda:us-east-2:678892195805:layer:remotion-binaries-chromium-arm64:30',
    'arn:aws:lambda:us-east-2:678892195805:layer:remotion-binaries-emoji-google-arm64:14',
    'arn:aws:lambda:us-east-2:678892195805:layer:remotion-binaries-cjk-arm64:14',
  ],
  'us-west-2': [
    'arn:aws:lambda:us-west-2:678892195805:layer:remotion-binaries-fonts-arm64:26',
    'arn:aws:lambda:us-west-2:678892195805:layer:remotion-binaries-chromium-arm64:30',
    'arn:aws:lambda:us-west-2:678892195805:layer:remotion-binaries-emoji-google-arm64:14',
    'arn:aws:lambda:us-west-2:678892195805:layer:remotion-binaries-cjk-arm64:14',
  ],
  'eu-west-1': [
    'arn:aws:lambda:eu-west-1:678892195805:layer:remotion-binaries-fonts-arm64:27',
    'arn:aws:lambda:eu-west-1:678892195805:layer:remotion-binaries-chromium-arm64:30',
    'arn:aws:lambda:eu-west-1:678892195805:layer:remotion-binaries-emoji-google-arm64:14',
    'arn:aws:lambda:eu-west-1:678892195805:layer:remotion-binaries-cjk-arm64:14',
  ],
  'eu-west-2': [
    'arn:aws:lambda:eu-west-2:678892195805:layer:remotion-binaries-fonts-arm64:26',
    'arn:aws:lambda:eu-west-2:678892195805:layer:remotion-binaries-chromium-arm64:30',
    'arn:aws:lambda:eu-west-2:678892195805:layer:remotion-binaries-emoji-google-arm64:14',
    'arn:aws:lambda:eu-west-2:678892195805:layer:remotion-binaries-cjk-arm64:14',
  ],
  'eu-central-1': [
    'arn:aws:lambda:eu-central-1:678892195805:layer:remotion-binaries-fonts-arm64:64',
    'arn:aws:lambda:eu-central-1:678892195805:layer:remotion-binaries-chromium-arm64:64',
    'arn:aws:lambda:eu-central-1:678892195805:layer:remotion-binaries-emoji-google-arm64:26',
    'arn:aws:lambda:eu-central-1:678892195805:layer:remotion-binaries-cjk-arm64:26',
  ],
  'ap-southeast-1': [
    'arn:aws:lambda:ap-southeast-1:678892195805:layer:remotion-binaries-fonts-arm64:26',
    'arn:aws:lambda:ap-southeast-1:678892195805:layer:remotion-binaries-chromium-arm64:30',
    'arn:aws:lambda:ap-southeast-1:678892195805:layer:remotion-binaries-emoji-google-arm64:14',
    'arn:aws:lambda:ap-southeast-1:678892195805:layer:remotion-binaries-cjk-arm64:14',
  ],
  'ap-southeast-2': [
    'arn:aws:lambda:ap-southeast-2:678892195805:layer:remotion-binaries-fonts-arm64:26',
    'arn:aws:lambda:ap-southeast-2:678892195805:layer:remotion-binaries-chromium-arm64:30',
    'arn:aws:lambda:ap-southeast-2:678892195805:layer:remotion-binaries-emoji-google-arm64:14',
    'arn:aws:lambda:ap-southeast-2:678892195805:layer:remotion-binaries-cjk-arm64:14',
  ],
  'ap-northeast-1': [
    'arn:aws:lambda:ap-northeast-1:678892195805:layer:remotion-binaries-fonts-arm64:26',
    'arn:aws:lambda:ap-northeast-1:678892195805:layer:remotion-binaries-chromium-arm64:30',
    'arn:aws:lambda:ap-northeast-1:678892195805:layer:remotion-binaries-emoji-google-arm64:14',
    'arn:aws:lambda:ap-northeast-1:678892195805:layer:remotion-binaries-cjk-arm64:14',
  ],
  'ap-south-1': [
    'arn:aws:lambda:ap-south-1:678892195805:layer:remotion-binaries-fonts-arm64:26',
    'arn:aws:lambda:ap-south-1:678892195805:layer:remotion-binaries-chromium-arm64:30',
    'arn:aws:lambda:ap-south-1:678892195805:layer:remotion-binaries-emoji-google-arm64:14',
    'arn:aws:lambda:ap-south-1:678892195805:layer:remotion-binaries-cjk-arm64:14',
  ],
  'sa-east-1': [
    'arn:aws:lambda:sa-east-1:678892195805:layer:remotion-binaries-fonts-arm64:22',
    'arn:aws:lambda:sa-east-1:678892195805:layer:remotion-binaries-chromium-arm64:22',
    'arn:aws:lambda:sa-east-1:678892195805:layer:remotion-binaries-emoji-google-arm64:13',
    'arn:aws:lambda:sa-east-1:678892195805:layer:remotion-binaries-cjk-arm64:13',
  ],
  'ca-central-1': [
    'arn:aws:lambda:ca-central-1:678892195805:layer:remotion-binaries-fonts-arm64:22',
    'arn:aws:lambda:ca-central-1:678892195805:layer:remotion-binaries-chromium-arm64:22',
    'arn:aws:lambda:ca-central-1:678892195805:layer:remotion-binaries-emoji-google-arm64:13',
    'arn:aws:lambda:ca-central-1:678892195805:layer:remotion-binaries-cjk-arm64:13',
  ],
};

const REMOTION_LAMBDA_ZIP = 'remotionlambda-arm64.zip';

const remotionRuntime = new lambda.Runtime('nodejs24.x', lambda.RuntimeFamily.NODEJS, {
  supportsInlineCode: true,
});

const remotionLambdaCode = (): lambda.Code => {
  try {
    const packageJsonPath = require.resolve('@remotion/lambda/package.json');
    return lambda.Code.fromAsset(
      path.resolve(path.dirname(packageJsonPath), REMOTION_LAMBDA_ZIP),
    );
  } catch (err) {
    throw new Error(
      'Unable to locate the official Remotion Lambda bundle. Install @remotion/lambda or pass `code` / `lambdaCode` explicitly.',
    );
  }
};

/**
 * Properties for the RemotionLambdaFunction construct.
 */
export interface RemotionLambdaFunctionProps {
  /**
   * Memory allocated to the Lambda function (in MB).
   * Must be between 512 and 10240.
   * @default 2048
   */
  readonly memorySizeMb?: number;

  /**
   * Function timeout (in seconds).
   * Maximum allowed by AWS Lambda is 900 (15 minutes).
   * @default 120
   */
  readonly timeoutSeconds?: number;

  /**
   * Ephemeral storage size (in MB).
   * Must be between 512 and 10240.
   * @default 2048
   */
  readonly ephemeralstorageSizeMb?: number;

  /**
   * Remotion version string, used to build the function name.
   * E.g. "4-0-272"  →  function name: remotion-render-2048mb-120s-4-0-272
   */
  readonly remotionVersion: string;

  /**
   * Lambda deployment package for the Remotion render function.
   *
   * By default, the construct uses the official `remotionlambda-arm64.zip`
   * asset shipped by `@remotion/lambda`. Pass this prop only if you need to
   * override that package.
   *
   * @default - official @remotion/lambda arm64 bundle
   */
  readonly code?: lambda.Code;

  /**
   * Handler exported by the deployment package.
   *
   * @default 'index.handler'
   */
  readonly handler?: string;

  /**
   * IAM execution role for the Lambda function.
   * Use the role exposed by `RemotionIam`.
   */
  readonly role: iam.IRole;
}

/**
 * CDK Construct that provisions the Remotion render Lambda function.
 *
 * The function:
 * - Is named `remotion-render-{mem}mb-{timeout}s-{version}` to match IAM policy patterns
 * - Uses the official Remotion Lambda bundle from `@remotion/lambda` by default
 * - Attaches the Remotion-provided runtime layers for the deployment region
 * - Uses Node.js 24.x runtime and arm64 architecture to match the official bundle
 * - Has configurable memory, timeout, and ephemeral storage
 * - Maximum retry attempts set to 0 (Remotion manages retries internally)
 *
 * @see https://www.remotion.dev/docs/lambda/runtime
 */
export class RemotionLambdaFunction extends Construct {
  /**
   * The underlying Lambda function provisioned by this construct.
   */
  public readonly function: lambda.Function;

  constructor(scope: Construct, id: string, props: RemotionLambdaFunctionProps) {
    super(scope, id);

    const {
      memorySizeMb = 2048,
      timeoutSeconds = 120,
      ephemeralstorageSizeMb = 2048,
      remotionVersion,
      code = remotionLambdaCode(),
      handler = 'index.handler',
      role,
    } = props;

    // Function name must match remotion-render-* for IAM policies to apply
    const functionName = `remotion-render-${memorySizeMb}mb-${timeoutSeconds}s-${remotionVersion}`;

    // Embed the layer ARN mapping as a CloudFormation Mapping so region
    // selection works at deploy time without requiring environment-specific
    // synthesis.
    const cfnStack = cdk.Stack.of(this);

    // Build layer ARNs mapping for CloudFormation Mappings section
    const mappings: Record<string, { arns: string }> = {};
    for (const [region, arns] of Object.entries(REMOTION_LAYER_ARNS)) {
      mappings[region] = { arns: arns.join(',') };
    }

    cfnStack.addMapping('RemotionLayerArns', mappings);

    const layerArns = cdk.Fn.split(
      ',',
      cdk.Fn.findInMap('RemotionLayerArns', cdk.Aws.REGION, 'arns'),
      4,
    );

    const layers = layerArns.map((arn, index) =>
      lambda.LayerVersion.fromLayerVersionArn(this, `Layer${index}`, arn),
    );

    this.function = new lambda.Function(this, 'Function', {
      functionName,
      runtime: remotionRuntime,
      architecture: lambda.Architecture.ARM_64,
      code,
      handler,
      memorySize: memorySizeMb,
      timeout: cdk.Duration.seconds(timeoutSeconds),
      ephemeralStorageSize: cdk.Size.mebibytes(ephemeralstorageSizeMb),
      role,
      layers,
      environment: {
        REMOTION_VERSION: remotionVersion,
      },
    });

    // Remotion manages retries internally; disable Lambda's built-in retries
    // on async invocations to avoid double renders.
    new lambda.EventInvokeConfig(this, 'EventInvokeConfig', {
      function: this.function,
      maxEventAge: cdk.Duration.hours(6),
      retryAttempts: 0,
    });
  }
}
