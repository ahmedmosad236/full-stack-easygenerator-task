import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { SafeUser, UsersService } from '../users/users.service';
import { SignInDto } from './dto/signin.dto';
import { SignUpDto } from './dto/signup.dto';
import { JwtPayload } from './strategies/jwt.strategy';

export interface AuthSessionResult {
  user: SafeUser;
  accessToken: string;
}

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';

@Injectable()
export class AuthService {
  private dummyPasswordHashPromise: Promise<string> | null = null;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async hashPassword(plainPassword: string): Promise<string> {
    return argon2.hash(plainPassword, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  async verifyPassword(hash: string, plainPassword: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plainPassword);
    } catch {
      return false;
    }
  }

  async signup(dto: SignUpDto): Promise<AuthSessionResult> {
    const normalizedEmail = this.usersService.normalizeEmail(dto.email);
    const existingUser = await this.usersService.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new ConflictException(
        'An account with this email address already exists.',
      );
    }

    const passwordHash = await this.hashPassword(dto.password);
    const createdUser = await this.usersService.create({
      name: dto.name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    const safeUser = this.usersService.toSafeUser(createdUser);
    const accessToken = await this.signAccessToken(safeUser);

    return {
      user: safeUser,
      accessToken,
    };
  }

  async signin(dto: SignInDto): Promise<AuthSessionResult> {
    const normalizedEmail = this.usersService.normalizeEmail(dto.email);
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      // Mitigate user-enumeration timing disparity by performing a dummy Argon2 verification
      const dummyHash = await this.getDummyPasswordHash();
      await this.verifyPassword(dummyHash, dto.password);
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const isPasswordValid = await this.verifyPassword(
      user.passwordHash,
      dto.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const safeUser = this.usersService.toSafeUser(user);
    const accessToken = await this.signAccessToken(safeUser);

    return {
      user: safeUser,
      accessToken,
    };
  }

  private async signAccessToken(user: SafeUser): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };
    return this.jwtService.signAsync(payload);
  }

  private getDummyPasswordHash(): Promise<string> {
    if (!this.dummyPasswordHashPromise) {
      this.dummyPasswordHashPromise = this.hashPassword(
        'DummyPasswordForTimingMitigation1!',
      );
    }
    return this.dummyPasswordHashPromise;
  }
}
