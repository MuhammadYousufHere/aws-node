import {DynamoDBClient, type DynamoDBClientConfig} from '@aws-sdk/client-dynamodb';
import {AWSConfig} from './aws-config';

const dynamoDb: DynamoDBClientConfig = new DynamoDBClient(AWSConfig);

export default dynamoDb;
