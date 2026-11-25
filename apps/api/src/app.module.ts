import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { ApplicationModule } from './application/application.module';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { Environment, validateEnvironment } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv =
          process.env.NODE_ENV ??
          configService.get<string>('NODE_ENV', Environment.Development);
        const isTest = nodeEnv === Environment.Test;
        const isDev = nodeEnv === Environment.Development;

        return {
          pinoHttp: {
            level: isTest ? 'silent' : isDev ? 'debug' : 'info',
            transport: isDev
              ? {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true,
                    colorize: true,
                    translateTime: 'SYS:standard',
                  },
                }
              : undefined,
            redact: {
              paths: [
                'req.headers.cookie',
                'req.headers.authorization',
                'res.headers["set-cookie"]',
                'req.body.password',
                'req.body.passwordHash',
                '*.password',
                '*.passwordHash',
                '*.token',
                '*.accessToken',
              ],
              censor: '[REDACTED]',
            },
            customProps: (req) => ({
              context: 'HTTP',
              method: req.method,
              url: req.url,
            }),
          },
        };
      },
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri:
          process.env.MONGODB_URI_TEST ||
          configService.getOrThrow<string>('MONGODB_URI'),
        autoIndex: true,
      }),
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: Number(
            process.env.THROTTLE_TTL ??
              configService.get<number>('THROTTLE_TTL', 60000),
          ),
          limit: Number(
            process.env.THROTTLE_LIMIT ??
              configService.get<number>('THROTTLE_LIMIT', 20),
          ),
        },
      ],
    }),
    CommonModule,
    UsersModule,
    AuthModule,
    ApplicationModule,
    HealthModule,
  ],
})
export class AppModule {}
