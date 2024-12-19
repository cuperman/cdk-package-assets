import * as path from 'path';
import * as fs from 'fs';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as assets from 'aws-cdk-lib/aws-s3-assets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as childProcess from 'child_process';
import { MockerImage } from './mocker-image';

export enum BundleMode {
  /**
   * Try local bundling first, falling back to docker bundling on failure
   */
  LOCAL_WITH_DOCKER_FALLBACK = 'LOCAL_WITH_DOCKER_FALLBACK',

  /**
   * Only try local bundling (removes docker dependency, but may fail in some environments)
   */
  LOCAL_ONLY = 'LOCAL_ONLY',

  /**
   * Only bundles with docker, for consistency
   */
  DOCKER_ONLY = 'DOCKER_ONLY',
}

export interface PackageOptions {
  /**
   * Configure how assets are bundled (default: LOCAL_WITH_DOCKER_FALLBACK)
   */
  readonly bundleMode?: BundleMode;
}

export abstract class Dependencies {
  private static DEFAULT_BUNDLE_MODE = BundleMode.LOCAL_WITH_DOCKER_FALLBACK;
  private static INSTALLER_ROOT = path.join(__dirname, '../installer');

  static fromPackage(scope: Construct, id: string, packageName: string, options?: PackageOptions): lambda.LayerVersion {
    const bundleMode = options?.bundleMode ? options.bundleMode : Dependencies.DEFAULT_BUNDLE_MODE;
    const packageRoot = path.dirname(require.resolve(`${packageName}/package.json`));

    const dependencies = new Construct(scope, id);

    const localBundling: cdk.ILocalBundling = {
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
    };

    const asset = new assets.Asset(dependencies, 'Asset', {
      path: packageRoot,
      bundling: {
        local: bundleMode === BundleMode.DOCKER_ONLY ? undefined : localBundling,
        image: bundleMode === BundleMode.LOCAL_ONLY ? Dependencies.mockBundling : Dependencies.imageBundling,
        command: ['/usr/bin/install.sh'],
      },
    });

    const assetOutdir = cdk.Stage.of(scope)?.assetOutdir ?? '';
    const assetPath = asset.assetPath.startsWith('/') ? asset.assetPath : path.join(assetOutdir, asset.assetPath);

    return new lambda.LayerVersion(dependencies, 'Layer', {
      code: lambda.Code.fromAsset(assetPath),
    });
  }

  private static get imageBundling(): cdk.DockerImage {
    return cdk.DockerImage.fromBuild(Dependencies.INSTALLER_ROOT);
  }

  private static get mockBundling(): cdk.DockerImage {
    return new MockerImage({
      errorMessage: 'docker bundling disabled; local bundling must have failed',
    });
  }
}
