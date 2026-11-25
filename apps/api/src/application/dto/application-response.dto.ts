import { ApiProperty } from '@nestjs/swagger';

export class ApplicationResponseDto {
  @ApiProperty({
    description: 'Welcome message for authenticated application users',
    example: 'Welcome to the application.',
  })
  message!: string;
}
