<template>
  <div :class="`field-textarea grow-wrap ${classes ?? ''}`" :data-replicated-value="replicatedValue" :data-tooltip="dataTooltip" :data-tooltip-direction="dataTooltipDirection">
    <textarea :name="name"
      :value="valueAttr"
      @input="updateValue"
      rows="1"
      :placeholder="placeholder"
      spellcheck="false"
      @keydown="(event) => handleShiftKey(event, 'keydown')"
      @keyup="(event) => handleShiftKey(event, 'keyup')"
    ></textarea>
  </div>
</template>

<script>
export default {
  name: 'TextareaGrow',
  props: ['classes', 'value', 'name', 'placeholder', 'data-tooltip', 'data-tooltip-direction', 'disable-paste-parsing'],
  data() {
    return {
      valueAttr: '',
      isShift: false,
    }
  },
  computed: {
    // Not currently used, but we can modify this if we need to add things
    // like &nbsp; to the replicated value.
    replicatedValue() {
      return this.valueAttr;
    }
  },
  methods: {
    updateValue(event) {
      this.valueAttr = event.target.value;
      this.$emit('update:value', event.target.value);
    },
    handleShiftKey(event, eventName) {
      if (eventName === 'keydown') {
        if (!this.isShift && event.key === 'Shift') {
          this.isShift = true;
        }
      }
      else if (eventName === 'keyup') {
        if (this.isShift && event.key === 'Shift') {
          this.isShift = false;
        }
      }
    },
  },
  // Add a watch process to catch upstream updates from the actor/item document.
  watch: {
    'value': {
      handler() {
        this.valueAttr = this.value;
      }
    }
  },
  async created() {
    this.valueAttr = this.value ?? '';
  }
}
</script>