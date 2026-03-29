import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly keyPrefix: string;
  private readonly defaultTtlSeconds: number;
  private readonly client: RedisClientType | null;
  private connectPromise: Promise<void> | null = null;
  private hasLoggedUnavailable = false;

  constructor(private readonly configService: ConfigService) {
    this.keyPrefix =
      this.configService.get<string>('REDIS_CACHE_PREFIX')?.trim() ||
      'unicorns-edu:api';
    this.defaultTtlSeconds = this.parsePositiveInteger(
      this.configService.get<string>('REDIS_CACHE_DEFAULT_TTL_SECONDS'),
      60,
    );

    const redisUrl = this.configService.get<string>('REDIS_URL')?.trim();
    if (!redisUrl) {
      this.client = null;
      return;
    }

    this.client = createClient({
      url: redisUrl,
    });

    this.client.on('error', (error) => {
      this.logUnavailable(
        'Redis cache is temporarily unavailable. Falling back to database responses.',
        error,
      );
    });
  }

  async onModuleInit() {
    if (!this.client) {
      this.logger.log(
        'REDIS_URL is not configured. Redis caching is disabled for this API instance.',
      );
      return;
    }

    await this.ensureConnected();
  }

  async onModuleDestroy() {
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (!(await this.ensureConnected()) || !this.client) {
      return null;
    }

    try {
      const rawValue = await this.client.get(this.prefixKey(key));
      if (rawValue == null) {
        return null;
      }

      return JSON.parse(rawValue) as T;
    } catch (error) {
      this.logUnavailable(
        'Redis cache read failed. Falling back to database responses.',
        error,
      );
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number) {
    if (!(await this.ensureConnected()) || !this.client) {
      return;
    }

    try {
      await this.client.set(this.prefixKey(key), JSON.stringify(value), {
        EX: this.normalizeTtlSeconds(ttlSeconds),
      });
    } catch (error) {
      this.logUnavailable(
        'Redis cache write failed. Continuing without cached storage.',
        error,
      );
    }
  }

  async del(key: string) {
    if (!(await this.ensureConnected()) || !this.client) {
      return;
    }

    try {
      await this.client.del(this.prefixKey(key));
    } catch (error) {
      this.logUnavailable(
        'Redis cache delete failed. Continuing without invalidation.',
        error,
      );
    }
  }

  async wrapJson<T>(options: {
    key: string;
    loader: () => Promise<T>;
    ttlSeconds?: number;
  }): Promise<T> {
    const cachedValue = await this.getJson<T>(options.key);
    if (cachedValue != null) {
      return cachedValue;
    }

    const freshValue = await options.loader();
    await this.setJson(options.key, freshValue, options.ttlSeconds);
    return freshValue;
  }

  private async ensureConnected() {
    if (!this.client) {
      return false;
    }

    if (this.client.isOpen) {
      return true;
    }

    if (!this.connectPromise) {
      this.connectPromise = this.client
        .connect()
        .then(() => {
          this.hasLoggedUnavailable = false;
          this.logger.log('Redis cache connection established.');
        })
        .catch((error: unknown) => {
          this.logUnavailable(
            'Unable to connect to Redis. Falling back to database responses.',
            error,
          );
        })
        .finally(() => {
          this.connectPromise = null;
        });
    }

    await this.connectPromise;
    return this.client.isOpen;
  }

  private prefixKey(key: string) {
    return `${this.keyPrefix}:${key}`;
  }

  private normalizeTtlSeconds(ttlSeconds?: number) {
    if (typeof ttlSeconds === 'number' && Number.isFinite(ttlSeconds)) {
      return Math.max(1, Math.floor(ttlSeconds));
    }

    return this.defaultTtlSeconds;
  }

  private parsePositiveInteger(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }

    return Math.floor(parsed);
  }

  private logUnavailable(message: string, error: unknown) {
    if (this.hasLoggedUnavailable) {
      return;
    }

    this.hasLoggedUnavailable = true;
    const details =
      error instanceof Error ? error.message : 'Unknown Redis error';
    this.logger.warn(`${message} (${details})`);
  }
}
