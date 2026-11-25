import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SignUpDto {
  @ApiProperty({
    description: 'Full name of the user (trimmed, minimum 3 characters)',
    example: 'Jane Doe',
    minLength: 3,
    maxLength: 100,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'Name must be a string.' })
  @IsNotEmpty({ message: 'Name is required.' })
  @MinLength(3, { message: 'Name must be at least 3 characters long.' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters.' })
  name!: string;

  @ApiProperty({
    description: 'Unique email address (normalized to lowercase)',
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
    description:
      'Password with at least 8 characters, 1 letter, 1 number, and 1 special character',
    example: 'SecurePass1!',
    minLength: 8,
    maxLength: 128,
  })
  @IsString({ message: 'Password must be a string.' })
  @IsNotEmpty({ message: 'Password is required.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters.' })
  @Matches(/[A-Za-z]/, {
    message: 'Password must contain at least one letter.',
  })
  @Matches(/\d/, {
    message: 'Password must contain at least one number.',
  })
  @Matches(/[^A-Za-z0-9]/, {
    message: 'Password must contain at least one special character.',
  })
  password!: string;
}
