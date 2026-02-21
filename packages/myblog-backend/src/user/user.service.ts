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

  /**
     * Generate a base username from a name (remove spaces, lowercase, keep only valid chars)
     */
  private generateBaseUsername(name: string): string {
    // Remove spaces, convert to lowercase, keep only alphanumeric, dots, hyphens, underscores
    let base = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '') // Remove all spaces
      .replace(/[^a-z0-9._-]/g, '') // Remove invalid characters
      .replace(/\.{2,}/g, '.') // Replace consecutive dots with single dot
      .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
      .substring(0, 30); // Max 30 chars

    // If empty or too short after cleaning, use a default
    if (base.length < 3) {
      // Try to use first letters of name, or fallback to 'user'
      const initials = name
        .split(/\s+/)
        .map(word => word.charAt(0).toLowerCase())
        .filter(char => /[a-z0-9]/.test(char))
        .join('');
            
      if (initials.length >= 3) {
        base = initials.substring(0, 30);
      } else {
        base = 'user';
      }
    }

    return base;
  }

  /**
     * Find an available username by trying the base name, then adding incrementing numbers
     */
  private async findAvailableUsername(baseUsername: string): Promise<string> {
    // Try the base username first
    const isTaken = await this.userRepository.isUsernameTaken(baseUsername);
    if (!isTaken) {
      return baseUsername;
    }

    // Try with incrementing numbers
    let counter = 1;
    let candidate: string;
    do {
      // Append number, but keep total length <= 30
      const numberStr = counter.toString();
      const maxBaseLength = 30 - numberStr.length;
      candidate = baseUsername.substring(0, maxBaseLength) + numberStr;
      counter++;
            
      // Safety check to prevent infinite loop
      if (counter > 10000) {
        throw new Error('Unable to generate unique username');
      }
    } while (await this.userRepository.isUsernameTaken(candidate));

    return candidate;
  }

  /**
     * Register a new user with optional address
     */
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
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new UserWithThatEmailAlreadyExistsException(userData.email);
    }

    // Hash password
    const hashedPassword = hashData(userData.password);

    // Generate a unique username from the user's name
    const baseUsername = this.generateBaseUsername(userData.name);
    const username = await this.findAvailableUsername(baseUsername);

    // Create user
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

  /**
     * Get user by ID with address
     */
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
      address: user.address_id ? {
        street: user.street!,
        city: user.city!,
        country: user.country!,
      } : undefined,
    };
  }

  /**
     * Get user by username with address
     */
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
      address: user.address_id ? {
        street: user.street!,
        city: user.city!,
        country: user.country!,
      } : undefined,
    };
  }

  /**
     * Update user's username. Returns the updated user.
     */
  async updateUsername(params: { userId: string; username: string }) {
    const { userId, username } = params;
    const isTaken = await this.userRepository.isUsernameTaken(username, userId);
    if (isTaken) {
      throw new UsernameAlreadyTakenException(username);
    }

    await this.userRepository.updateUsername(userId, username);
    this.logger.info('Username updated', { userId });

    return this.getUserById(userId);
  }

  /**
     * Update user's profile picture (DB only)
     */
  async updateProfilePicture(userId: string, filename: string): Promise<void> {
    await this.userRepository.updateProfilePicture(userId, filename);
    this.logger.info('Profile picture updated', { userId });
  }

  /**
     * Upload profile picture: ensure bucket, store in MinIO, remove previous if any, update user.
     */
  async uploadProfilePicture(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ profilePicture: string }> {
    await ensureBucketExists(PROFILE_PICTURES_BUCKET);

    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const filename = `${userId}_${timestamp}${extension}`;

    const user = await this.userRepository.findById(userId);
    if (user?.profilePicture) {
      try {
        await minioClient.removeObject(
          PROFILE_PICTURES_BUCKET,
          user.profilePicture,
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
      { 'Content-Type': file.mimetype },
    );

    await this.userRepository.updateProfilePicture(userId, filename);
    this.logger.info('Profile picture updated', { userId });
    return { profilePicture: filename };
  }

  /**
     * Enable 2FA for user
     */
  async enableTwoFactor(userId: string): Promise<void> {
    await this.userRepository.enableTwoFactor(userId);
    this.logger.info('2FA enabled for user', { userId });
  }

  /**
     * Disable 2FA for user
     */
  async disableTwoFactor(userId: string): Promise<void> {
    await this.userRepository.disableTwoFactor(userId);
    this.logger.info('2FA disabled for user', { userId });
  }

  /**
     * Update 2FA code for user
     */
  async updateTwoFactorCode(userId: string, code: string): Promise<void> {
    await this.userRepository.updateTwoFactorCode(userId, code);
  }
}
