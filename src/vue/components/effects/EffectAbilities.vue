<template>
	<!-- 능력치별 수치/보정치 증감(ADD)·덮어쓰기(OVERRIDE).
	     수치(value) = 'pre' 단계 적용 → 수정치·HP·방어까지 반영.
	     보정치(mod) = 'default' 단계 적용 → 표시·판정용(파생계산엔 미반영). -->
	<table class="effect-abilities-table">
		<thead>
			<tr>
				<th>능력치</th>
				<th>수치 증감</th>
				<th>수치 덮어쓰기</th>
				<th>보정 증감</th>
				<th>보정 덮어쓰기</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="ab in abilities" :key="ab.key">
				<td class="ability-label">{{ ab.label }}</td>
				<td><input type="text" v-model="viewModel[ab.key + '_valAdd']" placeholder="0" /></td>
				<td><input type="text" v-model="viewModel[ab.key + '_valOver']" placeholder="—" /></td>
				<td><input type="text" v-model="viewModel[ab.key + '_modAdd']" placeholder="0" /></td>
				<td><input type="text" v-model="viewModel[ab.key + '_modOver']" placeholder="—" /></td>
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

<style>
.effect-abilities-table {
	width: 100%;
	border-collapse: collapse;
}
.effect-abilities-table th,
.effect-abilities-table td {
	text-align: center;
	padding: 2px;
}
.effect-abilities-table th {
	font-size: 0.85em;
}
.effect-abilities-table .ability-label {
	white-space: nowrap;
	font-weight: bold;
}
.effect-abilities-table input {
	width: 100%;
	min-width: 0;
	box-sizing: border-box;
	text-align: center;
}
</style>
