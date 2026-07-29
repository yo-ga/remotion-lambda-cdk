import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { RemotionSiteBucket } from '../src/remotion-site-bucket';

describe('RemotionSiteBucket', () => {
  let app: cdk.App;
  let stack: cdk.Stack;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
  });

  describe('bucket naming', () => {
    it('uses provided bucketSuffix prefixed with remotionlambda-', () => {
      new RemotionSiteBucket(stack, 'SiteBucket', { bucketSuffix: 'mysite' });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'remotionlambda-mysite',
      });
    });

    it('generates a name starting with remotionlambda- when no suffix is given', () => {
      new RemotionSiteBucket(stack, 'SiteBucket');
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: Match.stringLikeRegexp('^remotionlambda-'),
      });
    });
  });

  describe('public access', () => {
    it('does not block public policy so site assets are publicly readable', () => {
      new RemotionSiteBucket(stack, 'SiteBucket', { bucketSuffix: 'test' });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: false,
          BlockPublicPolicy: false,
          IgnorePublicAcls: false,
          RestrictPublicBuckets: false,
        },
      });
    });
  });

  describe('CORS', () => {
    it('configures CORS to allow GET and HEAD from any origin', () => {
      new RemotionSiteBucket(stack, 'SiteBucket', { bucketSuffix: 'cors' });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        CorsConfiguration: {
          CorsRules: Match.arrayWith([
            Match.objectLike({
              AllowedMethods: Match.arrayWith(['GET', 'HEAD']),
              AllowedOrigins: ['*'],
            }),
          ]),
        },
      });
    });
  });

  describe('lifecycle rules', () => {
    it('adds a lifecycle rule when renderExpirationDays is set', () => {
      new RemotionSiteBucket(stack, 'SiteBucket', {
        bucketSuffix: 'expire',
        renderExpirationDays: 7,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        LifecycleConfiguration: {
          Rules: Match.arrayWith([
            Match.objectLike({
              Id: 'ExpireRenders',
              Status: 'Enabled',
              Prefix: 'renders/',
              ExpirationInDays: 7,
            }),
          ]),
        },
      });
    });

    it('omits lifecycle rules when renderExpirationDays is not set', () => {
      new RemotionSiteBucket(stack, 'SiteBucket', { bucketSuffix: 'noexpire' });
      const template = Template.fromStack(stack);

      const buckets = template.findResources('AWS::S3::Bucket');
      const bucketProps = Object.values(buckets)[0].Properties;
      expect(bucketProps.LifecycleConfiguration).toBeUndefined();
    });
  });

  describe('versioning', () => {
    it('disables versioning by default', () => {
      new RemotionSiteBucket(stack, 'SiteBucket', { bucketSuffix: 'noversion' });
      const template = Template.fromStack(stack);

      const buckets = template.findResources('AWS::S3::Bucket');
      const bucketProps = Object.values(buckets)[0].Properties;
      // VersioningConfiguration is absent or Suspended when versioned=false
      expect(bucketProps.VersioningConfiguration?.Status).not.toBe('Enabled');
    });

    it('enables versioning when versioned is true', () => {
      new RemotionSiteBucket(stack, 'SiteBucket', {
        bucketSuffix: 'versioned',
        versioned: true,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        VersioningConfiguration: { Status: 'Enabled' },
      });
    });
  });

  describe('removal policy', () => {
    it('retains the bucket on stack deletion', () => {
      new RemotionSiteBucket(stack, 'SiteBucket', { bucketSuffix: 'retain' });
      const template = Template.fromStack(stack);

      const buckets = template.findResources('AWS::S3::Bucket');
      const bucket = Object.values(buckets)[0];
      // CDK encodes RETAIN as DeletionPolicy: Retain
      expect(bucket.DeletionPolicy).toBe('Retain');
    });
  });

  describe('construct outputs', () => {
    it('exposes the bucket as a public property', () => {
      const construct = new RemotionSiteBucket(stack, 'SiteBucket');
      expect(construct.bucket).toBeDefined();
    });
  });
});
