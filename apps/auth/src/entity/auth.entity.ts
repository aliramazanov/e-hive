import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('auth')
export class Auth {
  @ApiProperty({
    description: 'Unique identifier for the record',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    uniqueItems: true,
  })
  @Column({ unique: true })
  email: string;

  @ApiHideProperty()
  @Column()
  @Exclude()
  password: string;

  @ApiHideProperty()
  @Column({ nullable: true })
  @Exclude()
  refreshToken?: string;

  @ApiProperty({
    description: 'Associated user ID in the user service',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @Column()
  userId: string;

  @ApiHideProperty()
  @Column({ nullable: true })
  @Exclude()
  emailVerificationToken?: string;

  @ApiProperty({
    description: 'Checks if the user email has been verified',
    example: false,
    default: false,
  })
  @Column({ default: false })
  isEmailVerified: boolean;

  @ApiHideProperty()
  @Column({ nullable: true })
  @Exclude()
  passwordResetToken?: string;

  @ApiProperty({
    description: 'Expiration timestamp for password reset token',
    example: '2024-01-01T00:00:00Z',
    required: false,
    nullable: true,
  })
  @Column({ nullable: true })
  passwordResetTokenExpiry?: Date;
}
