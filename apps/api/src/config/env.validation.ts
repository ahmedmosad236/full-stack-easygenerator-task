import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 4000;

  @IsString()
  @IsNotEmpty({ message: 'MONGODB_URI is required' })
  MONGODB_URI!: string;

  @IsString()
  @MinLength(16, {
    message: 'JWT_SECRET must be at least 16 characters long for security',
  })
  JWT_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '15m';

  @IsString()
  @IsNotEmpty({ message: 'WEB_ORIGIN is required' })
  WEB_ORIGIN: string = 'http://localhost:5173';

  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @IsOptional()
  THROTTLE_TTL: number = 60000;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  THROTTLE_LIMIT: number = 20;
}

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((err) => Object.values(err.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Environment validation failed: ${messages}`);
  }

  return validatedConfig;
}
