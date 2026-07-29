import { Construct } from 'constructs';

/**
 * Properties for RemotionSiteBucket construct.
 * To be implemented in issue #3.
 */
export interface RemotionSiteBucketProps {
  // placeholder
}

/**
 * CDK Construct that provisions the S3 bucket for Remotion site and render storage.
 */
export class RemotionSiteBucket extends Construct {
  constructor(scope: Construct, id: string, _props?: RemotionSiteBucketProps) {
    super(scope, id);
    // implementation pending
  }
}
