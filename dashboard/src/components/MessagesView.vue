<script setup lang="ts">
import { computed, ref } from 'vue';
import MessageCard from './MessageCard.vue';
import { countBy, kindOrder, kinds, maintainers, messages, type Message } from '../data';


const search = ref( '' );
const activeKind = ref<string | null>( null );
const activeMaintainer = ref<string | null>( null );

const searched = computed( () =>
{
	const query = search.value.trim().toLowerCase();

	if( ! query ) return messages;

	return messages.filter( m => `${m.number} ${m.kind} ${m.title} ${m.body}`.toLowerCase().includes( query ) );
} );

function underKind( list : Message[] ) : Message[]
{
	return activeKind.value ? list.filter( m => m.kind === activeKind.value ) : list;
}

function underMaintainer( list : Message[] ) : Message[]
{
	return activeMaintainer.value ? list.filter( m => m.mentions.includes( activeMaintainer.value ! ) ) : list;
}


const kindPool = computed( () => underMaintainer( searched.value ) );
const maintainerPool = computed( () => underKind( searched.value ) );

const filtered = computed( () =>
{
	const list = underKind( underMaintainer( searched.value ) );
	const handle = activeMaintainer.value;

	if( ! handle ) return list;

	const directness = ( message : Message ) : number => message.mentions[ 0 ] === handle ? 0 : 1;

	return [ ...list ].sort( ( a, b ) => directness( a ) - directness( b ) || b.number - a.number );
} );
const kindCounts = computed( () => countBy( kindPool.value, m => m.kind ) );
const kindChips = computed( () => kindOrder.map( kind => ( { kind, count : kindCounts.value.get( kind ) ?? 0, ...kinds[ kind ] } ) ).filter( chip => chip.count > 0 || activeKind.value === chip.kind ) );

const maintainerCounts = computed( () =>
{
	const counts = new Map<string, number>();

	for( const message of maintainerPool.value )
	{
		for( const handle of message.mentions )
		{
			counts.set( handle, ( counts.get( handle ) ?? 0 ) + 1 );
		}
	}

	return counts;
} );

const maintainerChips = computed( () => maintainers.map( m => ( { handle : m.handle, count : maintainerCounts.value.get( m.handle ) ?? 0 } ) ).filter( chip => chip.count > 0 || activeMaintainer.value === chip.handle ) );

function toggleKind( kind : string )
{
	activeKind.value = activeKind.value === kind ? null : kind;
}

function toggleMaintainer( handle : string )
{
	activeMaintainer.value = activeMaintainer.value === handle ? null : handle;
}

</script>

<template>

	<div class="view">

		<div class="toolbar">

			<input v-model="search" class="search" type="search" placeholder="Search messages…" aria-label="Search messages" />

			<div class="chip-row chip-row--scroll">

				<button class="chip chip--pinned" :class="{ 'chip--active': activeMaintainer === null }" @click="activeMaintainer = null">

					All maintainers

				</button>

				<button v-for="chip in maintainerChips" :key="chip.handle" class="chip" :class="{ 'chip--active': activeMaintainer === chip.handle }" @click="toggleMaintainer(chip.handle)">

					{{ chip.handle }}

					<span class="chip-count">{{ chip.count }}</span>

				</button>

			</div>

			<div class="chip-row">

				<button class="chip" :class="{ 'chip--active': activeKind === null }" @click="activeKind = null" >

					All kinds

					<span class="chip-count">{{ kindPool.length }}</span>

				</button>

				<button v-for="chip in kindChips" :key="chip.kind" class="chip" :class="{ 'chip--active': activeKind === chip.kind }" @click="toggleKind(chip.kind)">

					{{ chip.label }}

					<span class="chip-count" :class="`chip-count--${chip.kind}`">{{ chip.count }}</span>

					<span class="hint" :class="`hint--${chip.kind}`" role="tooltip">

						<span class="hint-title">{{ chip.label }}</span>

						{{ chip.hint }}

					</span>

				</button>

			</div>

		</div>

		<div class="card-list">

			<MessageCard v-for="message in filtered" :key="message.id" :message="message" />

			<p v-if="filtered.length === 0" class="empty-state">No messages match the current filters.</p>

		</div>

	</div>

</template>
