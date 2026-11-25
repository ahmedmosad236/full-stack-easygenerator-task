import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(Logger);
  app.useLogger(logger);

  configureApp(app);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000);

  await app.listen(port);
  logger.log(`API running on http://localhost:${port}/api`, 'Bootstrap');
  logger.log(
    `Swagger documentation available at http://localhost:${port}/api/docs`,
    'Bootstrap',
  );
}

void bootstrap();
