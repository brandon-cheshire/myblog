import { User } from '../database/types.js';

// Internal type for authentication (includes password hash)
// This is just an alias to User since User already has password_hash
export interface UserWithPasswordHash extends User {
  passwordHash: string;
}
