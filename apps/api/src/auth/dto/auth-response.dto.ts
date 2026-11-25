import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty({
    description: 'Unique user identifier',
    example: '67445420c13a4b0012345678',
  })
  id!: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'Jane Doe',
  })
  name!: string;

  @ApiProperty({
    description: 'Normalized email address of the user',
    example: 'jane.doe@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Account creation timestamp in ISO-8601 format',
    example: '2026-11-25T12:00:00.000Z',
  })
  createdAt!: Date;
}

export class AuthResponseDto {
  @ApiProperty({
    type: UserProfileDto,
    description: 'Authenticated user profile',
  })
  user!: UserProfileDto;
}

export class LogoutResponseDto {
  @ApiProperty({
    description: 'Logout confirmation message',
    example: 'Logged out successfully.',
  })
  message!: string;
}
