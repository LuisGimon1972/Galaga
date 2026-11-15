<template>
  <q-page
    class="flex flex-center arcade-bg text-white q-pa-xs column justify-start"
    style="min-height: 100vh"
    @click="focusGame"
  >
    <div
      ref="wrapperRef"
      class="column items-center justify-center q-gutter-xs bombermain-wrapper"
      tabindex="0"
    >
      <h6 class="q-my-sm arcade-title">Galaga Evolution Game</h6>

      <q-card flat class="glass-hud q-px-md q-py-xs full-width shadow-6">
        <div class="row justify-between items-center text-weight-bold hud-text">
          <div>
            🏆 Pontos: <span class="text-green-4">{{ score }}</span>
          </div>
          <div>
            📈 Onda: <span class="text-amber-4">{{ wave }}</span>
          </div>
          <div>
            ❤️ Vidas: <span class="text-red-4">{{ lives }}</span>
          </div>
        </div>
      </q-card>

      <div class="bomberman-container relative-position shadow-20">
        <canvas ref="canvasRef" width="480" height="500" class="bomberman-canvas"></canvas>

        <div
          v-if="isGameOver || isVictory"
          class="absolute-full flex flex-center overlay-bg column q-gutter-md q-pa-md"
        >
          <div
            class="text-weight-bold text-center overlay-title"
            :class="isVictory ? 'text-green-4' : 'text-red-5'"
          >
            {{ isVictory ? '🏆 VITÓRIA GALÁCTICA! 🏆' : '⚠️ GAME OVER ⚠️' }}
          </div>
          <q-btn
            color="amber-6"
            text-color="dark"
            icon="replay"
            label="Jogar de Novo"
            class="action-btn"
            @click="restartGame"
          />
        </div>
      </div>

      <!-- Controles para toque e visualização -->
      <div class="row items-center justify-between full-width q-px-xs q-mt-xs arcade-controls">
        <div class="row q-gutter-xs">
          <q-btn
            color="amber-8"
            text-color="dark"
            icon="arrow_back"
            class="arcade-key"
            @touchstart.prevent="setTouchMove(-1)"
            @touchend.prevent="setTouchMove(0)"
            @mousedown.prevent="setTouchMove(-1)"
            @mouseup.prevent="setTouchMove(0)"
            @mouseleave.prevent="setTouchMove(0)"
          />
          <q-btn
            color="amber-8"
            text-color="dark"
            icon="arrow_forward"
            class="arcade-key"
            @touchstart.prevent="setTouchMove(1)"
            @touchend.prevent="setTouchMove(0)"
            @mousedown.prevent="setTouchMove(1)"
            @mouseup.prevent="setTouchMove(0)"
            @mouseleave.prevent="setTouchMove(0)"
          />
        </div>
        <div class="row q-gutter-xs">
          <q-btn
            color="red-8"
            text-color="white"
            icon="local_fire_department"
            label="Disparar"
            class="action-btn fire-btn"
            @click="fireLaser"
          />
          <q-btn
            color="green-8"
            text-color="white"
            icon="restart_alt"
            class="action-btn reset-btn"
            @click="restartGame"
          />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { GalagaEngine } from '../game/GalagaEngine';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const wrapperRef = ref<HTMLElement | null>(null);

let engine: GalagaEngine | null = null;
let animId: number | null = null;

const score = ref(0);
const lives = ref(7);
const wave = ref(1);
const isGameOver = ref(false);
const isVictory = ref(false);

const activeKeys = { left: false, right: false };

const updateEngineDirection = () => {
  if (!engine) return;
  if (activeKeys.left) engine.moveDir = -1;
  else if (activeKeys.right) engine.moveDir = 1;
  else engine.moveDir = 0;
};

const focusGame = () => {
  if (wrapperRef.value) {
    wrapperRef.value.focus({ preventScroll: true });
  }
};

const setTouchMove = (dir: number) => {
  if (dir === -1) {
    activeKeys.left = true;
    activeKeys.right = false;
  } else if (dir === 1) {
    activeKeys.right = true;
    activeKeys.left = false;
  } else {
    activeKeys.left = false;
    activeKeys.right = false;
  }
  updateEngineDirection();
  focusGame();
};

const fireLaser = () => {
  if (engine) engine.shoot();
  focusGame();
};

