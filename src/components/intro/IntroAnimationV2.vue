<template>
  <div class="intro" :class="{hide: done}">
    <div class="stage">
      <img class="car side" :class="{drive: started, disappear: rotate}" :src="sideCar" />
      <img class="car front" :class="{enter: rotate, rush: crash}" :src="frontCar" />
      <div class="speed-lines" :class="{active: crash}"></div>
      <div class="flash" :class="{active: crash}"></div>
      <div class="particles" :class="{active: logo}"></div>
      <div class="brand" :class="{show: logo}">
        <strong>AutoInsight</strong>
        <span>汽车行业数据智能分析与决策平台</span>
      </div>
    </div>
    <button @click="finish">SKIP</button>
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref} from 'vue'
import sideCar from '@/assets/intro/car-side.svg'
import frontCar from '@/assets/intro/car-front.svg'

const emit = defineEmits(['complete'])
const done = ref(false)
const started = ref(false)
const rotate = ref(false)
const crash = ref(false)
const logo = ref(false)

function finish(){
  done.value = true
  emit('complete')
}

onMounted(()=>{
  setTimeout(()=>started.value=true,300)
  setTimeout(()=>rotate.value=true,2600)
  setTimeout(()=>crash.value=true,5000)
  setTimeout(()=>logo.value=true,6500)
  setTimeout(()=>finish(),9500)
})
</script>

<style scoped>
.intro{position:fixed;inset:0;background:#fff;z-index:99999;overflow:hidden;transition:opacity .8s}
.hide{opacity:0;pointer-events:none}
.stage{width:100%;height:100%;position:relative;perspective:1800px}
.car{position:absolute;left:50%;top:50%;object-fit:contain;transform-origin:center;will-change:transform,opacity,filter}
.side{width:min(75vw,1000px);height:340px;transform:translate(-150vw,-50%)}
.side.drive{animation:drive 2.2s cubic-bezier(.2,.8,.2,1) forwards}
.side.disappear{opacity:0;transform:translate(-50%,-50%) rotateY(80deg) scale(.9)}
.front{width:min(80vw,1100px);height:550px;opacity:0;transform:translate(-50%,-50%) rotateY(-90deg) scale(.85)}
.front.enter{animation:cameraTurn 1.7s cubic-bezier(.2,.7,.1,1) forwards;opacity:1}
.front.rush{animation:rush 1.2s cubic-bezier(.5,0,1,.5) forwards}
@keyframes drive{to{transform:translate(-50%,-50%)}}
@keyframes cameraTurn{to{transform:translate(-50%,-50%) rotateY(0) scale(1)}}
@keyframes rush{to{transform:translate(-50%,-50%) scale(8);filter:blur(18px);opacity:.2}}
.speed-lines{position:absolute;inset:0;opacity:0;background:linear-gradient(90deg,transparent,#eee,transparent);transform:scaleX(.2)}
.speed-lines.active{animation:speed .8s forwards}
@keyframes speed{to{opacity:.8;transform:scaleX(3)}}
.flash{position:absolute;inset:0;background:#fff;opacity:0}.flash.active{animation:flash .45s}
@keyframes flash{50%{opacity:1}}
.particles{position:absolute;inset:0;opacity:0;background-image:radial-gradient(#111 1px,transparent 1.5px);background-size:9px 9px;transform:scale(.5)}
.particles.active{animation:form 1.8s forwards}
@keyframes form{to{opacity:.18;transform:scale(1)}}
.brand{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;opacity:0;letter-spacing:8px}
.brand.show{animation:brand 1.2s forwards}
@keyframes brand{to{opacity:1}}
.brand strong{font:900 100px Arial;letter-spacing:-4px}
.brand span{margin-top:25px;color:#666}
button{position:absolute;right:30px;bottom:30px;background:none;border:0;color:#888}
</style>
