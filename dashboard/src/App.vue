<script setup lang="ts">

import { ref } from 'vue';
import MessagesView from './components/MessagesView.vue';
import MaintainersView from './components/MaintainersView.vue';
import ReportsView from './components/ReportsView.vue';
import { messages, maintainers, reports, repository, repositoryUrl } from './data';
import logo from './assets/stuart-logo.png';

type Tab = 'messages' | 'maintainers' | 'reports';

const tabs : { id : Tab; label : string; count : number }[] = [

	{ id : 'messages', label : 'Messages', count : messages.length },
	{ id : 'maintainers', label : 'Maintainers', count : maintainers.length },
	{ id : 'reports', label : 'Reports', count : reports.length }

];

const activeTab = ref<Tab>( 'messages') ;

</script>

<template>

	<div class="page">

		<header class="topbar">

			<div class="brand">

				<img class="brand-logo" :src="logo" alt="Stuart logo" />

				<div class="brand-text">

					<h1 class="brand-title">Stuart — the contribution steward</h1>

					<p class="brand-subtitle">

						Shadow-mode output for

						<a :href="repositoryUrl" target="_blank" rel="noopener noreferrer">{{ repository }}</a>

						— nothing here was posted upstream.
					</p>

				</div>

			</div>

			<nav class="tabs">

				<button v-for="tab in tabs" :key="tab.id" class="tab" :class="{ 'tab--active': activeTab === tab.id }" @click="activeTab = tab.id">

					{{ tab.label }}

					<span class="tab-count">{{ tab.count }}</span>

				</button>

			</nav>

		</header>

		<main>

			<MessagesView v-if="activeTab === 'messages'" />

			<MaintainersView v-else-if="activeTab === 'maintainers'" />

			<ReportsView v-else />

		</main>

	</div>

</template>
