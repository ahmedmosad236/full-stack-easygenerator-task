import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SignInDto {
  @ApiProperty({
    description: 'Registered user email address',
    example: 'jane.doe@example.com',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString({ message: 'Email must be a string.' })
  @IsNotEmpty({ message: 'Email is required.' })
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @MaxLength(254, { message: 'Email must not exceed 254 characters.' })
  email!: string;

  @ApiProperty({
    description: 'User account password',
    example: 'SecurePass1!',
  })
  @IsString({ message: 'Password must be a string.' })
  @IsNotEmpty({ message: 'Password is required.' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters.' })
  password!: string;
}
