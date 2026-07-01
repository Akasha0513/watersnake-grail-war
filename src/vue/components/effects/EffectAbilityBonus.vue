<template>
	<!-- 능력치 상시보정(flatBonus, 18 상한 대상)·±개수(rerollPlus) 조작.
	     대체(override) 또는 기존값 + 증감(add). 값에 @grade.value 등 식 가능. -->
	<p class="effect-hint">상시보정은 능력치 <b>18 상한</b> 대상. 값: 숫자 또는 식.</p>
	<table class="effect-abilities-table">
		<thead>
			<tr>
				<th>능력치</th>
				<th>상시보정 증감</th>
				<th>상시보정 대체</th>
				<th>± 증감</th>
				<th>± 대체</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="ab in abilities" :key="ab.key">
				<td class="ability-label">{{ ab.label }}</td>
				<td><input type="text" v-model="viewModel[ab.key + '_flatAdd']" placeholder="0" /></td>
				<td><input type="text" v-model="viewModel[ab.key + '_flatOver']" placeholder="—" /></td>
				<td><input type="text" v-model="viewModel[ab.key + '_rerollAdd']" placeholder="0" /></td>
				<td><input type="text" v-model="viewModel[ab.key + '_rerollOver']" placeholder="—" /></td>
			</tr>
		</tbody>
	</table>
</template>

<script setup>
const props = defineProps(['viewModel']);
const abilities = [
	{ key: 'str', label: '근력' },
	{ key: 'end', label: '내구' },
	{ key: 'agi', label: '민첩' },
	{ key: 'mgi', label: '마력' },
	{ key: 'lck', label: '행운' },
	{ key: 'ins', label: '통찰' },
];
</script>

<style scoped>
.effect-abilities-table { width: 100%; border-collapse: collapse; }
.effect-abilities-table th, .effect-abilities-table td { text-align: center; padding: 2px; }
.effect-abilities-table th { font-size: 0.85em; }
.effect-abilities-table .ability-label { white-space: nowrap; font-weight: bold; }
.effect-abilities-table input { width: 100%; min-width: 0; box-sizing: border-box; text-align: center; }
.effect-hint { font-size: 0.8em; opacity: 0.6; margin: 0 0 6px; }
</style>
