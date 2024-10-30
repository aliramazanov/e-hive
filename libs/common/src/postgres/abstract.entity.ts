import { PrimaryGeneratedColumn } from 'typeorm';

export class AbstractEntity<T> {
  @PrimaryGeneratedColumn()
  id: string;

  constructor(entity: Partial<T>) {
    Object.assign(this, entity);
  }
}
