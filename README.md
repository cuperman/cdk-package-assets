# CDK Package Assets

Manage lambda code and dependencies as npm packages for compatibility with CDK applications.

This allows code to be managed in a mono repo, where the infrastructure is an npm package (the CDK application) and lambda runtimes are separate npm packages.

## Example

Consider this mono repo layout. The infrastructure package is where the CDK stacks and app instances are defined, which may include some lambda functions. The lambda packages contain the code that runs in the lambda functions. `cdk-package-assets` allows these lambda runtimes to be resolved through npm dependency management, bundled during cdk synthesis, and uploaded to AWS during cdk deploy.

```console
.
└── packages
    ├── infrastructure
    │   ├── bin
    │   │   └── app.js
    │   ├── lib
    │   │   └── stack.js
    │   └── package.json
    ├── lambda-foo
    │   ├── index.js
    │   └── package.json
    └── lambda-bar
        ├── index.js
        └── package.json
```

This would produce 3 npm packages when published to a public or private NPM registry:

* infrastructure
* lambda-foo
* lambda-bar

In the infrastructure, add these packages as dependencies as well as `cdk-package-assets`:

```json
{
  "dependencies": {
    "aws-cdk-lib": "^2.0.0",
    "cdk-package-assets": "~0.2.0",
    "constructs": "^10.0.0",
    "lambda-foo": "1.0.0",
    "lambda-bar": "1.0.0"
  }
}
```

Now use the `Code` and `Dependencies` constructs to define your lambda functions:

```ts
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as assets from 'cdk-package-assets';

const lambdaFoo = new lamdba.Function(this, 'LambdaFoo', {
  runtime: lambda.Runtime.NODEJS_LATEST,
  layers: [
    assets.Dependencies.fromPackage(this, 'LambdaFooDependencies', 'lambda-foo')
  ],
  code: assets.Code.fromPackage('lambda-foo'),
  handler: 'index.handler'
});

const lambdaBar = new lambda.Function(this, 'LambdaBar', {
  runtime: lambda.Runtime.NODEJS_LATEST,
  layers: [
    assets.Dependencies.fromPackage(this, 'LambdaBarDependencies', 'lambda-bar')
  ],
  code: assets.Code.fromPackage('lambda-bar'),
  handler: 'index.handler'
});
```

This produces 2 assets per lambda function:

1. the dependencies are resolved and bundled from the package.json file in the NPM package
2. the code includes the contents of the NPM package

In combination with tools like [lerna](https://lerna.js.org) or [yarn workspaces](https://yarnpkg.com/features/workspaces), this is compatible with local development environments, resolving dependencies from local links:

```console
yarn workspace infrastructure cdk deploy
```

But applications can also be deployed without any source code because everything is resolved through NPM packages:

```console
npx aws-cdk@latest --app "npx infrastructure@latest" deploy
```

## Dependencies

`Dependencies.fromPackage` during CDK synthesis, resolves and bundles dependencies from the package's package.json into an asset

returns a `lambda.LayerVersion` for compatibility with lambda function layers

options:

- bundleMode - Configure how assets are bundled (default: `LOCAL_WITH_DOCKER_FALLBACK`)

  - `LOCAL_WITH_DOCKER_FALLBACK` - Try local bundling first, falling back to docker bundling on failure
  - `LOCAL_ONLY` - Only try local bundling (removes docker dependency, but may fail in some environments)
  - `DOCKER_ONLY` - Only bundles with docker, for consistency

## Code

`Code.fromPackage` during CDK synthesis, bundles contents of the package into an asset

returns a `lambda.AssetCode` for compatibility with lambda function code

optional arguments:

- subdirectory - allows the bundled code to be limited to a subdirectory within the NPM package, for example: `build` or `dist`.
