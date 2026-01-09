<template>
	<div class="yin-yang-loader">
	  <div class="yin-yang">
	    <div class="dot white"></div>
	    <div class="dot black"></div>
	  </div>
	</div>

</template>

<script>
</script>

<style scoped>
	.yin-yang-loader {
	  display: flex;
	  justify-content: center;
	  align-items: center;
	  min-height: 100rrpx;
	}
	.yin-yang {
	  width: 120rpx;
	  height: 120rpx;
	  border-radius: 50%;
	  background: linear-gradient(90deg, white 50%, black 50%);
	  animation: rotate 4s linear infinite;
	  position: relative;
	  box-shadow: 0 0 20rpx rgba(0, 0, 0, 0.15);
	}
	.yin-yang::before,
	.yin-yang::after {
	  content: "";
	  position: absolute;
	  width: 60rpx;
	  height: 60rpx;
	  border-radius: 50%;
	  left: 50%;
	  transform: translateX(-50%);
	}
	.yin-yang::before {
	  top: 0;
	  background: black;
	}
	.yin-yang::after {
	  bottom: 0;
	  background: white;
	}
	.dot {
	  position: absolute;
	  width: 18rpx;
	  height: 18rpx;
	  border-radius: 50%;
	  left: 50%;
	  transform: translateX(-50%);
	  z-index: 1;
	}
	.dot.white {
	  background: white;
	  top: 30rpx;
	}
	.dot.black {
	  background: black;
	  bottom: 30rpx;
	}
	@keyframes rotate {
	  from {
	    transform: rotate(0deg);
	  }
	  to {
	    transform: rotate(360deg);
	  }
	}
	.yin-yang {
	  transition: box-shadow 0.3s ease;
	}
	
	.yin-yang:hover {
	  box-shadow: 0 0 30rpx rgba(0, 0, 0, 0.2);
	}
	@keyframes pulse {
	  0%,
	  100% {
	    transform: translateX(-50%) scale(1);
	  }
	  50% {
	    transform: translateX(-50%) scale(1.1);
	  }
	}
	.dot {
	  animation: pulse 4s ease-in-out infinite;
	}

</style>