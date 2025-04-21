<template>
  <view class="info">
    <!--    <view class="face" v-if="isFaceText"> {{isFaceText}}</view> -->
    <view class="main main_no_idcard">
      <template v-if="!imgSrc">
        <h5-cameral
          :facing-mode="constraints.video.facingMode"
          :photos-border="props.photosBorder"
          :photos-face-border="props.photosFaceBorder"
        >
        </h5-cameral>

        <tak-button
          v-if="!imgSrc"
          :rout-cameral-type="routCameralType"
          :cameral-type="cameralType"
          @handle-click-take="handleClickTake"
          @handle-click-device="handleClickDevice"
        ></tak-button>
      </template>
    </view>
  </view>
</template>
<script lang="ts" setup>
import { Ref, computed, nextTick, reactive, ref } from 'vue'
import h5Cameral from './h5-cameral.vue'
import takButton from './tak-button.vue'
import jweixin from 'weixin-js-sdk'
import { onLoad, onShow } from '@dcloudio/uni-app'
const props = defineProps({
  fixedWidth: {
    type: Number,
    default: 640,
  },
  fixedHeight: {
    type: Number,
    default: 748,
  },
  photosBorder: {
    type: String,
  },
  photosFaceBorder: {
    type: String,
  },
})
const emits = defineEmits(['tankePhotosImage'])
const imgSrc = ref()
const constraints = reactive({
  audio: false,
  video: {
    // 前置摄像头
    facingMode: 'user',
    height: {},
    width: {},
  },
})
const isShow = ref(false)
const cameralType: Ref<string> = ref('face') // 相机类型
const cameralList = ref([])
const mediaStreamTrack = ref()
const openClick = ref(0)
const windowWidth = ref()
let getUserMedia: {
  call: (
    arg0: Navigator,
    arg1: MediaStreamConstraints | undefined,
    arg2: (value: MediaStream | PromiseLike<MediaStream>) => void,
    arg3: (reason?: any) => void
  ) => void
  then: (arg0: (stream: any) => void) => void
} | null = null
const cameraWid = computed(() => {
  return {
    width: props.fixedWidth,
    height: props.fixedHeight,
  }
})
// 拍照检测是否支持流媒体
const invokingCamera = async () => {
  const mediaDevices = navigator.mediaDevices
  // 一些浏览器部分支持 mediaDevices。不能直接给对象设置 getUserMedia
  //  因为这样可能会覆盖已有的属性。这里只会在没有getUserMedia属性的时候添加它。
  if (navigator.mediaDevices.getUserMedia === undefined) {
    navigator.mediaDevices.getUserMedia = function (constraints) {
      // 首先，如果有getUserMedia的话，就获得它
      getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia

      // 一些浏览器根本没实现它 - 那么就返回一个error到promise的reject来保持一个统一的接口
      if (!getUserMedia) {
        uni.showToast({
          icon: 'error',
          title: '请更换浏览器',
          duration: 3000,
        })
        return Promise.reject(new Error('getUserMedia is not implemented in this browser'))
      }
      getUserMedia.then((stream) => {
        succesDevice(stream)
      })

      // 否则，为老的navigator.getUserMedia方法包裹一个Promise
      return new Promise(function (resolve, reject) {
        getUserMedia.call(navigator, constraints, resolve, reject)
      })
    }

    return
  }

  setDevice() //初始化相机
}
const intDeviceMethods = () => {
  const setDevice = () => {
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(function (stream) {
        succesDevice(stream)
      })
      .catch(function (err) {
        errorDevice(err)
      })
  }
  const succesDevice = (stream: MediaStream | Blob | MediaSource) => {
    mediaStreamTrack.value = stream
    const video: HTMLVideoElement | any = document.querySelector('video')
    // 旧的浏览器可能没有srcObject
    if ('srcObject' in video) {
      video.srcObject = stream
    } else {
      // 防止在新的浏览器里使用它，应为它已经不再支持了
      video.src = window.URL.createObjectURL(stream)
    }
    video.onloadedmetadata = function (e: any) {
      video.play()
    }
    if (isWechatBrowser()) {
      jweixin.ready(() => {
        video.play()
      })
    }
  }
  const errorDevice = (err: { name: any }) => {
    let message
    switch (err.name) {
      case 'NotReadableError':
        if (uni.getSystemInfoSync().model == 'HarmonyOS' && openClick.value) {
          window.location.reload()
        } else {
          message = '设备启动拍照失败,请重启'
          uni.showToast({
            icon: 'error',
            title: message,
            duration: 3000,
          })
        }

        break
      default:
        message = '请开启相机权限'
        uni.showToast({
          icon: 'error',
          title: message,
          duration: 3000,
        })
        break
    }
  }
  return {
    setDevice,
    succesDevice,
    errorDevice,
  }
}
const actionTakMethods = () => {
  const routCameralType = ref(false)
  const handleClickTake = async () => {
    uni.showLoading({})
    await nextTick()
    const canvas = document.createElement('canvas')
    const ctx: CanvasRenderingContext2D | unknown = canvas.getContext('2d')
    const video: HTMLVideoElement | unknown = document.querySelector('video')
    canvas.width = Math.min(video.videoWidth, video.videoHeight)
    canvas.height = Math.max(video.videoWidth, video.videoHeight)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const mirrorImageData = ctx.createImageData(canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    for (let h = 0; h < canvas.height; h++) {
      for (let w = 0; w < canvas.width; w++) {
        const pixel = getPixel(imageData, h, canvas.width - w - 1)
        setPixel(mirrorImageData, h, w, pixel)
      }
    }
    if (constraints.video.facingMode == 'user') {
      ctx.putImageData(mirrorImageData, 0, 0)
    } else {
      ctx.putImageData(imageData, 0, 0)
    }
    await nextTick()
    uni.hideLoading()
    const base64 = canvas.toDataURL('image/jpeg')
    emits('tankePhotosImage', base64)
  }
  const handleClickDevice = async (value) => {
    handlePhotographCloseClick()
    handlePhotographCloseClick() // 执行多次以免有些手机无法关闭
    // 处理部分手机无法切换后置摄像头的处理
    // model.value = 'JER-AN20';
    constraints.video.facingMode = value == 'back' ? 'environment' : 'user'
    routCameralType.value = constraints.video.facingMode == 'environment' ? true : false
    if (uni.getSystemInfoSync().model == 'HarmonyOS') {
      // 部分华为手机需要重新加载页面才能切换摄像头
      // 重定向页面
      //return;
    }

    setTimeout(() => {
      initPhotos()
    }, 500)
  }
  // ****** 镜像处理 ******
  const getPixel = (imageData: any, row: number, column: number) => {
    const uint8ClampedArray = imageData.data
    const width = imageData.width
    const height = imageData.height
    const pixel = []
    for (let i = 0; i < 4; i++) {
      pixel.push(uint8ClampedArray[row * width * 4 + column * 4 + i])
    }
    return pixel
  }
  const setPixel = (imageData, row: number, column: number, pixel) => {
    const uint8ClampedArray = imageData.data
    const width = imageData.width
    const height = imageData.height
    for (let i = 0; i < 4; i++) {
      uint8ClampedArray[row * width * 4 + column * 4 + i] = pixel[i]
    }
  }
  return {
    routCameralType,
    handleClickTake,
    handleClickDevice,
  }
}

// 处理兼容问题
const compatibilityMethods = () => {
  // 判断是否在微信浏览器中的函数
  const isWechatBrowser = () => {
    const ua = navigator.userAgent.toLowerCase()
    return ua.includes('micromessenger')
  }

  // 处理兼容列表的分辨率
  const videoSetPhone = async () => {
    // const { videoModalList, videoModalListKey } = videoModal();
    // let disabledVideoConstraintsDeviceList = /(?=jkm-al00b)/i;
    // if (disabledVideoConstraintsDeviceList.test(platformsUa.value)) {
    // 	constraints.video.width = {};
    // 	constraints.video.height = {};
    // }
  }

  return {
    isWechatBrowser,
    videoSetPhone,
  }
}

const initPhotos = async () => {
  constraints.video.width = { min: 1280, ideal: 3840, max: 3840 }
  constraints.video.height = { min: 720, ideal: 2160, max: 2160 }
  if (constraints.video.facingMode == 'environment') {
    // 期望大于4是存在广角
    if (cameralList.value.length > 4) {
      constraints.video.width = { mix: cameraWid.value.height, ideal: 1440, max: 2160 }
      constraints.video.height = { mix: cameraWid.value.width, ideal: 1920, max: 4096 }
    } else {
      constraints.video.width = { min: 1280, ideal: 3840, max: 3840 }
      constraints.video.height = { min: 720, ideal: 2160, max: 2160 }
    }
    await videoSetPhone()
  }

  await invokingCamera()
}
// 关闭摄像头
const handlePhotographCloseClick = async () => {
  if (mediaStreamTrack.value) {
    new Promise<void>((resolve, reject) => {
      mediaStreamTrack.value.getTracks().forEach((track: any) => {
        track.stop()
      })
      mediaStreamTrack.value = null
      resolve()
    })
  }
}

const { isWechatBrowser, videoSetPhone } = compatibilityMethods()
const { setDevice, succesDevice, errorDevice } = intDeviceMethods()
const { routCameralType, handleClickTake, handleClickDevice } = actionTakMethods()
onShow(async () => {
  imgSrc.value = ''
  isShow.value = true
  const isBack = uni.getStorageSync('_faceTempImageNavigateBack')

  if (isBack) {
    invokingCamera()
  }
})
onLoad(async (e: AnyObject | undefined) => {
  handlePhotographCloseClick()
  if (isWechatBrowser()) {
    jweixin.config({
      debug: false,
      appId: '111',
      timestamp: '111',
      nonceStr: '111',
      signature: '111',
      jsApiList: [],
    })
  }
  windowWidth.value = uni.getSystemInfoSync().safeArea
})

defineExpose({
  initPhotos,
})
</script>
<style>
.info {
  position: absolute;
  top: 51%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.face {
  color: #fff;
  text-align: center;
  margin: 10rpx 0;
}

.main {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
