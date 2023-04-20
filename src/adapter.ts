import {Redis} from 'ioredis';
import isEmpty from 'lodash/isEmpty.js';

const grantable = new Set([
  'AccessToken',
  'AuthorizationCode',
  'RefreshToken',
  'DeviceCode',
  'BackchannelAuthenticationRequest',
]);

const consumable = new Set([
  'AuthorizationCode',
  'RefreshToken',
  'DeviceCode',
  'BackchannelAuthenticationRequest',
]);

function grantKeyFor(id: string) {
  return `grant:${id}`;
}

function userCodeKeyFor(userCode: string) {
  return `userCode:${userCode}`;
}

function uidKeyFor(uid: string) {
  return `uid:${uid}`;
}
class RedisAdapter {
  name: string;
  client: Redis | undefined;

  constructor(name: string) {
    this.name = name;
    this.client = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL, { keyPrefix: 'oidc:' }) : undefined;
  }

  async upsert(id: string, payload: any, expiresIn: number) {
    if (!this.client) {
      throw new Error("Can't use adapter, Missing env REDIS_URL");
    }
    const key = this.key(id);
    const store = consumable.has(this.name)
      ? { payload: JSON.stringify(payload) } : JSON.stringify(payload);

    const multi = this.client.multi();
    // @ts-expect-error method "has" has multiple signatures
    multi[consumable.has(this.name) ? 'hmset' : 'set'](key, store);

    if (expiresIn) {
      multi.expire(key, expiresIn);
    }

    if (grantable.has(this.name) && payload.grantId) {
      const grantKey = grantKeyFor(payload.grantId);
      multi.rpush(grantKey, key);
      // if you're seeing grant key lists growing out of acceptable proportions consider using LTRIM
      // here to trim the list to an appropriate length
      const ttl = await this.client.ttl(grantKey);
      if (expiresIn > ttl) {
        multi.expire(grantKey, expiresIn);
      }
    }

    if (payload.userCode) {
      const userCodeKey = userCodeKeyFor(payload.userCode);
      multi.set(userCodeKey, id);
      multi.expire(userCodeKey, expiresIn);
    }

    if (payload.uid) {
      const uidKey = uidKeyFor(payload.uid);
      multi.set(uidKey, id);
      multi.expire(uidKey, expiresIn);
    }

    await multi.exec();
  }

  async find(id: string) {
    if (!this.client) {
      throw new Error("Can't use adapter, Missing env REDIS_URL");
    }
    const data = consumable.has(this.name)
      ? await this.client.hgetall(this.key(id))
      : await this.client.get(this.key(id));

    if (!data || isEmpty(data)) {
      return undefined;
    }
    
    if (typeof data === 'string') {
      return JSON.parse(data);
    }
    const { payload, ...rest } = data;
    return {
      ...rest,
      ...JSON.parse(payload),
    };
  }

  async findByUid(uid: string) {
    if (!this.client) {
      throw new Error("Can't use adapter, Missing env REDIS_URL");
    }
    const id = await this.client.get(uidKeyFor(uid));
    return id ? this.find(id) : null;
  }

  async findByUserCode(userCode: string) {
    if (!this.client) {
      throw new Error("Can't use adapter, Missing env REDIS_URL");
    }
    const id = await this.client.get(userCodeKeyFor(userCode));
    return id ? this.find(id) : null;
  }

  async destroy(id: string) {
    if (!this.client) {
      throw new Error("Can't use adapter, Missing env REDIS_URL");
    }
    const key = this.key(id);
    await this.client.del(key);
  }

  async revokeByGrantId(grantId: string) { // eslint-disable-line class-methods-use-this
    if (!this.client) {
      throw new Error("Can't use adapter, Missing env REDIS_URL");
    }
    const multi = this.client.multi();
    const tokens = await this.client.lrange(grantKeyFor(grantId), 0, -1);
    tokens.forEach((token) => multi.del(token));
    multi.del(grantKeyFor(grantId));
    await multi.exec();
  }

  async consume(id: string) {
    if (!this.client) {
      throw new Error("Can't use adapter, Missing env REDIS_URL");
    }
    await this.client.hset(this.key(id), 'consumed', Math.floor(Date.now() / 1000));
  }

  key(id: string) {
    return `${this.name}:${id}`;
  }
}

export default RedisAdapter;