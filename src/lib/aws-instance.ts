import { EC2, Instance } from '@aws-sdk/client-ec2'
import { SSM } from '@aws-sdk/client-ssm'
import { PropertyGetter } from './types/property-getter'
import { unwrap } from './assert'

export class InstanceFetcher {
    readonly ec2: EC2
    readonly tagKey: string
    readonly tagValue: string
    constructor(properties: PropertyGetter) {
        const region = properties<string>('region')
        console.log(`New Instance fetcher fo region ${region}`)
        this.ec2 = new EC2({ region })
        this.tagKey = properties<string>('tagKey')
        this.tagValue = properties<string>('tagValue')
    }
    async getInstances() {
        const result = await this.ec2.describeInstances({})
        return unwrap(result.Reservations)
            .flatMap(r => r.Instances)
            .filter(reservation => {
                if (unwrap(unwrap(reservation).State).Name !== 'running') return false
                return unwrap(unwrap(reservation).Tags).some(t => t.Key === this.tagKey && t.Value === this.tagValue)
            }) as Instance[]
    }
}

let awsConfigInit = false
let awsConfig: Record<string, string | undefined> = {}
let awsProps: PropertyGetter | null = null
async function loadAwsConfig(properties: PropertyGetter) {
    const region = properties<string>('region')
    if (!region) return {}
    const ssm = new SSM({ region: region })
    const path = '/node-aws/'
    try {
        const response = await ssm.getParameters({ Names: [path + 'sentryDsn'] })
        const map: Record<string, string | undefined> = {}
        for (const param of unwrap(response.Parameters)) {
            map[unwrap(param.Name).substring(path.length)] = param.Value
        }
        console.log('AWS info:', map)
        return map
    } catch (err) {
        console.error(`Failed to get AWS info: ${err}`)
        return {}
    }
}

export async function initConfig(properties: PropertyGetter) {
    awsConfigInit = true
    awsProps = properties
    awsConfig = await loadAwsConfig(properties)
}

export function getConfig(name: string): string {
    if (!awsConfigInit) throw new Error("Reading AWS config before it's loaded")
    return awsConfig[name] || unwrap(awsProps)<string>(name)
}
