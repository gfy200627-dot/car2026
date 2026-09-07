<template>
<div class="intro" :class="{hide:done}">
  <div class="stage">
    <div class="car side" :class="{drive:started,zoom:crash}"></div>
    <div class="car front" :class="{show:front,zoom:crash}"></div>
    <div class="flash" :class="{on:crash}"></div>
    <div class="particles" :class="{form:logo}"></div>
    <div class="brand" :class="{show:logo}"><b>AutoInsight</b><span>汽车行业数据智能分析与决策平台</span></div>
  </div>
  <button @click="finish">SKIP</button>
</div>
</template>

<script setup lang="ts">
import {onMounted,ref} from 'vue'
const emit=defineEmits(['complete'])
const done=ref(false),started=ref(false),front=ref(false),crash=ref(false),logo=ref(false)
let timer:number
function finish(){done.value=true;emit('complete')}
onMounted(()=>{
 started.value=true
 timer=window.setTimeout(()=>front.value=true,2600)
 window.setTimeout(()=>crash.value=true,5200)
 window.setTimeout(()=>logo.value=true,6800)
 window.setTimeout(finish,9800)
})
</script>

<style scoped>
.intro{position:fixed;inset:0;background:#fff;z-index:99999;overflow:hidden;transition:opacity .7s}.hide{opacity:0;pointer-events:none}.stage{width:100%;height:100%;perspective:1200px;position:relative;overflow:hidden}.car{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background-repeat:no-repeat;background-position:center;background-size:contain;transition:all 2s cubic-bezier(.2,.8,.2,1)}
.side{width:min(70vw,900px);height:300px;background-image:url('/src/assets/intro/car-side.svg');transform:translate(-75vw,-50%)}.side.drive{transform:translate(-50%,-50%)}.side.zoom{transform:translate(-50%,-50%) scale(4);filter:blur(8px)}
.front{width:min(80vw,1000px);height:500px;background-image:url('/src/assets/intro/car-front.svg');opacity:0;transform:translate(-50%,-50%) rotateY(-70deg) scale(.8)}.front.show{opacity:1;transform:translate(-50%,-50%) rotateY(0) scale(1)}.front.zoom{transform:translate(-50%,-50%) scale(6);filter:blur(14px)}
.flash{position:absolute;inset:0;background:#fff;opacity:0;transition:.5s}.flash.on{opacity:1}.particles{position:absolute;inset:0;background:radial-gradient(circle,#111 1px,transparent 2px);background-size:12px 12px;opacity:0;transform:scale(.3);transition:1.5s}.particles.form{opacity:.12;transform:scale(1)}.brand{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;opacity:0;transition:1s}.brand.show{opacity:1}.brand b{font:bold 100px Arial;letter-spacing:-5px}.brand span{margin-top:20px;letter-spacing:8px;color:#555}button{position:absolute;right:30px;bottom:30px;background:none;border:0;color:#888;cursor:pointer}
</style>