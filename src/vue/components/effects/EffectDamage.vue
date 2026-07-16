<template>
	<p class="effect-hint"><b>공격 타입</b>이 지정된 feature의 피해 굴림에 합산됩니다. 값: 숫자 또는 <code>@grade.value</code> 같은 식</p>
	<table class="effect-abilities-table">
		<thead>
			<tr>
				<th>공격</th>
				<th>다이스 단계 (±2면)</th>
				<th>다이스 개수</th>
				<th>피해 보정</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td class="ability-label">근접</td>
				<td><input type="text" v-model="viewModel.dmgMeleeStep" placeholder="0" /></td>
				<td><input type="text" v-model="viewModel.dmgMeleeDice" placeholder="0" /></td>
				<td><input type="text" v-model="viewModel.dmgMeleeBonus" placeholder="0" /></td>
			</tr>
			<tr>
				<td class="ability-label">사격</td>
				<td><input type="text" v-model="viewModel.dmgRangedStep" placeholder="0" /></td>
				<td><input type="text" v-model="viewModel.dmgRangedDice" placeholder="0" /></td>
				<td><input type="text" v-model="viewModel.dmgRangedBonus" placeholder="0" /></td>
			</tr>
		</tbody>
	</table>
</template>

<script setup>
const props = defineProps(['viewModel']);
</script>

<style scoped>
.effect-abilities-table { width: 100%; border-collapse: collapse; }
.effect-abilities-table th, .effect-abilities-table td { text-align: center; padding: 2px; }
.effect-abilities-table th { font-size: 0.85em; }
.effect-abilities-table .ability-label { white-space: nowrap; font-weight: bold; }
.effect-abilities-table input { width: 100%; min-width: 0; box-sizing: border-box; text-align: center; }
.effect-hint { font-size: 0.8em; opacity: 0.6; margin: 0 0 6px; }
.effect-hint code { opacity: 0.9; }
</style>
