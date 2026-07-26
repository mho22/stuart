<script setup lang="ts">

import { computed, ref } from 'vue';
import Markdown from './Markdown.vue';
import { kinds, type Message } from '../data';


const props = defineProps<{ message : Message }>();

const open = ref( false );
const copied = ref( false );

const kindLabel = computed(() => kinds[ props.message.kind ]?.label ?? props.message.kind );


async function copyBody()
{
	await navigator.clipboard.writeText( props.message.body );

	copied.value = true;

	setTimeout( () => ( copied.value = false ), 2000 );
}


const preview = computed( () => props.message.body.replace( /\[([^\]]*)\]\([^)]*\)/g, '$1' ).replace( /\s+/g, ' ' ).trim().slice( 0, 220 ) + '…' );

const judgedDate = computed( () => props.message.judgedAgainst.slice( 0, 10 ) );

const secondaryMentions = computed( () => props.message.mentions.slice( 1 ) );
</script>

<template>

	<article class="card" :class="{ 'card--open': open }" @click="open = true">

		<button class="card-header" :aria-expanded="open" @click.stop="open = !open">

			<span class="badge" :class="`badge--${message.kind}`">{{ kindLabel }}</span>

			<span class="card-number">{{ message.isPr ? 'PR' : 'Issue' }} #{{ message.number }}</span>

			<span v-if="message.mentions[0]" class="card-maintainer">{{ message.mentions[0] }}</span>

			<span
				v-for="handle in secondaryMentions"
				:key="handle"
				class="card-maintainer card-maintainer--secondary"
			>{{ handle }}</span>

			<span class="card-chevron" aria-hidden="true">›</span>

		</button>

		<p v-if="!open" class="card-preview">{{ preview }}</p>

		<div v-else class="card-expanded">

			<div class="card-context-zone">

				<span class="card-section-label">Context</span>

				<p v-if="message.summary" class="card-summary">{{ message.summary }}</p>

				<blockquote v-if="message.context" class="card-context">{{ message.context }}</blockquote>

			</div>

			<span class="card-section-label">Stuart's suggested answer</span>

			<div class="card-answer">

				<Markdown :source="message.body" />

			</div>

			<div class="card-provenance">

				<button class="card-copy" :class="{ 'card-copy--done': copied }" @click="copyBody">

					{{ copied ? '✓ copied' : '⧉ copy message' }}

				</button>

				<a v-if="message.item" :href="message.item" target="_blank" rel="noopener noreferrer">

					↗ open {{ message.isPr ? 'pull request' : 'issue' }} on GitHub

				</a>

				<span v-if="message.run">run {{ message.run }}</span>

				<span v-if="judgedDate">judged against {{ judgedDate }}</span>

			</div>

		</div>

	</article>

</template>
