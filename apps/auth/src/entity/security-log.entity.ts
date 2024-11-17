import { Column } from 'typeorm';

export class SecurityLog {
  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastFailedLogin?: Date;

  @Column({ type: 'int', nullable: true })
  failedLoginAttempts?: number;

  @Column({ nullable: true })
  lastIp?: string;

  @Column({ nullable: true })
  lastUserAgent?: string;
}
