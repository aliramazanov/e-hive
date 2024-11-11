import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entity/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createUser(email: string): Promise<User> {
    return this.userRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const existingUser = await transactionalEntityManager
          .createQueryBuilder(User, 'user')
          .setLock('pessimistic_write')
          .where('user.email = :email', { email })
          .getOne();

        if (existingUser) {
          throw new Error('User already exists');
        }

        const user = this.userRepository.create({ email });
        return transactionalEntityManager.save(user);
      },
    );
  }

  async findByEmail(email: string): Promise<User> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User> {
    return this.userRepository.findOne({ where: { id } });
  }

  async removeUser(id: string): Promise<void> {
    await this.userRepository.delete(id);
  }
}
