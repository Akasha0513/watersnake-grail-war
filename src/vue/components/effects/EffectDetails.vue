<template>
	<div class="form-group" v-if="foundryEffect.parent.documentName === 'Actor'">
		<label>{{ localize("EFFECT.FIELDS.origin.label") }}</label>
		<div class="form-fields">
			<input type="text" name="origin" v-model="viewModel.origin" />
		</div>
	</div>

	<div class="form-group">
		<label>{{ localize("EFFECT.FIELDS.disabled.label") }}</label>
		<input type="checkbox" v-model="viewModel.disabled" />
	</div>

	<div class="form-group">
		<label>{{ localize("ARCHMAGE.ITEM.stacksAlways") }}</label>
		<input type="checkbox" v-model="viewModel.stacksAlways" />
	</div>

	<div class="form-group">
		<label>{{ localize("EFFECT.TABS.duration") }}</label>
		<div class="form-fields">
			<select name="duration" v-model="viewModel.duration">
				<option value="">{{ localize('ARCHMAGE.noneOption') }}</option>
				<option v-for="(label, value) in CONFIG.HOLYGRAILWAR.effectDurationTypes" :key="value" :value="value">
					{{ localize(label) }}
				</option>
			</select>
		</div>
	</div>
</template>

<script setup>
import { reactive, watch, inject } from 'vue';
import { localize } from '@/methods/Helpers';
import {
	Prosemirror,
	InfoBubble,
} from '@/components';

const props = defineProps(['effect', 'context']);
const { effect } = props;
const foundryEffect = inject('itemDocument')

const viewModel = reactive({
	origin: effect.origin,
	disabled: effect.disabled,
	stacksAlways: effect.flags['watersnake-grail-war']?.stacksAlways ?? false,
	duration: effect.flags['watersnake-grail-war']?.duration ?? null,
});
watch(viewModel, (newValue) => {
	foundryEffect.update({
		origin: newValue.origin,
		disabled: newValue.disabled,
	})

	foundryEffect.setFlag('watersnake-grail-war', 'stacksAlways', newValue.stacksAlways);
	foundryEffect.setFlag('watersnake-grail-war', 'duration', newValue.duration);
}, { deep: true });
</script>
