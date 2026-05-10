import type { DomainEvent } from './domain-event.js'
import type { UniqueId } from './unique-id.js'

export abstract class BaseEntity<TProps extends { id: UniqueId }> {
  protected readonly _props: TProps
  private readonly _domainEvents: DomainEvent[] = []

  protected constructor(props: TProps) {
    this._props = props
  }

  get id(): UniqueId {
    return this._props.id
  }

  get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event)
  }

  clearDomainEvents(): void {
    this._domainEvents.length = 0
  }

  equals(other: BaseEntity<TProps>): boolean {
    return this._props.id.equals(other._props.id)
  }
}
