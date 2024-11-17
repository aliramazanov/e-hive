import { Exclude } from 'class-transformer';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('auth')
export class Auth {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ nullable: true })
  @Exclude()
  refreshToken?: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  @Exclude()
  emailVerificationToken?: string;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  @Exclude()
  passwordResetToken?: string;

  @Column({ nullable: true })
  passwordResetTokenExpiry?: Date;
}
