import {
  Controller,
  Get,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Connection, ConnectionStates } from 'mongoose';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: 'connected' })
  database!: string;

  @ApiProperty({ example: '2026-11-25T12:00:00.000Z' })
  timestamp!: string;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Returns API health status and MongoDB connectivity state.',
  })
  @ApiOkResponse({
    description: 'API and MongoDB are healthy.',
    type: HealthResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: 'Database is not connected.',
  })
  checkHealth(): HealthResponseDto {
    const isConnected =
      this.connection.readyState === ConnectionStates.connected;

    if (!isConnected) {
      throw new ServiceUnavailableException({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        status: 'degraded',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    };
  }
}
