import { IsEmail, IsOptional, Length } from 'class-validator';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserPreferences } from '../definitions/user-preferences';
import { UserSettings } from '../definitions/user-settings';
import { SocialLinksDto } from '../dto/social-links.dto';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  @IsEmail()
  email: string;

  @Column({ length: 50, nullable: true })
  @Length(2, 50)
  @IsOptional()
  firstName?: string;

  @Column({ length: 50, nullable: true })
  @Length(2, 50)
  @IsOptional()
  lastName?: string;

  @Column({ nullable: true, length: 15 })
  @IsOptional()
  phoneNumber?: string;

  @Column({
    type: 'enum',
    enum: ['user', 'admin', 'moderator'],
    default: 'user',
  })
  role: string;

  @Column({ type: 'jsonb', nullable: true })
  preferences: UserPreferences;

  @Column({ type: 'jsonb', nullable: true })
  settings: UserSettings;

  @Column({ type: 'jsonb', nullable: true })
  socialLinks: SocialLinksDto;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  deletedAt?: Date;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ nullable: true, type: 'text' })
  bio?: string;

  @Column({ nullable: true })
  location?: string;

  get fullName(): string {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim();
  }
}
