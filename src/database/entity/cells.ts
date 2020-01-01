import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity()
export class Rule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  txHash: string;

  @Column()
  index: string;

  @Column()
  capacity: string

  @Column()
  lockHash: string;

  @Column()
  lockHashType: string;

  @Column()
  lockCodeHash: string;

  @Column()
  lockArgs: string;

  @Column()
  typeHash: string;

  @Column()
  typeHashType: string;

  @Column()
  typeCodeHash: string;

  @Column()
  typeArgs: string;

  @Column()
  data: string;
}