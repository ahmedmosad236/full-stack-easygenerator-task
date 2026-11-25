import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AUTH_COOKIE_NAME } from './auth/auth.constants';

export function configureApp(app: INestApplication): void {
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api');

  app.use(cookieParser());
  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  const rawOrigins = configService.get<string>(
    'WEB_ORIGIN',
    'http://localhost:5173',
  );
  const allowedOrigins = rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  app.enableCors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'X-Requested-With'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Full-Stack Authentication API')
    .setDescription(
      'Production-minded authentication REST API built with NestJS, MongoDB, Argon2id, and HttpOnly JWT cookies.',
    )
    .setVersion('1.0.0')
    .addCookieAuth(
      AUTH_COOKIE_NAME,
      {
        type: 'apiKey',
        in: 'cookie',
        name: AUTH_COOKIE_NAME,
        description:
          'HttpOnly cookie storing the short-lived signed JWT access token.',
      },
      AUTH_COOKIE_NAME,
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
