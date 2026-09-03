import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { StorageService } from './storage.service';

describe('StorageService local fallback', () => {
  it('stores local files under /tmp by default', async () => {
    const config = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;
    const service = new StorageService(config);
    const key = `storage-test-${process.pid}/document.txt`;

    await service.save(key, Buffer.from('hello'), 'text/plain');

    await expect(fs.readFile(`/tmp/esign-storage/${key}`, 'utf8')).resolves.toBe('hello');
    await fs.rm(`/tmp/esign-storage/storage-test-${process.pid}`, { recursive: true });
  });
});
