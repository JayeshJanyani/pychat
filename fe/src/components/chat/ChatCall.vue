<template>
  <div class="callContainer" v-show="callInfo.callContainer">
    <div class="callContainerContent" :class="{fullscreen}">
      <div class="videoContainer" ref="videoContainer">
        <div class="icon-webrtc-cont">
          <i class="icon-webrtc-novideo" @click="videoClick" :class="callInfo.showVideo ? 'activeIcon' : 'noactiveIcon'" title="Turn on your webcam"></i>
          <i class="icon-webrtc-mic" :class="callInfo.showMic ? 'activeIcon' : 'noactiveIcon'" title="Turn off your microphone" @click="micClick"></i>
          <i class="icon-webrtc-minimizedscreen" title="Exit fullscreen" @click="exitFullscreen"></i>
          <i class="icon-webrtc-hangup" @click="hangUpCall" title="Hang up"></i>
          <i class="icon-no-desktop" @click='desktopClick' :class="callInfo.shareScreen ? 'activeIcon' : 'noactiveIcon'" title="Capture your desktop screen and start sharing it"></i>
        </div>
        <div class="micVideoHolder">
          <chat-remote-peer v-for="(call, id) in callInfo.calls" :call-info="call" :key="id"/>
          <video muted="muted" class="localVideo" ref="localVideo" :src="callInfo.localStreamSrc"></video>
        </div>
        <progress max="15" :value="callInfo.currentMicLevel" title="Your microphone level" class="microphoneLevel"></progress>
      </div>
      <table class="settingsContainer" v-show="showSettings">
        <tbody>
        <tr>
          <td>
            <i class="icon-quote-left"></i>
            <span class="callInfo">Call info</span>
          </td>
        </tr>
        <tr>
          <td>
            <i class="icon-volume-2"></i>
            <select class="input" :value="callInfo.currentSpeaker" @change="setCurrentSpeakerProxy">
              <option v-for="(speaker, id) in speakers" :key="id" :value="id">{{speaker}}</option>
            </select>
            <span class="playTestSound" @click="playTest">Play test sound</span>
          </td>
        </tr>
        <tr>
          <td>
            <i class="icon-videocam"></i>
            <select class="input" :value="callInfo.currentWebcam" @change="setCurrentWebcamProxy">
              <option v-for="(webcam, id) in webcams" :key="id" :value="id">{{webcam}}</option>
            </select>
          </td>
        </tr>
        <tr>
          <td>
            <i class="icon-mic"></i>
            <select class="input" :value="callInfo.currentMic" @change="setCurrentMicProxy">
              <option v-for="(mic, id) in microphones" :key="id" :value="id">{{mic}}</option>
            </select>
          </td>
        </tr>
        </tbody>
      </table>
      <div class="callContainerIcons">
        <div class="callContainerIconsInner">
          <i class="icon-phone-circled" v-show="!callInfo.callActive" @click="startCall"></i>
          <i :class="iconMicClass" :title="micTitle" @click="micClick"></i>
          <i :class="iconVideoClass" :title="videoTitle" @click="videoClick"></i>
          <i class="icon-desktop" :class="callInfo.shareScreen ? 'activeIcon' : 'noactiveIcon'"
             title="Capture your desktop screen and start sharing it" @click="desktopClick"></i>
          <i class="icon-cog" @click="showSettings = !showSettings"></i>
          <div class="enterFullScreenHolder" @click="enterFullscreen" v-show="callInfo.callActive">
            <i class="icon-webrtc-fullscreen" title="Fullscreen"></i>
          </div>
          <div class="hangUpHolder" v-show="callInfo.callActive">
            <i class="icon-hang-up" @click="hangUpCall" title="Hang up"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
  import {State, Action, Mutation, Getter} from "vuex-class";
  import {Component, Prop, Vue, Watch} from "vue-property-decorator";
  import {CallInfoModel, CallsInfoModel} from "../../types/model";
  import {BooleanIdentifier, StringIdentifier, VideoType} from "../../types/types";
  import {webrtcApi} from '../../utils/singletons';
  import ChatRemotePeer from './ChatRemotePeer';
  import {file} from '../../utils/audio';
  @Component({
    components: {ChatRemotePeer}
  })
  export default class ChatCall extends Vue {
    @Prop() callInfo: CallsInfoModel;
    @Prop() roomId: number;
    showSettings: boolean = false;
    @Mutation setMicToState;
    @Mutation setVideoToState;
    @Mutation setShareScreenToState;
    @Mutation setCurrentWebcam;
    @Mutation setCurrentSpeaker;
    @Mutation setCurrentMic;

    @Action growlError;

    @State microphones: { [id: string]: string };
    @State speakers: { [id: string]: string };
    @State webcams: { [id: string]: string };
    fullscreen: boolean = false;


    fullScreenChange(event) {
      this.logger.log("fs change")();
      if (!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullscreenElement || document.msFullscreenElement)) {
        this.fullscreen = false;
      }
    }

    created() {
      ['webkitfullscreenchange', 'mozfullscreenchange', 'fullscreenchange', 'MSFullscreenChange'].forEach(e => {
        document.addEventListener(e, this.listener, false);
      })
    }

    listener = this.fullScreenChange.bind(this);

    destroyed() {
      ['webkitfullscreenchange', 'mozfullscreenchange', 'fullscreenchange', 'MSFullscreenChange'].forEach(e => {
        document.removeEventListener(e, this.listener, false);
      })
    }

    @Watch('callInfo.localStreamSrc')
    onLocalStreamChange(newValue) {
      this.$nextTick(function () {
        if (newValue) {
          this.$refs.localVideo.play();
        } else {
          this.$refs.localVideo.pause();
        }
      })
    }

    exitFullscreen() {
      if (document.cancelFullScreen) {
        document.cancelFullScreen();
      } else if (document.msCancelFullScreen) {
        document.msCancelFullScreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen();
      }
      this.fullscreen = false;
    }

    enterFullscreen() {
      let elem: HTMLElement = this.$refs.videoContainer;
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen()
      } else {
        this.growlError("Can't enter fullscreen");
        return;
      }
      this.fullscreen = true;
    }

    @Watch('callInfo.currentSpeaker')
    onSpeakerChange(newValue) {
      this.$nextTick(function () {
        if (this.$refs.localVideo['setSinkId']) {
          this.$refs.localVideo['setSinkId'](newValue);
        } else  {
          this.logger.error("SetSinkId doesn't exist")();
        }
      })
    }


    $refs: {
      localVideo: HTMLVideoElement,
      videoContainer: HTMLElement,
    };

    setCurrentMicProxy(event) {
      let payload: StringIdentifier = {
        id: this.roomId,
        state: event.target.value
      };
      this.setCurrentMic(payload);
      if (this.callInfo.callActive) {
        webrtcApi.updateConnection(this.roomId);
      }
    }
    setCurrentWebcamProxy(event) {
      let payload: StringIdentifier = {
        id: this.roomId,
        state: event.target.value
      };
      this.setCurrentWebcam(payload);
      if (this.callInfo.callActive) {
        webrtcApi.updateConnection(this.roomId);
      }
    }

    playTest() {
      if (file['setSinkId']) {
        file['setSinkId'](this.callInfo.currentSpeaker);
        file.pause();
        file.currentTime = 0;
        file.volume = 1;
        var prom = file.play();
        prom && prom.catch(function (e) {
        });
      } else {
        this.growlError("Your browser doesn't support changing output channel")
      }
    }

    setCurrentSpeakerProxy(event) {
      let payload: StringIdentifier = {
        id: this.roomId,
        state: event.target.value
      };
      this.setCurrentSpeaker(payload);
      if (this.callInfo.callActive) {
        webrtcApi.updateConnection(this.roomId);
      }
    }

    get iconMicClass () : {} {
      return {
        'icon-mic': this.callInfo.showMic,
        'icon-mute': !this.callInfo.showMic,
      }
    }

    get videoTitle() {
      return `Turn ${this.callInfo.showVideo ? 'off': 'on'} your webcam`
    }

    get micTitle() {
      return `Turn ${this.callInfo.showMic ? 'off': 'on'} your microphone`
    }

    startCall() {
      webrtcApi.startCall(this.roomId);
    }

    hangUpCall() {
      webrtcApi.hangCall(this.roomId);
      this.fullscreen = false;
      this.exitFullscreen();
    }

    get iconVideoClass () : {} {
      return {
        'icon-no-videocam': !this.callInfo.showVideo,
        'icon-videocam': this.callInfo.showVideo,
      }
    }

    desktopClick() {
      let payload: BooleanIdentifier = {
        state: !this.callInfo.shareScreen,
        id: this.roomId,
      };
      this.setShareScreenToState(payload);
      if (this.callInfo.callActive) {
        webrtcApi.toggleDevice(this.roomId, VideoType.SHARE);
      }
    }

    videoClick() {
      let payload: BooleanIdentifier = {
        state: !this.callInfo.showVideo,
        id: this.roomId,
      };
      this.setVideoToState(payload);
      if (this.callInfo.callActive) {
        webrtcApi.toggleDevice(this.roomId, VideoType.VIDEO);
      }
    }

    micClick() {
      let payload: BooleanIdentifier = {
        state: !this.callInfo.showMic,
        id: this.roomId,
      };
      this.setMicToState(payload);
      if (this.callInfo.callActive) {
        webrtcApi.toggleDevice(this.roomId, VideoType.AUDIO);
      }
    }

  }
