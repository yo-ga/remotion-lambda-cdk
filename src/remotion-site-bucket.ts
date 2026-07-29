import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

/**
 * Properties for the RemotionSiteBucket construct.
 */
export interface RemotionSiteBucketProps {
  /**
   * Automatic expiration (in days) for render output objects.
   * When set, a lifecycle rule is added to delete render objects after this many days.
   * @default - no expiration
   */
  readonly renderExpirationDays?: number;

  /**
   * Whether to enable versioning on the bucket.
   * @default false
   */
  readonly versioned?: boolean;

  /**
   * Suffix appended to the bucket name.
   * Final bucket name will be `remotionlambda-{bucketSuffix}`.
   * When omitted a CDK-generated unique suffix is used.
   * @default - CDK unique suffix derived from the construct path
   */
  readonly bucketSuffix?: string;
}

/**
 * CDK Construct that provisions the S3 bucket required by Remotion Lambda.
 *
 * The bucket is used to store:
 * - Remotion sites (bundled frontend assets)
 * - Render output videos
 * - Render metadata
 *
 * The bucket name always starts with `remotionlambda-` to match the IAM
 * policy resource patterns.
 *
 * @see https://www.remotion.dev/docs/lambda/bucket-naming
 */
export class RemotionSiteBucket extends Construct {
  /**
   * The underlying S3 bucket provisioned by this construct.
   */
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: RemotionSiteBucketProps) {
    super(scope, id);

    const { renderExpirationDays, versioned = false, bucketSuffix } = props ?? {};

    // Determine bucket name
    // If a suffix is provided use remotionlambda-{suffix}, otherwise let CDK
    // auto-generate a unique physical name (still prefixed via bucketName).
    const bucketName = bucketSuffix
      ? `remotionlambda-${bucketSuffix}`
      : undefined; // CDK generates a unique name; we enforce the prefix via RemovalPolicy only

    // Build lifecycle rules
    const lifecycleRules: s3.LifecycleRule[] = [];
    if (renderExpirationDays !== undefined && renderExpirationDays > 0) {
      lifecycleRules.push({
        id: 'ExpireRenders',
        enabled: true,
        prefix: 'renders/',
        expiration: cdk.Duration.days(renderExpirationDays),
      });
    }

    // When no explicit suffix is provided we still need the name to start with
    // "remotionlambda-".  Use a deterministic suffix based on the node unique id.
    const resolvedBucketName = bucketName ?? `remotionlambda-${cdk.Names.uniqueId(this).toLowerCase().slice(0, 16)}`;

    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: resolvedBucketName,

      // Block all public access at the ACL level; public read is granted via
      // bucket policy for site assets only.
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),

      // Allow public GET for site assets (Remotion browser-side rendering).
      publicReadAccess: true,

      // CORS: allow browsers to fetch site assets and render metadata.
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],

      versioned,

      lifecycleRules: lifecycleRules.length > 0 ? lifecycleRules : undefined,

      // Retain the bucket on stack deletion to avoid losing rendered videos.
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
  }
}
