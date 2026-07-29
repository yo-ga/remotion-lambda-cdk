import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Properties for RemotionStack.
 * To be implemented in issue #5.
 */
export interface RemotionStackProps extends StackProps {
  // placeholder
}

/**
 * High-level CDK Stack that composes all Remotion Lambda resources.
 */
export class RemotionStack extends Stack {
  constructor(scope: Construct, id: string, props?: RemotionStackProps) {
    super(scope, id, props);
    // implementation pending
  }
}
