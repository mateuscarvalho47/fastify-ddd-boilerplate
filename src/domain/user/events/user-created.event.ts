import { BaseDomainEvent } from '@shared/types/domain-event.js'

export class UserCreatedEvent extends BaseDomainEvent {
  readonly eventName = 'UserCreated'

  constructor(
    readonly userId: string,
    readonly email: string,
  ) {
    super()
  }
}
