import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { AbstractEntity } from './abstract.entity';
import { Logger, NotFoundException } from '@nestjs/common';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

export abstract class AbstractRepository<T extends AbstractEntity<T>> {
  protected abstract readonly logger: Logger;
  private readonly errormsg = `The item you are looking for couldn't be found`;

  constructor(
    private readonly entityRepository: Repository<T>,
    private readonly entityManager: EntityManager,
  ) {}

  async create(entity: T): Promise<T> {
    return await this.entityManager.save(entity);
  }

  async findOne(where: FindOptionsWhere<T>): Promise<T> {
    const entity = await this.entityRepository.findOne({ where });

    if (!entity) {
      this.logger.warn(this.errormsg, where);
      throw new NotFoundException(this.errormsg);
    }

    return entity;
  }

  async findOneAndUpdate(
    where: FindOptionsWhere<T>,
    update: QueryDeepPartialEntity<T>,
  ): Promise<T> {
    const result = await this.entityRepository.update(where, update);

    if (!result.affected) {
      this.logger.warn(this.errormsg, where);
      throw new NotFoundException(this.errormsg);
    }

    return await this.findOne(where);
  }

  async find(where: FindOptionsWhere<T>): Promise<T[]> {
    const entities = await this.entityRepository.findBy(where);
    return entities || [];
  }

  async findOneAndDelete(where: FindOptionsWhere<T>) {
    await this.entityRepository.delete(where);
  }
}
