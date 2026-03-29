import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { RedisCacheService } from './redis-cache.service';

jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

type MockRedisClient = {
  connect: jest.Mock<Promise<void>, []>;
  get: jest.Mock<Promise<string | null>, [string]>;
  set: jest.Mock<Promise<string>, [string, string, { EX: number }]>;
  del: jest.Mock<Promise<number>, [string]>;
  quit: jest.Mock<Promise<string>, []>;
  on: jest.Mock<void, [string, (error: unknown) => void]>;
  isOpen: boolean;
};

function createConfigService(values: Record<string, string | undefined>) {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

function createMockClient(): MockRedisClient {
  return {
    connect: jest.fn(() => {
      mockClient.isOpen = true;
      return Promise.resolve();
    }),
    get: jest.fn<Promise<string | null>, [string]>(),
    set: jest.fn<Promise<string>, [string, string, { EX: number }]>(() =>
      Promise.resolve('OK'),
    ),
    del: jest.fn<Promise<number>, [string]>(() => Promise.resolve(1)),
    quit: jest.fn(() => Promise.resolve('OK')),
    on: jest.fn<void, [string, (error: unknown) => void]>(),
    isOpen: false,
  };
}

let mockClient: MockRedisClient;

describe('RedisCacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createMockClient();
    (createClient as jest.Mock).mockReturnValue(mockClient);
  });

  it('skips Redis setup when REDIS_URL is missing', async () => {
    const service = new RedisCacheService(createConfigService({}));

    await service.onModuleInit();

    expect(createClient).not.toHaveBeenCalled();
    expect(
      await service.wrapJson({
        key: 'dashboard:test',
        loader: () => Promise.resolve({ ok: true }),
      }),
    ).toEqual({
      ok: true,
    });
  });

  it('returns cached JSON when a key exists', async () => {
    mockClient.get.mockResolvedValueOnce(JSON.stringify({ total: 42 }));
    const service = new RedisCacheService(
      createConfigService({
        REDIS_URL: 'redis://localhost:6379',
        REDIS_CACHE_PREFIX: 'test-prefix',
      }),
    );

    const result = await service.wrapJson({
      key: 'dashboard:summary',
      loader: () => Promise.resolve({ total: 0 }),
    });

    expect(result).toEqual({ total: 42 });
    expect(mockClient.get).toHaveBeenCalledWith(
      'test-prefix:dashboard:summary',
    );
    expect(mockClient.set).not.toHaveBeenCalled();
  });

  it('writes fresh values to Redis using the configured ttl', async () => {
    mockClient.get.mockResolvedValueOnce(null);
    const service = new RedisCacheService(
      createConfigService({
        REDIS_URL: 'redis://localhost:6379',
        REDIS_CACHE_DEFAULT_TTL_SECONDS: '90',
      }),
    );

    const result = await service.wrapJson({
      key: 'dashboard:summary',
      loader: () => Promise.resolve({ total: 7 }),
    });

    expect(result).toEqual({ total: 7 });
    expect(mockClient.set).toHaveBeenCalledWith(
      'unicorns-edu:api:dashboard:summary',
      JSON.stringify({ total: 7 }),
      { EX: 90 },
    );
  });
});
