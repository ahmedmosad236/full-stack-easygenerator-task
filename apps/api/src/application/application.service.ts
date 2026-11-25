import { Injectable } from '@nestjs/common';
import { ApplicationResponseDto } from './dto/application-response.dto';

export const APPLICATION_WELCOME_MESSAGE = 'Welcome to the application.';

@Injectable()
export class ApplicationService {
  getWelcomeMessage(): ApplicationResponseDto {
    return {
      message: APPLICATION_WELCOME_MESSAGE,
    };
  }
}
