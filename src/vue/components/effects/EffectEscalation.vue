<template>
	<p class="effect-hint">계산 순서: <b>인식</b>(전장값 조정) → <b>기준·상한</b>(역할 변환) → <b>최종 증감/대체</b> → <b>반전</b>. 값: 숫자 또는 <code>@end.mod</code> 같은 식</p>

	<h3 class="effect-group-title">인식 고조 <span class="effect-group-sub">역할 변환 전 — 상한·÷3 적용됨</span></h3>
	<div class="form-group"><label>증감</label><div class="field"><input type="text" v-model="viewModel.edRawAdd" placeholder="0" /></div></div>
	<div class="form-group"><label>대체</label><div class="field"><input type="text" v-model="viewModel.edRawOver" placeholder="—" /></div></div>

	<h3 class="effect-group-title">역할 변환</h3>
	<div class="form-group"><label>고조 기준</label><div class="field">
		<select v-model="edModeSel">
			<option value="">기본(역할대로)</option>
			<option value="1">서번트 기준</option>
			<option value="2">마스터 기준</option>
		</select>
	</div></div>
	<div class="form-group"><label>상한 대체</label><div class="field"><input type="text" v-model="viewModel.edCapOver" placeholder="급 (예: @end.mod)" /></div></div>

	<h3 class="effect-group-title">최종 <span class="effect-group-sub">변환 후 — 제한 무시</span></h3>
	<div class="form-group"><label>최종 증감</label><div class="field"><input type="text" v-model="viewModel.edBonusAdd" placeholder="0" /></div></div>
	<div class="form-group"><label>최종 대체</label><div class="field"><input type="text" v-model="viewModel.edValueOver" placeholder="— (0=차단)" /></div></div>
	<div class="form-group"><label>반전</label><div class="field">
		<input type="checkbox" :checked="String(viewModel.edInvert ?? '') === '1'" @change="e => viewModel.edInvert = e.target.checked ? '1' : ''" />
	</div></div>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps(['viewModel']);
// 셀렉트: viewModel이 undefined일 때 '기본' 옵션이 선택돼 보이도록 ''로 정규화.
// ''는 저장 루프에서 행 제거로 처리됨(ArchmageActiveEffectSheetVue 저장 규칙).
const edModeSel = computed({
	get: () => String(props.viewModel.edModeOver ?? ''),
	set: (v) => { props.viewModel.edModeOver = v; }
});
</script>

<style scoped>
.effect-group-title {
	margin: 10px 0 2px;
	font-size: 0.95em;
	opacity: 0.85;
	border-bottom: 1px solid var(--color-border, rgba(255,255,255,0.15));
}
.effect-group-sub { font-size: 0.8em; opacity: 0.6; font-weight: normal; margin-left: 4px; }
.effect-hint { font-size: 0.8em; opacity: 0.6; margin: 0 0 6px; }
.effect-hint code { opacity: 0.9; }
</style>
