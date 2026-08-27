import { SharePublicController } from './share-public.controller';

/**
 * The share landing screen is rendered before any session exists, so the
 * controller is the only place where the link's own locale hints reach the
 * resolver. It must forward them and interpret none of them.
 */
describe('SharePublicController public metadata locale boundary', () => {
  function controllerFor() {
    const sharing = { meta: jest.fn().mockResolvedValue({ locale: 'en' }) };
    return { sharing, controller: new SharePublicController(sharing as never) };
  }

  it('passes the unauthenticated browser Accept-Language value to share metadata', async () => {
    const { sharing, controller } = controllerFor();

    const result = controller.meta('public-share-token', 'en-US,en;q=0.9');

    expect(sharing.meta).toHaveBeenCalledWith('public-share-token', 'en-US,en;q=0.9', undefined);
    await expect(result).resolves.toEqual({ locale: 'en' });
  });

  it('forwards the link’s ?lang= parameter alongside Accept-Language', async () => {
    const { sharing, controller } = controllerFor();

    await controller.meta('public-share-token', 'ko-KR,ko;q=0.9', 'en');

    expect(sharing.meta).toHaveBeenCalledWith('public-share-token', 'ko-KR,ko;q=0.9', 'en');
  });

  it('forwards an unsupported ?lang= value untouched, leaving precedence to the resolver', async () => {
    const { sharing, controller } = controllerFor();

    await controller.meta('public-share-token', 'ko-KR', 'fr');

    expect(sharing.meta).toHaveBeenCalledWith('public-share-token', 'ko-KR', 'fr');
  });
});
