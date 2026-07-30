# remotion-lambda-cdk

AWS CDK construct library for deploying [Remotion Lambda](https://www.remotion.dev/docs/lambda) rendering infrastructure.

## Overview

This library provides CDK constructs to provision all AWS resources required by Remotion Lambda:

- **Lambda function** — the Remotion render function with Chromium layer
- **S3 bucket** — stores Remotion sites, renders, and metadata
- **IAM role & policies** — least-privilege permissions for the Lambda function and deploying user

## Architecture

```
RemotionStack
├── RemotionIam          # IAM role (remotion-lambda-role) + user policy
├── RemotionSiteBucket   # S3 bucket (remotionlambda-*)
└── RemotionLambdaFunction  # Lambda function (remotion-render-*)
```

## Installation

```bash
npm install remotion-lambda-cdk
```

## Usage

```typescript
import { RemotionStack } from 'remotion-lambda-cdk';

const app = new cdk.App();
new RemotionStack(app, 'RemotionStack', {
  remotionVersion: '4-0-272',
  env: { region: 'us-east-1', account: '123456789012' },
});
```

To deploy a real renderer, provide a Lambda deployment package that contains
Remotion's handler instead of the default placeholder:

```typescript
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { RemotionStack } from 'remotion-lambda-cdk';

new RemotionStack(app, 'RemotionStack', {
  remotionVersion: '4-0-272',
  lambdaCode: lambda.Code.fromAsset('dist/remotion-lambda.zip'),
  lambdaHandler: 'index.handler',
  env: { region: 'us-east-1', account: '123456789012' },
});
```

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT
