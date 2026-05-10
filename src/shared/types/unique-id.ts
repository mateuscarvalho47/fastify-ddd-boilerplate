import { v4 as uuidv4 } from 'uuid'

export class UniqueId {
  readonly value: string

  constructor(value?: string) {
    this.value = value ?? uuidv4()
  }

  equals(other: UniqueId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
