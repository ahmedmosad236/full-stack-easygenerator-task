import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    const normalizedEmail = this.normalizeEmail(email);
    return this.userModel.findOne({ email: normalizedEmail }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.userModel.findById(id).exec();
  }

  async create(input: CreateUserInput): Promise<UserDocument> {
    const normalizedEmail = this.normalizeEmail(input.email);
    const trimmedName = input.name.trim();

    try {
      const createdUser = new this.userModel({
        name: trimmedName,
        email: normalizedEmail,
        passwordHash: input.passwordHash,
      });
      return await createdUser.save();
    } catch (error: unknown) {
      if (this.isMongoDuplicateKeyError(error)) {
        throw new ConflictException(
          'An account with this email address already exists.',
        );
      }
      throw error;
    }
  }

  toSafeUser(user: UserDocument): SafeUser {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  private isMongoDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 11000
    );
  }
}
