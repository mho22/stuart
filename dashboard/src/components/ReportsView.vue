<script setup lang="ts">

import { computed, ref } from 'vue';
import Markdown from './Markdown.vue';
import { reports } from '../data';


const workflowLabels : Record<string, string> = {
	intake : 'Intake',
	sweep : 'Sweep',
	analysis : 'Analysis',
	audit : 'Audit',
};

const selected = ref( reports[ 0 ]?.id ?? '' );

const current = computed( () => reports.find( r => r.id === selected.value ) );

</script>

<template>

	<div class="view view--split">

		<aside class="sidebar">

			<button v-for="report in reports" :key="report.id" class="side-entry" :class="{ 'side-entry--active': selected === report.id }" @click="selected = report.id">

				<span class="side-entry-stack">

					<span class="side-entry-label">{{ workflowLabels[ report.workflow ] ?? report.workflow }}</span>

					<span class="side-entry-sub">{{ report.date }}</span>

				</span>

			</button>

		</aside>

		<section v-if="current" class="detail">

			<Markdown :source="current.body" />

		</section>

	</div>

</template>
