export interface DomainEvent {
  readonly occurredOn: Date
  readonly eventName: string
}

export abstract class BaseDomainEvent implements DomainEvent {
  readonly occurredOn: Date
  abstract readonly eventName: string

  constructor() {
    this.occurredOn = new Date()
  }
}
