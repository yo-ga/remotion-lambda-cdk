import { Construct } from 'constructs';

/**
 * Properties for RemotionIam construct.
 * To be implemented in issue #4.
 */
export interface RemotionIamProps {
  // placeholder
}

/**
 * CDK Construct that provisions IAM role and policies for Remotion Lambda.
 */
export class RemotionIam extends Construct {
  constructor(scope: Construct, id: string, _props?: RemotionIamProps) {
    super(scope, id);
    // implementation pending
  }
}
