<script setup lang="ts">

import { computed, ref } from 'vue';
import Markdown from './Markdown.vue';
import { maintainers } from '../data';


const selected = ref( maintainers[ 0 ]?.handle ?? '' );

const current = computed( () => maintainers.find( m => m.handle === selected.value ) );

</script>

<template>

	<div class="view view--split">

		<aside class="sidebar">

			<button v-for="maintainer in maintainers" :key="maintainer.handle" class="side-entry" :class="{ 'side-entry--active': selected === maintainer.handle }" @click="selected = maintainer.handle">

				<span class="avatar">{{ maintainer.handle.slice(0, 2) }}</span>

				<span class="side-entry-label">{{ maintainer.handle }}</span>

			</button>

		</aside>

		<section v-if="current" class="detail">

			<header class="profile-head">

				<span class="avatar avatar--large">{{ current.handle.slice(0, 2) }}</span>

				<div>

					<h2 class="profile-handle">{{ current.handle }}</h2>

					<a class="profile-link" :href="`https://github.com/${current.handle}`" target="_blank" rel="noopener noreferrer">↗ github.com/{{ current.handle }}</a>

				</div>

			</header>

			<Markdown :source="current.body" />

		</section>

	</div>

</template>
