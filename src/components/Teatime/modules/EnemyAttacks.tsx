import {DamageEvent} from 'fflogs'
import _ from 'lodash'
import Module, {dependency} from 'parser/core/Module'
import Timeline, {Item, ItemGroup} from 'parser/core/modules/Timeline'

// Enemy attacks

// LL Auto attack
// type: 'cast'
// ability.guid: 18808

export default class EnemyAttacks extends Module {
	static handle = 'enemyAttacks'

	@dependency private timeline!: Timeline

	private damageEvents: DamageEvent[] = []

	protected init() {
		this.addHook('damage', {sourceIsFriendly: false}, this.onDamage)

		this.addHook('complete', this._onComplete)
	}

	private onDamage(event: DamageEvent) {
		this.damageEvents.push(event)
	}

	private _onComplete() {
		const startTime = this.parser.fight.start_time

		// TODO: Add them to the group of the player?
		// const group = new ItemGroup({
		// 	id: -99,
		// 	content: 'Boss Damage',
		// 	visible: true,
		// })
		// this.timeline.addGroup(group)

		for (const event of this.damageEvents) {
			this.timeline.addItem(new Item({
				type: 'background',
				style: 'background-color: #ce909085;',
				start: event.timestamp - startTime,
				end: event.timestamp - startTime + 1,
				// content: `${event.ability.guid}`,
			}))
		}
	}
}
