import * as path from 'path';
import { UserRepository } from './user.repository';
import { AddressRepository } from './address.repository';
import { hashData } from '../common/utils/bcrypt';
import {
  UserNotFoundException,
  UserWithThatEmailAlreadyExistsException,
  UsernameAlreadyTakenException,
} from './user.errors';
import type { User } from '../database/types';
import { AppLogger } from '../common/utils/app-logger/app-logger';
import {
  minioClient,
  PROFILE_PICTURES_BUCKET,
  ensureBucketExists,
} from '../utils/minio';

export class UserService {
  private readonly logger = new AppLogger(UserService.name);
  private userRepository = new UserRepository();
  private addressRepository = new AddressRepository();

  private generateBaseUsername(name: string): string {
    let base = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9._-]/g, '')
      .replace(/\.{2,}/g, '.')
      .replace(/^\.+|\.+$/g, '')
      .substring(0, 30);

    if (base.length < 3) {
      const initials = name
        .split(/\s+/)
        .map((word) => word.charAt(0).toLowerCase())
        .filter((char) => /[a-z0-9]/.test(char))
        .join('');

      if (initials.length >= 3) {
        base = initials.substring(0, 30);
      } else {
        base = 'user';
      }
    }

    return base;
  }

  private async findAvailableUsername(baseUsername: string): Promise<string> {
    const isTaken = await this.userRepository.isUsernameTaken({
      username: baseUsername,
    });
    if (!isTaken) {
      return baseUsername;
    }

    let counter = 1;
    let candidate: string;
    do {
      const numberStr = counter.toString();
      const maxBaseLength = 30 - numberStr.length;
      candidate = baseUsername.substring(0, maxBaseLength) + numberStr;
      counter++;

      if (counter > 10000) {
        throw new Error('Unable to generate unique username');
      }
    } while (
      await this.userRepository.isUsernameTaken({ username: candidate })
    );

    return candidate;
  }

  async register(userData: {
    name: string;
    email: string;
    password: string;
    address?: {
      street: string;
      city: string;
      country: string;
    };
  }): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new UserWithThatEmailAlreadyExistsException(userData.email);
    }

    const hashedPassword = hashData(userData.password);
    const baseUsername = this.generateBaseUsername(userData.name);
    const username = await this.findAvailableUsername(baseUsername);

    const newUser = await this.userRepository.create({
      name: userData.name,
      email: userData.email,
      password_hash: hashedPassword,
      status: 'active',
      username: username,
    });

    let address = undefined;
    if (userData.address) {
      address = await this.addressRepository.create({
        street: userData.address.street,
        city: userData.address.city,
        country: userData.address.country,
        userId: newUser.id,
      });
    }

    this.logger.info('User created', { userId: newUser.id });

    return { ...newUser, address };
  }

  async getUserById(id: string) {
    const user = await this.userRepository.findByIdWithAddress(id);
    if (!user) {
      throw new UserNotFoundException(id);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username || undefined,
      profilePicture: user.profilePicture || undefined,
      createdAt: user.createdAt?.toISOString(),
      isTwoFactorEnabled: user.isTwoFactorAuthenticationEnabled,
      address: user.address_id
        ? {
            street: user.street!,
            city: user.city!,
            country: user.country!,
          }
        : undefined,
    };
  }

  async getUserByUsername(username: string) {
    const user = await this.userRepository.findByUsernameWithAddress(username);
    if (!user) {
      throw new UserNotFoundException(username);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username || undefined,
      profilePicture: user.profilePicture || undefined,
      createdAt: user.createdAt?.toISOString(),
      isTwoFactorEnabled: user.isTwoFactorAuthenticationEnabled,
      address: user.address_id
        ? {
            street: user.street!,
            city: user.city!,
            country: user.country!,
          }
        : undefined,
    };
  }

  async updateUsername(params: { userId: string; username: string }) {
    const { userId, username } = params;
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new UserNotFoundException(userId);
    }
    if (existingUser.username === username) {
      return this.getUserById(userId);
    }

    const isTaken = await this.userRepository.isUsernameTaken({ username });
    if (isTaken) {
      throw new UsernameAlreadyTakenException(username);
    }

    await this.userRepository.updateUsername({ id: userId, username });
    this.logger.info('Username updated', { userId });

    return this.getUserById(userId);
  }

  async updateProfilePicture(params: {
    userId: string;
    filename: string;
  }): Promise<void> {
    const { userId, filename } = params;
    await this.userRepository.updateProfilePicture({ id: userId, filename });
    this.logger.info('Profile picture updated', { userId });
  }

  async uploadProfilePicture(params: {
    userId: string;
    file: Express.Multer.File;
  }): Promise<{ profilePicture: string }> {
    const { userId, file } = params;
    await ensureBucketExists(PROFILE_PICTURES_BUCKET);

    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const filename = `${userId}_${timestamp}${extension}`;

    const user = await this.userRepository.findById(userId);
    if (user?.profilePicture) {
      try {
        await minioClient.removeObject(
          PROFILE_PICTURES_BUCKET,
          user.profilePicture
        );
      } catch {
        this.logger.warn('Failed to delete old profile picture from MinIO', {
          userId,
        });
      }
    }

    await minioClient.putObject(
      PROFILE_PICTURES_BUCKET,
      filename,
      file.buffer,
      file.size,
      { 'Content-Type': file.mimetype }
    );

    await this.userRepository.updateProfilePicture({ id: userId, filename });
    this.logger.info('Profile picture updated', { userId });
    return { profilePicture: filename };
  }

  async enableTwoFactor(userId: string): Promise<void> {
    await this.userRepository.enableTwoFactor(userId);
    this.logger.info('2FA enabled for user', { userId });
  }

  async disableTwoFactor(userId: string): Promise<void> {
    await this.userRepository.disableTwoFactor(userId);
    this.logger.info('2FA disabled for user', { userId });
  }

  async updateTwoFactorCode(params: {
    userId: string;
    code: string;
  }): Promise<void> {
    const { userId, code } = params;
    await this.userRepository.updateTwoFactorCode({ id: userId, code });
  }
}
