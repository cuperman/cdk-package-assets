import * as cdk from 'aws-cdk-lib';

export interface MockerImageProps {
  /**
   * The error message to use when unimplemented functions are called to avoid cryptic errors when using mock images
   */
  readonly errorMessage?: string;
}

export class MockerImage implements cdk.DockerImage {
  readonly image: string;

  private readonly errorMessage: string;

  constructor(props?: MockerImageProps) {
    this.errorMessage = props?.errorMessage ?? 'Not implemented';
  }

  toJSON(): string {
    return JSON.stringify({});
  }

  run(_options?: cdk.DockerRunOptions): void {
    throw Error(this.errorMessage);
  }

  cp(_imagePath: string, _outputPath?: string): string {
    throw Error(this.errorMessage);
  }
}
