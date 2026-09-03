import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { bootstrap } from './main';

jest.mock('@nestjs/core', () => ({
  NestFactory: { create: jest.fn() },
}));

describe('bootstrap', () => {
  const originalPort = process.env.PORT;
  const originalApiPort = process.env.API_PORT;

  afterEach(() => {
    if (originalPort === undefined) delete process.env.PORT;
    else process.env.PORT = originalPort;
    if (originalApiPort === undefined) delete process.env.API_PORT;
    else process.env.API_PORT = originalApiPort;
    jest.restoreAllMocks();
  });

  it('binds the platform port on every network interface', async () => {
    process.env.PORT = '4321';
    process.env.API_PORT = '9876';
    const app = {
      useBodyParser: jest.fn(),
      enableCors: jest.fn(),
      setGlobalPrefix: jest.fn(),
      useGlobalPipes: jest.fn(),
      enableShutdownHooks: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    jest.mocked(NestFactory.create).mockResolvedValue(app as never);
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);

    await bootstrap();

    expect(app.listen).toHaveBeenCalledWith(4321, '0.0.0.0');
  });
});
