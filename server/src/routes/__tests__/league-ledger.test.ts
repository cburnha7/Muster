/* eslint-disable @typescript-eslint/no-explicit-any */
const mockLFU = jest.fn();
const mockSFF = jest.fn();
const mockTFM = jest.fn();
const mockPI = {
  league: { findUnique: mockLFU, findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  season: { findFirst: mockSFF },
  leagueTransaction: { findMany: mockTFM },
  leagueMembership: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn(),
    create: jest.fn(), createMany: jest.fn(), deleteMany: jest.fn(), updateMany: jest.fn() },
  match: { findMany: jest.fn().mockResolvedValue([]) },
  gameParticipation: { findMany: jest.fn().mockResolvedValue([]) },
  teamMember: { count: jest.fn().mockResolvedValue(0) },
  appLog: { create: jest.fn() },
};
jest.mock('@prisma/client', () => ({ PrismaClient: jest.fn(() => mockPI) }), { virtual: true });
jest.mock('../../services/NotificationService', () => ({ NotificationService: { notifyJoinRequest: jest.fn() } }));
jest.mock('../../services/ScheduleGeneratorService', () => ({ ScheduleGeneratorService: {} }));
jest.mock('../../middleware/auth', () => ({ optionalAuthMiddleware: (_r: any, _s: any, n: any) => n() }));
jest.mock('../../middleware/subscription', () => ({ requirePlan: () => (_r: any, _s: any, n: any) => n() }));
import router from '../leagues';


function bReq(o: any = {}) { return { params: {}, body: {}, query: {}, headers: {}, ...o }; }
function bRes() {
  const r: any = { _s: 200, _j: null };
  r.status = jest.fn((c: number) => { r._s = c; return r; });
  r.json = jest.fn((d: any) => { r._j = d; return r; });
  r.send = jest.fn(() => r);
  return r;
}
function fH(m: string, p: string) {
  for (const l of (router as any).stack || [])
    if (l.route?.methods[m] && l.route.path === p)
      return l.route.stack[l.route.stack.length - 1].handle;
  return null;
}
describe('GET /api/leagues/:id/ledger', () => {
  const h = fH('get', '/:id/ledger');
  beforeEach(() => jest.clearAllMocks());
  it('exists', () => { expect(h).not.toBeNull(); });
  it('400 without seasonId', async () => {
    const res = bRes(); await h(bReq({ params: { id: 'l1' }, query: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('404 if league missing', async () => {
    mockLFU.mockResolvedValue(null);
    const res = bRes(); await h(bReq({ params: { id: 'x' }, query: { seasonId: 's' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res._j).toEqual({ error: 'League not found' });
  });
  it('404 if season missing', async () => {
    mockLFU.mockResolvedValue({ id: 'l1' }); mockSFF.mockResolvedValue(null);
    const res = bRes(); await h(bReq({ params: { id: 'l1' }, query: { seasonId: 'bad' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res._j).toEqual({ error: 'Season not found for this league' });
  });
  it('returns transactions asc', async () => {
    mockLFU.mockResolvedValue({ id: 'l1' }); mockSFF.mockResolvedValue({ id: 's1' });
    const txns = [{ id: 't1', amount: 5000, balanceAfter: 5000 }, { id: 't2', amount: -3000, balanceAfter: 2000 }];
    mockTFM.mockResolvedValue(txns);
    const res = bRes(); await h(bReq({ params: { id: 'l1' }, query: { seasonId: 's1' } }), res);
    expect(res._j).toEqual({ transactions: txns });
    expect(mockTFM).toHaveBeenCalledWith({ where: { leagueId: 'l1', seasonId: 's1' }, orderBy: { createdAt: 'asc' } });
  });
  it('empty when no txns', async () => {
    mockLFU.mockResolvedValue({ id: 'l1' }); mockSFF.mockResolvedValue({ id: 's1' });
    mockTFM.mockResolvedValue([]);
    const res = bRes(); await h(bReq({ params: { id: 'l1' }, query: { seasonId: 's1' } }), res);
    expect(res._j).toEqual({ transactions: [] });
  });
  it('500 on error', async () => {
    mockLFU.mockRejectedValue(new Error('boom'));
    const res = bRes(); await h(bReq({ params: { id: 'l1' }, query: { seasonId: 's1' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
