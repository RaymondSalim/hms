import prisma from '@/app/_lib/primsa';

jest.setTimeout(30000);

jest.mock('next/server', () => {
  const original = jest.requireActual('next/server');
  return {
    ...original,
    after: (cb?: () => void) => {
      return undefined as unknown as void;
    },
  };
});

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
  revalidatePath: jest.fn(),
}));

try {
  const serverLib = require('@/app/_lib/axiom/server');
  if (serverLib && serverLib.serverLogger && typeof serverLib.serverLogger.flush === 'function') {
    jest.spyOn(serverLib.serverLogger, 'flush').mockImplementation(() => undefined as unknown as any);
  }
  // eslint-disable-next-line no-empty
} catch {}

afterAll(async () => {
  await prisma.$disconnect();
});
