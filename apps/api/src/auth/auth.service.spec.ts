import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService (Unit)', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockDate = new Date('2026-11-25T12:00:00.000Z');

  beforeEach(async () => {
    const mockUsersService = {
      normalizeEmail: jest.fn((email: string) => email.trim().toLowerCase()),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      toSafeUser: jest.fn((user: UserDocument) => ({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      })),
    };

    const mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  describe('hashPassword & verifyPassword', () => {
    it('hashes a password using Argon2id and verifies it accurately', async () => {
      const rawPassword = 'StrongPassword1!';
      const hash = await authService.hashPassword(rawPassword);

      expect(hash).toBeDefined();
      expect(hash).not.toEqual(rawPassword);
      expect(hash.startsWith('$argon2id$')).toBe(true);

      const isValid = await authService.verifyPassword(hash, rawPassword);
      expect(isValid).toBe(true);

      const isInvalid = await authService.verifyPassword(hash, 'WrongPass1!');
      expect(isInvalid).toBe(false);
    });
  });

  describe('signup', () => {
    it('creates a new user with hashed password and returns a signed JWT and safe user profile', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockImplementation(async (input) => {
        return {
          _id: { toString: () => '507f1f77bcf86cd799439011' },
          name: input.name,
          email: input.email,
          passwordHash: input.passwordHash,
          createdAt: mockDate,
          updatedAt: mockDate,
        } as unknown as UserDocument;
      });

      const result = await authService.signup({
        name: '  Alice Smith  ',
        email: '  Alice.Smith@Example.com ',
        password: 'SecurePassword1!',
      });

      expect(usersService.findByEmail).toHaveBeenCalledWith(
        'alice.smith@example.com',
      );
      expect(usersService.create).toHaveBeenCalledTimes(1);
      const createdArg = usersService.create.mock.calls[0][0];
      expect(createdArg.name).toBe('Alice Smith');
      expect(createdArg.email).toBe('alice.smith@example.com');
      expect(createdArg.passwordHash.startsWith('$argon2id$')).toBe(true);

      expect(result.user).toEqual({
        id: '507f1f77bcf86cd799439011',
        name: 'Alice Smith',
        email: 'alice.smith@example.com',
        createdAt: mockDate,
      });
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.accessToken).toBe('signed-jwt-token');
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: '507f1f77bcf86cd799439011',
        email: 'alice.smith@example.com',
      });
    });

    it('throws ConflictException when email is already registered', async () => {
      usersService.findByEmail.mockResolvedValue({
        _id: { toString: () => '507f1f77bcf86cd799439011' },
        name: 'Existing User',
        email: 'existing@example.com',
        passwordHash: 'hash',
      } as unknown as UserDocument);

      await expect(
        authService.signup({
          name: 'Existing User',
          email: 'existing@example.com',
          password: 'SecurePassword1!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('signin', () => {
    it('authenticates valid credentials and returns safe user and JWT', async () => {
      const passwordHash = await authService.hashPassword('ValidPass123!');
      usersService.findByEmail.mockResolvedValue({
        _id: { toString: () => '507f1f77bcf86cd799439012' },
        name: 'Bob Jones',
        email: 'bob@example.com',
        passwordHash,
        createdAt: mockDate,
        updatedAt: mockDate,
      } as unknown as UserDocument);

      const result = await authService.signin({
        email: 'BOB@example.com',
        password: 'ValidPass123!',
      });

      expect(result.user).toEqual({
        id: '507f1f77bcf86cd799439012',
        name: 'Bob Jones',
        email: 'bob@example.com',
        createdAt: mockDate,
      });
      expect(result.accessToken).toBe('signed-jwt-token');
    });

    it('throws generic UnauthorizedException when user does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.signin({
          email: 'nonexistent@example.com',
          password: 'AnyPassword1!',
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password.'));
    });

    it('throws identical generic UnauthorizedException when password is wrong', async () => {
      const passwordHash = await authService.hashPassword('CorrectPass1!');
      usersService.findByEmail.mockResolvedValue({
        _id: { toString: () => '507f1f77bcf86cd799439012' },
        name: 'Bob Jones',
        email: 'bob@example.com',
        passwordHash,
        createdAt: mockDate,
        updatedAt: mockDate,
      } as unknown as UserDocument);

      await expect(
        authService.signin({
          email: 'bob@example.com',
          password: 'WrongPassword1!',
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password.'));
    });
  });
});
