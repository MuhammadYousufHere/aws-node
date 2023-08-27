import 'dotenv/config';

const endpoint = process.env['AWS_ENDPOINT']
    ? `http://${process.env['AWS_ENDPOINT']}`
    : process.env['AWS_ENDPOINT_URL'];
const targetRegion = process.env['AWS_TARGET_REGION'];

export const AWSConfig = {
    region: targetRegion,
    s3ForcePathStyle: true,
    signatureVersion: 'v4',
    ...(endpoint
        ? {
              accessKeyId: 'test',
              secretAccessKey: 'test',
              skipMetadataApiCheck: true,
              endpoint,
          }
        : {}),
};
