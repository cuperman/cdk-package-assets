import * as path from 'path';
import * as fs from 'fs';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as assets from 'aws-cdk-lib/aws-s3-assets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as childProcess from 'child_process';

export abstract class Dependencies {
  private static INSTALLER_ROOT = path.join(__dirname, '../installer');

  static fromPackage(scope: Construct, id: string, packageName: string): lambda.LayerVersion {
    const packageRoot = path.dirname(require.resolve(`${packageName}/package.json`));

    const dependencies = new Construct(scope, id);

    const asset = new assets.Asset(dependencies, 'Asset', {
      path: packageRoot,
      bundling: {
        local: {
          tryBundle(outputDir: string): boolean {
            try {
              fs.copyFileSync(path.join(packageRoot, 'package.json'), path.join(outputDir, 'package.json'));
              childProcess.execSync('yarn install --modules-folder nodejs/node_modules --production', {
                cwd: outputDir,
                stdio: 'inherit',
              });
            } catch (e) {
              console.error(e);
              return false;
            }

            return true;
          },
        },
        image: cdk.DockerImage.fromBuild(Dependencies.INSTALLER_ROOT),
        command: ['/usr/bin/install.sh'],
      },
    });

    const assetOutdir = cdk.Stage.of(scope)?.assetOutdir ?? '';
    const assetPath = asset.assetPath.startsWith('/') ? asset.assetPath : path.join(assetOutdir, asset.assetPath);

    return new lambda.LayerVersion(dependencies, 'Layer', {
      code: lambda.Code.fromAsset(assetPath),
    });
  }
}
