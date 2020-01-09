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
		const ABILITY_NAMES: {[key: number]: string} = {
			18808 : 'Auto Attack', // LL
			18809 : 'Auto Attack', // HAND
		}
		const halfSecond = 500
		for (const event of this.damageEvents) {
			const abilityName = event.ability.name || ABILITY_NAMES[event.ability.guid] || `${event.ability.guid}`
			this.timeline.addItem(new Item({
				type: 'point',
				group: event.targetID,
				style: 'background-color: #ce909085;',
				start: event.timestamp - startTime,
				end: event.timestamp - startTime + halfSecond,
				title: abilityName,
			}))
		}
	}
}
