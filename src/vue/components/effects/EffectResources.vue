<template>
	<p class="effect-hint">값: 숫자 또는 <code>@end.mod</code> 같은 식</p>

	<table class="effect-abilities-table">
		<thead>
			<tr>
				<th>자원</th>
				<th>최대치 증감</th>
				<th>최대치 덮어쓰기</th>
				<th>기반 대체</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td class="ability-label">HP</td>
				<td><input type="text" v-model="viewModel.hpMax" placeholder="0" /></td>
				<td><input type="text" v-model="viewModel.hpMaxOver" placeholder="—" /></td>
				<td><input type="text" v-model="viewModel.hpBaseOver" placeholder="—" /></td>
			</tr>
			<tr>
				<td class="ability-label">MP</td>
				<td><input type="text" v-model="viewModel.mpMax" placeholder="0" /></td>
				<td><input type="text" v-model="viewModel.mpMaxOver" placeholder="—" /></td>
				<td><input type="text" v-model="viewModel.mpBaseOver" placeholder="—" /></td>
			</tr>
			<tr>
				<td class="ability-label">SP</td>
				<td><input type="text" v-model="viewModel.spMax" placeholder="0" /></td>
				<td><input type="text" v-model="viewModel.spMaxOver" placeholder="—" /></td>
				<td><input type="text" v-model="viewModel.spBaseOver" placeholder="—" /></td>
			</tr>
		</tbody>
	</table>

	<hr/>

	<div class="form-group"><label>이니셔티브 증감</label><div class="field"><input type="text" v-model="viewModel.initAdd" placeholder="0" /></div></div>
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
