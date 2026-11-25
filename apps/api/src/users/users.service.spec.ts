import { ConflictException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { User, UserDocument } from './schemas/user.schema';
import { UsersService } from './users.service';

describe('UsersService (Unit)', () => {
  let usersService: UsersService;
  let mockSave: jest.Mock;

  beforeEach(async () => {
    mockSave = jest.fn();

    function MockUserModel(dto: Record<string, unknown>) {
      return {
        ...dto,
        save: mockSave,
      };
    }

    MockUserModel.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    MockUserModel.findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: MockUserModel,
        },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
  });

  it('normalizes email addresses by trimming and lowercasing', () => {
    expect(usersService.normalizeEmail('  Test.User@Example.COM  ')).toBe(
      'test.user@example.com',
    );
  });

  it('translates MongoDB duplicate key error (11000) into ConflictException', async () => {
    const duplicateKeyError = Object.assign(new Error('E11000 duplicate key'), {
      code: 11000,
    });
    mockSave.mockRejectedValue(duplicateKeyError);

    await expect(
      usersService.create({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$hash',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('strips passwordHash when converting UserDocument to SafeUser', () => {
    const createdAt = new Date('2026-11-25T10:00:00.000Z');
    const doc = {
      _id: { toString: () => '507f1f77bcf86cd799439099' },
      name: 'Safe User',
      email: 'safe@example.com',
      passwordHash: '$argon2id$secret-hash',
      createdAt,
      updatedAt: createdAt,
    } as unknown as UserDocument;

    const safeUser = usersService.toSafeUser(doc);
    expect(safeUser).toEqual({
      id: '507f1f77bcf86cd799439099',
      name: 'Safe User',
      email: 'safe@example.com',
      createdAt,
    });
    expect(safeUser).not.toHaveProperty('passwordHash');
  });
});
