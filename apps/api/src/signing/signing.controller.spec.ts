import { SigningController } from './signing.controller';

describe('SigningController public metadata locale boundary', () => {
  function controllerFor() {
    const signing = { meta: jest.fn().mockResolvedValue({ locale: 'en' }) };
    return { signing, controller: new SigningController(signing as never) };
  }

  it('passes the unauthenticated browser Accept-Language value to signing metadata', async () => {
    const { signing, controller } = controllerFor();

    const result = controller.meta('public-sign-token', 'en-US,en;q=0.9');

    expect(signing.meta).toHaveBeenCalledWith('public-sign-token', 'en-US,en;q=0.9', undefined);
    await expect(result).resolves.toEqual({ locale: 'en' });
  });

  it('forwards the link\u2019s ?lang= parameter alongside Accept-Language', async () => {
    const { signing, controller } = controllerFor();

    await controller.meta('public-sign-token', 'ko-KR,ko;q=0.9', 'en');

    expect(signing.meta).toHaveBeenCalledWith('public-sign-token', 'ko-KR,ko;q=0.9', 'en');
  });

  it('forwards an unsupported ?lang= value untouched, leaving precedence to the resolver', async () => {
    const { signing, controller } = controllerFor();

    await controller.meta('public-sign-token', 'ko-KR', 'fr');

    expect(signing.meta).toHaveBeenCalledWith('public-sign-token', 'ko-KR', 'fr');
  });
});
