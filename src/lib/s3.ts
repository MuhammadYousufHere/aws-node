import {S3, type StorageClass, NoSuchKey} from '@aws-sdk/client-s3';
import {GetResult} from './types/cache';

type S3HandlerOptions = {
    redundancy?: StorageClass;
    metadata?: Record<string, string>;
};

const clientByRegion: Map<string, S3> = new Map();

export class S3Bucket {
    private readonly instance: S3;
    readonly bucket: string;
    readonly region: string;

    constructor(bucket: string, region: string) {
        const maybeInstance = clientByRegion.get(region);
        if (maybeInstance) {
            this.instance = maybeInstance;
        } else {
            this.instance = new S3({region});
            clientByRegion.set(region, this.instance);
        }
        this.bucket = bucket;
        this.region = region;
    }
    async get(key: string, path: string): Promise<GetResult> {
        try {
            const res = await this.instance.getObject({Bucket: this.bucket, Key: `${path}/${key}`});
            if (!res.Body) return {hit: false};
            return {
                hit: true,
                data: Buffer.from(await res.Body.transformToByteArray()),
            };
        } catch (err) {
            if (err instanceof NoSuchKey) return {hit: false};
            throw err;
        }
    }
    async put(key: string, file: Buffer, path: string, options?: S3HandlerOptions): Promise<void> {
        try {
            this.instance.putObject({
                Bucket: this.bucket,
                Key: `${path}/${key}`,
                Body: file,
                Metadata: options?.metadata || {},
                StorageClass: options?.redundancy || 'STANDARD',
            });
        } catch (error) {}
    }
    async delete(key: string, path: string): Promise<boolean> {
        try {
            await this.instance.deleteObject({Bucket: this.bucket, Key: `${path}/${key}`});
        } catch (err) {
            if (err instanceof NoSuchKey) {
                return false;
            }
            throw err;
        }
        return true;
    }
}
