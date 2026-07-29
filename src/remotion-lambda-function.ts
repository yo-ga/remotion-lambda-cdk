import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

/**
 * Remotion-provided Chromium layer ARNs per region.
 * Layer account: 678892195805 (Remotion)
 *
 * @see https://www.remotion.dev/docs/lambda/runtime
 */
const REMOTION_LAYER_ARNS: Record<string, string> = {
  'us-east-1': 'arn:aws:lambda:us-east-1:678892195805:layer:remotion-binaries-chromium-x86-64:1',
  'us-east-2': 'arn:aws:lambda:us-east-2:678892195805:layer:remotion-binaries-chromium-x86-64:1',
  'us-west-2': 'arn:aws:lambda:us-west-2:678892195805:layer:remotion-binaries-chromium-x86-64:1',
  'eu-west-1': 'arn:aws:lambda:eu-west-1:678892195805:layer:remotion-binaries-chromium-x86-64:1',
  'eu-west-2': 'arn:aws:lambda:eu-west-2:678892195805:layer:remotion-binaries-chromium-x86-64:1',
  'eu-central-1': 'arn:aws:lambda:eu-central-1:678892195805:layer:remotion-binaries-chromium-x86-64:1',
  'ap-southeast-1': 'arn:aws:lambda:ap-southeast-1:678892195805:layer:remotion-binaries-chromium-x86-64:1',
  'ap-southeast-2': 'arn:aws:lambda:ap-southeast-2:678892195805:layer:remotion-binaries-chromium-x86-64:1',
  'ap-northeast-1': 'arn:aws:lambda:ap-northeast-1:678892195805:layer:remotion-binaries-chromium-x86-64:1',
  'ap-south-1': 'arn:aws:lambda:ap-south-1:678892195805:layer:remotion-binaries-chromium-x86-64:1',
  'sa-east-1': 'arn:aws:lambda:sa-east-1:678892195805:layer:remotion-binaries-chromium-x86-64:1',
  'ca-central-1': 'arn:aws:lambda:ca-central-1:678892195805:layer:remotion-binaries-chromium-x86-64:1',
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
 * - Attaches the Remotion-provided Chromium layer for the deployment region
 * - Uses Node.js 18.x runtime (current Remotion Lambda recommendation)
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
      role,
    } = props;

    // Function name must match remotion-render-* for IAM policies to apply
    const functionName = `remotion-render-${memorySizeMb}mb-${timeoutSeconds}s-${remotionVersion}`;

    // Resolve the Chromium layer ARN for the deployment region.
    // cdk.Aws.REGION resolves at deploy time; fall back to a sensible default
    // pattern for the layer ARN using a CloudFormation Sub.
    const layerArn = cdk.Fn.select(
      0,
      cdk.Fn.split(
        '|',
        cdk.Fn.findInMap(
          'RemotionLayerArns',
          cdk.Aws.REGION,
          'arn',
        ),
      ),
    );

    // Embed the layer ARN mapping as a CloudFormation Mapping so region
    // selection works at deploy time without requiring environment-specific
    // synthesis.
    const cfnStack = cdk.Stack.of(this);
    (cfnStack as any).addTransform = (cfnStack as any).addTransform; // no-op guard

    // Build layer ARNs mapping for CloudFormation Mappings section
    const mappings: Record<string, { arn: string }> = {};
    for (const [region, arn] of Object.entries(REMOTION_LAYER_ARNS)) {
      mappings[region] = { arn };
    }

    // Add CloudFormation Mapping
    cfnStack.addMapping('RemotionLayerArns', mappings as any);

    // Look up the Chromium layer from the ARN
    const chromiumLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'ChromiumLayer',
      layerArn,
    );

    this.function = new lambda.Function(this, 'Function', {
      functionName,
      runtime: lambda.Runtime.NODEJS_18_X,
      // Remotion Lambda requires a real deployment package; here we use an
      // inline placeholder so the CDK construct can be synthesised and tested
      // without a real bundle.  In production, consumers should override this
      // with the actual Remotion render bundle via a custom code prop or by
      // using Remotion's own deploy CLI.
      code: lambda.Code.fromInline(
        'exports.handler = async () => ({ statusCode: 200 });',
      ),
      handler: 'index.handler',
      memorySize: memorySizeMb,
      timeout: cdk.Duration.seconds(timeoutSeconds),
      ephemeralStorageSize: cdk.Size.mebibytes(ephemeralstorageSizeMb),
      role,
      layers: [chromiumLayer],
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