const restartGame = () => {
  if (engine) {
    engine.score = 0;
    engine.lives = 7;
    engine.wave = 1;
    engine.isGameOver = false;
    engine.isVictory = false;
    engine.initWave();
    engine.player.reset();
  }
  focusGame();
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (['ArrowLeft', 'ArrowRight', ' '].includes(e.code)) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (e.code === 'ArrowLeft') activeKeys.left = true;
  if (e.code === 'ArrowRight') activeKeys.right = true;
  updateEngineDirection();

  if (e.code === 'Space' && engine && !e.repeat) {
    engine.shoot();
  }
};

const handleKeyUp = (e: KeyboardEvent) => {
  if (['ArrowLeft', 'ArrowRight', ' '].includes(e.code)) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (e.code === 'ArrowLeft') activeKeys.left = false;
  if (e.code === 'ArrowRight') activeKeys.right = false;
  updateEngineDirection();
};

const gameLoop = () => {
  if (engine && canvasRef.value) {
    const ctx = canvasRef.value.getContext('2d');
    if (ctx) {
      engine.update();
      engine.render(ctx);

      score.value = engine.score;
      lives.value = engine.lives;
      wave.value = engine.wave;
      isGameOver.value = engine.isGameOver;
      isVictory.value = engine.isVictory;
    }
  }
  animId = requestAnimationFrame(gameLoop);
};

onMounted(() => {
  window.scrollTo(0, 0);

  if (canvasRef.value) {
    engine = new GalagaEngine();
    gameLoop();
  }

  window.addEventListener('keydown', handleKeyDown, { capture: true });
  window.addEventListener('keyup', handleKeyUp, { capture: true });
  window.addEventListener('click', focusGame);

  setTimeout(() => {
    window.scrollTo(0, 0);
    focusGame();
    if (wrapperRef.value) {
      wrapperRef.value.focus();
    }
  }, 100);
});

onUnmounted(() => {
  if (animId) cancelAnimationFrame(animId);
  window.removeEventListener('keydown', handleKeyDown, true);
  window.removeEventListener('keyup', handleKeyUp, true);
  window.removeEventListener('click', focusGame);
});
</script>

<style scoped>
.arcade-bg {
  background-color: #030712;
  min-height: 100vh;
}
.bombermain-wrapper {
  max-width: 500px;
  width: 100%;
  margin: 0 auto;
  outline: none;
}
.glass-hud {
  background: rgba(15, 23, 42, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.hud-text {
  font-size: 13px;
}
.arcade-title {
  font-size: 1.25rem;
}
.overlay-title {
  font-size: 1.25rem;
}
.bomberman-container {
  background-color: #0b0f19;
  border-radius: 8px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  width: 100%;
  max-width: 480px;
  aspect-ratio: 480/500;
  display: flex;
  justify-content: center;
  align-items: center;
}
.bomberman-canvas {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.arcade-key {
  width: 50px;
  height: 45px;
  font-size: 20px;
}
.action-btn {
  font-size: 12px;
  padding: 8px 14px;
  border-radius: 6px;
  font-weight: bold;
}
.overlay-bg {
  background-color: rgba(3, 7, 18, 0.92);
  backdrop-filter: blur(6px);
  z-index: 10;
}

/* ==========================================================
   ADAPTAÇÕES RESPONSIVAS PARA TABLETS E PHONES 
   (Mantém o layout de desktop intacto em telas maiores)
   ========================================================== */

@media (max-width: 600px) {
  .arcade-bg {
    padding: 4px !important;
    justify-content: center !important;
  }
  .bombermain-wrapper {
    max-width: 100% !important;
    padding: 0 4px;
  }
  .arcade-title {
    font-size: 1rem !important;
    margin-top: 2px !important;
    margin-bottom: 2px !important;
  }
  .glass-hud {
    padding: 4px 8px !important;
  }
  .hud-text {
    font-size: 11px !important;
  }
  .bomberman-container {
    max-height: 60vh; /* Garante que o jogo não ultrapasse o ecrã verticalmente no telemóvel */
    width: 100%;
  }
  .arcade-controls {
    margin-top: 4px !important;
  }
  .arcade-key {
    width: 46px !important;
    height: 42px !important;
    font-size: 18px !important;
  }
  .action-btn {
    font-size: 11px !important;
    padding: 6px 10px !important;
  }
  .overlay-title {
    font-size: 1.1rem !important;
  }
}

@media (max-height: 700px) and (max-width: 600px) {
  /* Ajuste ultra-compacto para celulares pequenos em modo retrato */
  .bomberman-container {
    max-height: 52vh;
  }
  .arcade-key {
    width: 42px !important;
    height: 38px !important;
  }
}
</style>
