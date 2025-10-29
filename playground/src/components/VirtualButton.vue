<template>
  <button class="virtual-button">
    Virtual Host Enabled
  </button>
</template>

<style scoped>
.virtual-button {
  border: none;
  border-radius: 999px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #22d3ee, #2563eb);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.virtual-button:hover {
  transform: translateY(-2px);
}
</style>
