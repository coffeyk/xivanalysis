import stable from 'stable'

import {getFflogsEvents} from 'api'
import STATUSES from 'data/STATUSES'
import Module from 'parser/core/Module'

const TARGET_CHECK_EVENT_TYPES = ['damage', 'heal']

const QUERY_FILTER = [
	// Need to get RR info to determine card strength
	{
		types: ['removebuff'],
		abilities: [
			STATUSES.ENHANCED_ROYAL_ROAD.id,
			STATUSES.EXPANDED_ROYAL_ROAD.id,
			STATUSES.EXTENDED_ROYAL_ROAD.id,
		],
	},

	// Player-applied debuffs that don't get pulled when checking by actor
	{
		types: ['applydebuff', 'removedebuff'],
		abilities: [
			STATUSES.SLASHING_RESISTANCE_DOWN.id,
			STATUSES.PIERCING_RESISTANCE_DOWN.id,
			STATUSES.BLUNT_RESISTANCE_DOWN.id,
			STATUSES.TRICK_ATTACK_VULNERABILITY_UP.id,
			STATUSES.CHAIN_STRATAGEM.id,
			STATUSES.FOE_REQUIEM_DEBUFF.id,
			STATUSES.HYPERCHARGE_VULNERABILITY_UP.id,
			STATUSES.RADIANT_SHIELD_PHYSICAL_VULNERABILITY_UP.id,
			STATUSES.CONTAGION_MAGIC_VULNERABILITY_UP.id,
			STATUSES.RUINATION.id,
		],
		targetsOnly: true,
	},
]

export default class AdditionalEvents extends Module {
	static handle = 'additionalEvents'

	async normalise(events) {
		// Get a set of every target that was _directly_ interacted with (avoiding all those dupe instances that get used for mechanics that still get buff applications ree)
		const targets = new Set()
		for (let i = 0; i < events.length; i++) {
			const event = events[i]

			// Only care about events by the player, directly onto something else
			// Also only care when both data points are there
			if (
				!TARGET_CHECK_EVENT_TYPES.includes(event.type) ||
				event.sourceID !== this.parser.player.id ||
				!event.targetID ||
				!event.targetInstance
			) { continue }

			// Compose a bit of filter query that we can add to the set
			targets.add(`(target.id=${event.targetID} and target.instance=${event.targetInstance})`)
		}

		const targetQuery = Array.from(targets).join(' or ')

		// Build the filter string
		let filter = QUERY_FILTER.map(section => {
			const types = section.types.map(type => `'${type}'`).join(',')
			const abilities = section.abilities.join(',')

			let condition = `type in (${types}) and ability.id in (${abilities})`
			if (section.targetsOnly) {
				condition += ` and (${targetQuery})`
			}

			return `(${condition})`
		}).join(' or ')

		// Exclude events by the current player and their pets, as we already have them from the main event lookup
		const playerIds = [
			this.parser.player.id,
			...this.parser.player.pets.map(pet => pet.id),
		].join(',')
		filter +=  ` and source.id not in (${playerIds})`

		// Request the new events
		const newEvents = await getFflogsEvents(
			this.parser.report.code,
			this.parser.fight,
			{filter}
		)

		// Add them onto the end, then sort. Using stable to ensure order is kept, as it can be sensitive sometimes.
		events.push.apply(events, newEvents)
		stable.inplace(events, (a, b) => a.timestamp - b.timestamp)

		return events
	}
}