import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AUTH_COOKIE_NAME } from '../auth/auth.constants';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApplicationService } from './application.service';
import { ApplicationResponseDto } from './dto/application-response.dto';

@ApiTags('Application')
@Controller('application')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth(AUTH_COOKIE_NAME)
  @ApiOperation({
    summary: 'Get application welcome message',
    description:
      'Protected endpoint returning the required application welcome message for authenticated users.',
  })
  @ApiOkResponse({
    description: 'Returns the exact welcome message.',
    type: ApplicationResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, expired, or invalid authentication cookie.',
  })
  getApplicationWelcome(): ApplicationResponseDto {
    return this.applicationService.getWelcomeMessage();
  }
}