</script>

<style lang="sass" scoped>

  @import "partials/mixins.sass"

  .icon-mic, .icon-videocam, .activeIcon, .icon-phone-circled
    cursor: pointer
    @include hover-click(#3aa130)

  .icon-mute, .icon-no-videocam, .noactiveIcon, .icon-hang-up
    cursor: pointer
    @include hover-click(#c72727)

  .icon-cog, .icon-webrtc-fullscreen
    cursor: pointer
    @include hover-click(#2a8f9c)

  .localVideo
    position: absolute
    max-width: 35%
    max-height: 35%
    background: #555
    margin-bottom: 4px

  select
    padding: 5px 5px 5px 25px
  .inactive .icon-webrtc-cont > i
    transform: translateX(calc(-2vw - 70px))
    @include transition(all 0.1s ease-in-out)

  .fullscreen
    &.videoContainer
      background-color: black

    /deep/ .micVideoWrapper > video
      max-height: 99vh
      height: 99vh

    &.videoContainer video
      border-color: #272727
    .icon-webrtc-cont
      display: block

  .callContainerContent
    padding: 5px
    display: inline-block
    min-width: 150px
  .callContainer
    border-right: 7.5px solid #1a1a1a
    display: inline-block
    max-width: 100%
    text-align: center

    label
      cursor: pointer

  .callContainerIcons
    display: flex
    flex-direction: column
    font-size: 25px
    @extend %user-select-none
    width: 100%
    padding-top: 10px

    .callContainerIconsInner
      display: flex
      justify-content: space-between

    .hangUpHolder
      display: inline-block
      position: relative
      width: 46px
      height: 28px
      margin-left: 10px
      margin-top: -7px
      .icon-hang-up
        position: absolute
        font-size: 35px
        top: 0
        left: 0

  .videoContainer
    min-height: 100px
    position: relative
    width: 100%
    text-align: center

    video
      background: #272C2D
      border: 1px solid grey

  .icon-webrtc-cont
    display: none
    z-index: 1 // override webrtc fullscreen z-index
    position: absolute

    bottom: 2vh
    left: 2vw
    i:hover, .icon-webrtc-mic, .icon-webrtc-video, .icon-desktop
      &:before
        opacity: 1
        color: white
        box-shadow: 6px 6px 36px #666
    .activeIcon:before
      background-color: rgba(88, 143, 255, 0.6)
    i.icon-desktop, i.icon-no-desktop
      font-size: 25px
      &:before
        padding-top: 13px !important
        padding-bottom: 3px !important
    i.icon-webrtc-hangup:hover:before
      background: rgba(217, 24, 24, 0.6)
    > i
      display: block
      font-size: 36px
      opacity: 1
      cursor: pointer

      &:before
        border-radius: 50%
        width: 36px
        height: 36px
        padding: 8px
        background: rgba(102, 102, 102, 0.6)
        text-align: center
        box-shadow: 3px 3px 12px #444
        color: white
        margin: 7px 30px 15px 7px

  .icon-webrtc-fullscreen
    position: absolute
    left: -30px
    font-size: 40px
    top: -10px
  .enterFullScreenHolder
    position: relative
    display: inline
    margin-left: 20px
    padding-left: 5px

  .settingsContainer
    width: 200px
    margin: auto
    .callInfo
      padding-left: 20px
      display: block
    .playTestSound
      color: grey
      display: block
      font-size: 12px
      text-align: left
      padding-left: 10px
      &:hover
        color: #d7d7d7
        cursor: pointer
    td
      position: relative
      padding: 3px
      select
        width: 200px
        padding-left: 30px
      [class^='icon-']
        position: absolute
        top: 7px
        left: 5px
        color: #24768e !important


  =microphone-after
    background-color: rgb(28, 30, 29)
    border-radius: 3px

  =microphone-progress
    border-radius: 3px 0 0 3px

  progress
    bottom: 0
    position: absolute

  .microphoneLevel
    display: flex
    $color: #4b9637
    $height: 6px
    $transition-time: all 0.1s
    height: $height
    @include appearance(none)
    width: 100%
    background-size: auto
    border: solid 1px
    box-shadow: 0 1px 1px rgba(250, 255, 253, 0.2),  inset 0 1px 1px rgba(0, 0, 0, 0.41)
    border-color: #0c0d0f #1b1c1e #222423
    +microphone-after
    &::-webkit-progress-value
      background-image: -webkit-linear-gradient(darken($color, 20%), lighten($color, 15%) 30%, darken($color, 15%) 100%)
      -webkit-transition: $transition-time
      +microphone-progress
    &::-moz-progress-bar
      background-image: -moz-linear-gradient(darken($color, 20%), lighten($color, 15%) 30%, darken($color, 15%) 100%)
      -moz-transition: $transition-time
      +microphone-progress
    &::-webkit-progress-bar
      +microphone-after
      border: none
    @-moz-document url-prefix()
      height: $height - 2px

  .micVideoWrapper
    display: inline-block
    position: relative
    margin: 1px
    $color: rgba(24, 24, 25, 0.82)
    %asbolute
      z-index: 1
      position: absolute
      background-color: $color
      box-shadow: 0 0 6px 6px $color
      border-radius: 6px
      display: none
    video
      max-height: calc(60vh - 120px)
      max-width: 100%
      background-color: #630000
      &.connected
        background-color: #165620
    > div
      @extend %asbolute
      bottom: 5px
      left: calc(50% - 55px)
    > span
      @extend %asbolute
      top: calc(5px + 10%)
      font-size: 20px
      left: 50%
      transform: translateX(-50%)
    &:hover
      div, span
        display: block

  .micVideoHolder /deep/
    @mixin selectIfHasAmountOfChild($child) // renders style depending on amount of children
      $realChild: $child +1
      // select first element, and nth element from the end
      // if it's the same element, e.g. 321 , if 3rd element from the end = first element then container has 3 elements
      // note selector applies to all siblings with class .micVideoWrapper
      .micVideoWrapper:first-child:nth-last-child(#{$realChild}), .micVideoWrapper:first-child:nth-last-child(#{$realChild}) ~ .micVideoWrapper
        @content

    @mixin selectVideoIfhasAmountOfChild($child) // renders style depending on amount of children
      $realChild: $child +1
      .micVideoWrapper:first-child:nth-last-child(#{$realChild}) ~ video
        @content

    @mixin selectNthIfHasAmountOfChildren($amountOfChild, $nth)
      .micVideoWrapper:first-child:nth-last-child(#{$amountOfChild +1}) ~ .micVideoWrapper:nth-child(#{$nth})
        @content

    //default
    .micVideoWrapper
      max-width: calc(33% - 5px)

    //1
    @include selectIfHasAmountOfChild(1)
      max-width: 100%

    @include selectVideoIfhasAmountOfChild(1)
      bottom: 0
      right: 0
    //2
    @include selectIfHasAmountOfChild(2)
      max-width: calc(50% - 5px)

    @include selectVideoIfhasAmountOfChild(2)
      bottom: 0
      left: 50%
      transform: translateX(-50%)

    //3
    @include selectIfHasAmountOfChild(3)
      max-width: calc(50% - 5px)
      display: table-cell

    @include selectVideoIfhasAmountOfChild(3)
      bottom: 0
      right: 0

    @include selectNthIfHasAmountOfChildren(3,3)
      margin-right: calc(50% - 2px)

    //4
    @include selectIfHasAmountOfChild(4)
      max-width: calc(50% - 5px)
      display: inline-block

    @include selectVideoIfhasAmountOfChild(4)
      top: 50%
      left: 50%
      transform: translate(-50%, -50%)

    //5
    @include selectIfHasAmountOfChild(5)
      max-width: calc(50% - 5px)
      display: inline-block

    @include selectNthIfHasAmountOfChildren(5,5)
      margin-right: calc(50% - 2px)

    @include selectVideoIfhasAmountOfChild(5)
      right: 0
      bottom: 0

    //6
    @include selectIfHasAmountOfChild(6)
      max-width: calc(50% - 5px)
      display: inline-block

    @include selectVideoIfhasAmountOfChild(6)
      left: 50%
      transform: translateX(-50%)
      bottom: 0

    //7
    @include selectIfHasAmountOfChild(7)
      max-width: calc(33% - 6px)
      display: inline-block

    @include selectVideoIfhasAmountOfChild(7)
      right: 0
      bottom: 0

    @include selectNthIfHasAmountOfChildren(7, 7)
      margin-right: calc(66% - 4px)

    //8
    @include selectIfHasAmountOfChild(8)
      max-width: calc(33% - 6px)
      display: inline-block

    @include selectVideoIfhasAmountOfChild(8)
      right: 0
      bottom: 0

    @include selectNthIfHasAmountOfChildren(8,8)
      margin-right: calc(33% - 2px)

    //9
    @include selectIfHasAmountOfChild(9)
      max-width: calc(33% - 6px)
      display: inline-block

    @include selectVideoIfhasAmountOfChild(9)
      left: 33%
      max-height: 20%
      transform: translateX(-50%)
      bottom: 0
</style>