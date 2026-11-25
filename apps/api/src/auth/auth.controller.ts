import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Environment } from '../config/env.validation';
import { SafeUser } from '../users/users.service';
import {
  AUTH_COOKIE_NAME,
  buildAuthCookieOptions,
  parseDurationToMs,
} from './auth.constants';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  AuthResponseDto,
  LogoutResponseDto,
} from './dto/auth-response.dto';
import { SignInDto } from './dto/signin.dto';
import { SignUpDto } from './dto/signup.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly isProduction: boolean;
  private readonly cookieMaxAgeMs: number;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.isProduction =
      this.configService.get<string>('NODE_ENV') === Environment.Production;
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
    this.cookieMaxAgeMs = parseDurationToMs(expiresIn);
  }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new user account, hashes the password using Argon2id, sets an HttpOnly JWT authentication cookie, and returns the created user profile.',
  })
  @ApiCreatedResponse({
    description:
      'User registered successfully. Sets the HttpOnly `access_token` cookie.',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error (invalid email, weak password, short name, or unexpected fields).',
  })
  @ApiConflictResponse({
    description: 'Email address is already registered.',
  })
  @ApiForbiddenResponse({
    description: 'Cross-site request rejected due to invalid Origin header.',
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many signup requests from this IP.',
  })
  async signup(
    @Body() dto: SignUpDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { user, accessToken } = await this.authService.signup(dto);

    res.cookie(
      AUTH_COOKIE_NAME,
      accessToken,
      buildAuthCookieOptions(this.isProduction, this.cookieMaxAgeMs),
    );

    return { user };
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign in with email and password',
    description:
      'Verifies credentials, sets an HttpOnly JWT authentication cookie, and returns the authenticated user profile.',
  })
  @ApiOkResponse({
    description:
      'Authenticated successfully. Sets the HttpOnly `access_token` cookie.',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error (missing or invalid fields).',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid email or password.',
  })
  @ApiForbiddenResponse({
    description: 'Cross-site request rejected due to invalid Origin header.',
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many sign-in attempts from this IP.',
  })
  async signin(
    @Body() dto: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { user, accessToken } = await this.authService.signin(dto);

    res.cookie(
      AUTH_COOKIE_NAME,
      accessToken,
      buildAuthCookieOptions(this.isProduction, this.cookieMaxAgeMs),
    );

    return { user };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth(AUTH_COOKIE_NAME)
  @ApiOperation({
    summary: 'Get current authenticated user',
    description:
      'Validates the HttpOnly JWT cookie and confirms the user exists in the database.',
  })
  @ApiOkResponse({
    description: 'Returns the currently authenticated user profile.',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, expired, or invalid authentication cookie.',
  })
  getMe(@CurrentUser() user: SafeUser): AuthResponseDto {
    return { user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth(AUTH_COOKIE_NAME)
  @ApiOperation({
    summary: 'Log out the current user',
    description:
      'Clears the HttpOnly JWT authentication cookie using identical cookie flags.',
  })
  @ApiOkResponse({
    description: 'Logged out and cleared authentication cookie.',
    type: LogoutResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid authentication cookie.',
  })
  @ApiForbiddenResponse({
    description: 'Cross-site request rejected due to invalid Origin header.',
  })
  logout(@Res({ passthrough: true }) res: Response): LogoutResponseDto {
    res.clearCookie(
      AUTH_COOKIE_NAME,
      buildAuthCookieOptions(this.isProduction),
    );

    return { message: 'Logged out successfully.' };
  }
}
