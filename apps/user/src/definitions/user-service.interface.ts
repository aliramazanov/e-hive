import { UpdateProfileDto } from 'apps/user/src/dto/update-profile.dto';
import { User } from '../entity/user.entity';
import { UserSearchQuery } from 'apps/user/src/dto/user-search.query.dto';
import { UserPreferences } from './user-preferences';
import { UserSettings } from './user-settings';

export interface IUserService {
  createUser(email: string): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  updateProfile(id: string, data: UpdateProfileDto): Promise<User>;
  updatePreferences(
    id: string,
    preferences: Partial<UserPreferences>,
  ): Promise<User>;
  updateSettings(id: string, settings: Partial<UserSettings>): Promise<User>;
  deactivateAccount(id: string): Promise<void>;
  reactivateAccount(id: string): Promise<void>;
  softDeleteUser(id: string): Promise<void>;
  restoreUser(id: string): Promise<void>;
  updateLastLogin(id: string): Promise<void>;
  searchUsers(query: UserSearchQuery): Promise<[User[], number]>;
}
