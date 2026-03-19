/**
 * Unit tests for InsuranceDocumentService
 *
 * Mocks Prisma and filesystem to verify document creation, validation,
 * listing, deletion, attachment validation, and expiry processing.
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports
// ---------------------------------------------------------------------------

jest.mock('../../index', () => ({
  prisma: {
    insuranceDocument: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../NotificationService', () => ({
  NotificationService: {
    notifyInsuranceDocumentExpiring: jest.fn(),
  },
}));

jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  copyFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { prisma } from '../../index';
import { NotificationService } from '../NotificationService';
import {
  InsuranceDocumentService,
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from '../InsuranceDocumentService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_ID = 'user-001';
const DOC_ID = 'doc-001';

function makeValidFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'insurance.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024 * 1024, // 1 MB
    buffer: Buffer.from('fake-pdf-content'),
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
    ...overrides,
  };
}

function futureDate(daysFromNow = 90): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d;
}

function pastDate(daysAgo = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

describe('InsuranceDocumentService.create', () => {
  it('creates a document with valid inputs', async () => {
    const file = makeValidFile();
    const expiry = futureDate();
    const mockDoc = {
      id: DOC_ID,
      userId: USER_ID,
      policyName: 'My Policy',
      expiryDate: expiry,
      status: 'active',
      documentUrl: '/uploads/insurance-documents/user-001/test.pdf',
    };

    (prisma.insuranceDocument.create as jest.Mock).mockResolvedValue(mockDoc);

    const result = await InsuranceDocumentService.create(USER_ID, file, 'My Policy', expiry);

    expect(result).toEqual(mockDoc);
    expect(prisma.insuranceDocument.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: USER_ID,
        policyName: 'My Policy',
        expiryDate: expiry,
        status: 'active',
      }),
    });
  });

  it('rejects when file is missing', async () => {
    await expect(
      InsuranceDocumentService.create(USER_ID, null as any, 'Policy', futureDate()),
    ).rejects.toThrow(ValidationError);
  });

  it('rejects invalid MIME type', async () => {
    const file = makeValidFile({ mimetype: 'application/zip' });
    await expect(
      InsuranceDocumentService.create(USER_ID, file, 'Policy', futureDate()),
    ).rejects.toThrow('Unsupported file type');
  });

  it('rejects file exceeding 10 MB', async () => {
    const file = makeValidFile({ size: 11 * 1024 * 1024 });
    await expect(
      InsuranceDocumentService.create(USER_ID, file, 'Policy', futureDate()),
    ).rejects.toThrow('File size must not exceed 10 MB');
  });

  it('rejects empty policy name', async () => {
    await expect(
      InsuranceDocumentService.create(USER_ID, makeValidFile(), '', futureDate()),
    ).rejects.toThrow('Policy name is required');
  });

  it('rejects whitespace-only policy name', async () => {
    await expect(
      InsuranceDocumentService.create(USER_ID, makeValidFile(), '   ', futureDate()),
    ).rejects.toThrow('Policy name is required');
  });

  it('rejects past expiry date', async () => {
    await expect(
      InsuranceDocumentService.create(USER_ID, makeValidFile(), 'Policy', pastDate()),
    ).rejects.toThrow('Expiry date must be in the future');
  });

  it('rejects invalid expiry date', async () => {
    await expect(
      InsuranceDocumentService.create(USER_ID, makeValidFile(), 'Policy', new Date('invalid')),
    ).rejects.toThrow('Expiry date must be a valid date');
  });

  it('accepts JPEG files', async () => {
    const file = makeValidFile({ mimetype: 'image/jpeg', originalname: 'doc.jpg' });
    (prisma.insuranceDocument.create as jest.Mock).mockResolvedValue({ id: DOC_ID });

    await InsuranceDocumentService.create(USER_ID, file, 'Policy', futureDate());
    expect(prisma.insuranceDocument.create).toHaveBeenCalled();
  });

  it('accepts PNG files', async () => {
    const file = makeValidFile({ mimetype: 'image/png', originalname: 'doc.png' });
    (prisma.insuranceDocument.create as jest.Mock).mockResolvedValue({ id: DOC_ID });

    await InsuranceDocumentService.create(USER_ID, file, 'Policy', futureDate());
    expect(prisma.insuranceDocument.create).toHaveBeenCalled();
  });
});

describe('InsuranceDocumentService.listByUser', () => {
  it('returns all documents for a user ordered by createdAt desc', async () => {
    const docs = [{ id: 'doc-1' }, { id: 'doc-2' }];
    (prisma.insuranceDocument.findMany as jest.Mock).mockResolvedValue(docs);

    const result = await InsuranceDocumentService.listByUser(USER_ID);

    expect(result).toEqual(docs);
    expect(prisma.insuranceDocument.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('filters by status when provided', async () => {
    (prisma.insuranceDocument.findMany as jest.Mock).mockResolvedValue([]);

    await InsuranceDocumentService.listByUser(USER_ID, 'active');

    expect(prisma.insuranceDocument.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
  });
});

describe('InsuranceDocumentService.getById', () => {
  it('returns a document by ID', async () => {
    const doc = { id: DOC_ID, policyName: 'Test' };
    (prisma.insuranceDocument.findUnique as jest.Mock).mockResolvedValue(doc);

    const result = await InsuranceDocumentService.getById(DOC_ID);
    expect(result).toEqual(doc);
  });

  it('returns null when document not found', async () => {
    (prisma.insuranceDocument.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await InsuranceDocumentService.getById('nonexistent');
    expect(result).toBeNull();
  });
});

describe('InsuranceDocumentService.delete', () => {
  it('deletes a document owned by the user', async () => {
    (prisma.insuranceDocument.findUnique as jest.Mock).mockResolvedValue({
      id: DOC_ID,
      userId: USER_ID,
      documentUrl: '/uploads/insurance-documents/user-001/test.pdf',
    });
    (prisma.insuranceDocument.delete as jest.Mock).mockResolvedValue({});

    await InsuranceDocumentService.delete(DOC_ID, USER_ID);

    expect(prisma.insuranceDocument.delete).toHaveBeenCalledWith({ where: { id: DOC_ID } });
  });

  it('throws NotFoundError when document does not exist', async () => {
    (prisma.insuranceDocument.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      InsuranceDocumentService.delete('nonexistent', USER_ID),
    ).rejects.toThrow(NotFoundError);
  });

  it('throws ForbiddenError when user does not own the document', async () => {
    (prisma.insuranceDocument.findUnique as jest.Mock).mockResolvedValue({
      id: DOC_ID,
      userId: 'other-user',
      documentUrl: '/uploads/test.pdf',
    });

    await expect(
      InsuranceDocumentService.delete(DOC_ID, USER_ID),
    ).rejects.toThrow(ForbiddenError);
  });
});

describe('InsuranceDocumentService.validateForAttachment', () => {
  it('returns true for an active document', async () => {
    (prisma.insuranceDocument.findUnique as jest.Mock).mockResolvedValue({
      id: DOC_ID,
      status: 'active',
    });

    const result = await InsuranceDocumentService.validateForAttachment(DOC_ID);
    expect(result).toBe(true);
  });

  it('returns false for an expired document', async () => {
    (prisma.insuranceDocument.findUnique as jest.Mock).mockResolvedValue({
      id: DOC_ID,
      status: 'expired',
    });

    const result = await InsuranceDocumentService.validateForAttachment(DOC_ID);
    expect(result).toBe(false);
  });

  it('returns false when document does not exist', async () => {
    (prisma.insuranceDocument.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await InsuranceDocumentService.validateForAttachment('nonexistent');
    expect(result).toBe(false);
  });
});

describe('InsuranceDocumentService.processExpiry', () => {
  it('expires documents with past expiry dates', async () => {
    (prisma.insuranceDocument.updateMany as jest.Mock).mockResolvedValue({ count: 3 });
    (prisma.insuranceDocument.findMany as jest.Mock).mockResolvedValue([]);

    const result = await InsuranceDocumentService.processExpiry();

    expect(result.expired).toBe(3);
    expect(prisma.insuranceDocument.updateMany).toHaveBeenCalledWith({
      where: {
        status: 'active',
        expiryDate: { lt: expect.any(Date) },
      },
      data: { status: 'expired' },
    });
  });

  it('sends notifications for documents within 30 days of expiry', async () => {
    (prisma.insuranceDocument.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

    const expiryDate = futureDate(15); // 15 days from now
    const docsToNotify = [
      {
        id: 'doc-1',
        userId: 'user-1',
        policyName: 'Policy A',
        expiryDate,
        expiryNotificationSent: false,
        user: { id: 'user-1', firstName: 'John' },
      },
    ];
    (prisma.insuranceDocument.findMany as jest.Mock).mockResolvedValue(docsToNotify);
    (prisma.insuranceDocument.update as jest.Mock).mockResolvedValue({});
    (NotificationService.notifyInsuranceDocumentExpiring as jest.Mock).mockResolvedValue(undefined);

    const result = await InsuranceDocumentService.processExpiry();

    expect(result.notified).toBe(1);
    expect(NotificationService.notifyInsuranceDocumentExpiring).toHaveBeenCalledWith(
      'user-1',
      'Policy A',
      expiryDate,
    );
    expect(prisma.insuranceDocument.update).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: { expiryNotificationSent: true },
    });
  });

  it('continues processing when a single notification fails', async () => {
    (prisma.insuranceDocument.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

    const docsToNotify = [
      {
        id: 'doc-1',
        userId: 'user-1',
        policyName: 'Policy A',
        expiryDate: futureDate(10),
        user: { id: 'user-1', firstName: 'John' },
      },
      {
        id: 'doc-2',
        userId: 'user-2',
        policyName: 'Policy B',
        expiryDate: futureDate(20),
        user: { id: 'user-2', firstName: 'Jane' },
      },
    ];
    (prisma.insuranceDocument.findMany as jest.Mock).mockResolvedValue(docsToNotify);
    (NotificationService.notifyInsuranceDocumentExpiring as jest.Mock)
      .mockRejectedValueOnce(new Error('Notification failed'))
      .mockResolvedValueOnce(undefined);
    (prisma.insuranceDocument.update as jest.Mock).mockResolvedValue({});

    const result = await InsuranceDocumentService.processExpiry();

    // First doc failed, second succeeded
    expect(result.notified).toBe(1);
    expect(prisma.insuranceDocument.update).toHaveBeenCalledTimes(1);
    expect(prisma.insuranceDocument.update).toHaveBeenCalledWith({
      where: { id: 'doc-2' },
      data: { expiryNotificationSent: true },
    });
  });
});
