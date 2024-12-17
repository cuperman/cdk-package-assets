import * as path from 'path';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export abstract class Code extends lambda.Code {
  static fromPackage(packageName: string, subdirectory?: string): lambda.AssetCode {
    const packageRoot = path.dirname(require.resolve(`${packageName}/package.json`));
    const assetPath = subdirectory ? path.join(packageRoot, subdirectory) : packageRoot;
    return lambda.Code.fromAsset(assetPath);
  }
}
