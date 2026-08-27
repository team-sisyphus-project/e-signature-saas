import { ConfigService } from '@nestjs/config';
import { EmailService, type EmailMessage } from './email.service';

/* SES SDK mock — the service dynamically imports it, so jest.mock intercepts. */
const sendMock = jest.fn();
const commandCtor = jest.fn((input: unknown) => ({ input }));

jest.mock('@aws-sdk/client-sesv2', () => ({
  SESv2Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
  SendEmailCommand: jest.fn((input: unknown) => commandCtor(input)),
}));

function makeService(env: Record<string, string | undefined>): EmailService {
  const config = {
    get: (key: string) => env[key],
  } as unknown as ConfigService;
  return new EmailService(config);
}

const message: EmailMessage = {
  to: [
    { email: 'sender@example.com', name: 'Sender' },
    { email: 'signer@example.com', name: 'Signer' },
  ],
  subject: '[Employment Agreement] Contract completed',
  html: '<p>Done</p>',
  text: 'Done',
  attachments: [
    { filename: 'Final contract.pdf', content: Buffer.from('A') },
    { filename: 'Audit trail certificate.pdf', content: Buffer.from('B') },
  ],
};

beforeEach(() => {
  sendMock.mockReset();
  commandCtor.mockClear();
});

describe('EmailService (console fallback)', () => {
  it('falls back to console and never throws when SES_FROM_EMAIL is unset', async () => {
    const svc = makeService({});
    const logSpy = jest.spyOn((svc as unknown as { logger: { log: () => void } }).logger, 'log').mockImplementation();

    const result = await svc.send(message);

    expect(result).toMatchObject({ delivered: false, channel: 'console' });
    expect(result.recipients).toEqual(['sender@example.com', 'signer@example.com']);
    expect(sendMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
    expect(svc.isConfigured).toBe(false);
  });

  it('reports a console fallback when there are no recipients', async () => {
    const svc = makeService({ SES_FROM_EMAIL: 'noreply@esign.kr' });
    jest.spyOn((svc as unknown as { logger: { log: () => void } }).logger, 'log').mockImplementation();

    const result = await svc.send({ ...message, to: [] });
    expect(result).toMatchObject({ delivered: false, channel: 'console' });
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe('EmailService (SES path)', () => {
  it('sends raw MIME with both attachments and returns the message id', async () => {
    sendMock.mockResolvedValue({ MessageId: 'mid-123' });
    const svc = makeService({ SES_FROM_EMAIL: 'noreply@esign.kr', SES_FROM_NAME: 'eContract', AWS_REGION: 'ap-northeast-2' });
    jest.spyOn((svc as unknown as { logger: { log: () => void } }).logger, 'log').mockImplementation();

    const result = await svc.send(message);

    expect(result).toMatchObject({ delivered: true, channel: 'ses', messageId: 'mid-123' });
    expect(sendMock).toHaveBeenCalledTimes(1);

    const cmdInput = commandCtor.mock.calls[0][0] as {
      FromEmailAddress: string;
      Destination: { ToAddresses: string[] };
      Content: { Raw: { Data: Uint8Array } };
    };
    expect(cmdInput.Destination.ToAddresses).toEqual(['sender@example.com', 'signer@example.com']);
    expect(cmdInput.FromEmailAddress).toContain('noreply@esign.kr');

    const raw = Buffer.from(cmdInput.Content.Raw.Data).toString('utf8');
    expect(raw).toContain('multipart/mixed');
    expect(raw.match(/Content-Disposition: attachment/g)).toHaveLength(2);
  });

  it('degrades to console (never throws) when SES send fails', async () => {
    sendMock.mockRejectedValue(new Error('SES down'));
    const svc = makeService({ SES_FROM_EMAIL: 'noreply@esign.kr' });
    const logSpy = jest.spyOn((svc as unknown as { logger: { log: () => void } }).logger, 'log').mockImplementation();

    const result = await svc.send(message);

    expect(result).toMatchObject({ delivered: false, channel: 'console' });
    expect(result.reason).toContain('SES send failed');
    expect(logSpy).toHaveBeenCalled();
  });

  it('sendEach dispatches one message per entry', async () => {
    sendMock.mockResolvedValue({ MessageId: 'mid' });
    const svc = makeService({ SES_FROM_EMAIL: 'noreply@esign.kr' });
    jest.spyOn((svc as unknown as { logger: { log: () => void } }).logger, 'log').mockImplementation();

    const results = await svc.sendEach([message, { ...message, to: [{ email: 'x@y.com' }] }]);
    expect(results).toHaveLength(2);
    expect(sendMock).toHaveBeenCalledTimes(2);
  });
});
