<template>
	<!-- 능력치별. 기반수치(value): 증감(ADD)은 'pre' 단계, 기반 대체(override)는 대체 후 강화 누적.
	     보정치(mod): 증감(ADD)·덮어쓰기(OVERRIDE)는 'default' 단계(표시·판정용).
	     값에 @grade.value 등 식 가능(단, 기반 대체는 계산 이른 단계라 @능력치 참조는 제한적). -->
	<table class="effect-abilities-table">
		<thead>
			<tr>
				<th>능력치</th>
				<th>기반 증감</th>
				<th>기반 대체</th>
				<th>보정 증감</th>
				<th>보정 덮어쓰기</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="ab in abilities" :key="ab.key">
				<td class="ability-label">{{ ab.label }}</td>
				<td><input type="text" v-model="viewModel[ab.key + '_valAdd']" placeholder="0" /></td>
				<td><input type="text" v-model="viewModel[ab.key + '_baseOver']" placeholder="—" /></td>
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
