<template>
  <p :class="getClass(message)">
     <span v-show="editedMessage && editedMessage.messageId === message.id">
       <div class="icons">
          <i class="icon-pencil" @click="m2EditMessage"></i>
          <i class="icon-trash-circled" @click="m2DeleteMessage"></i>
          <i class="icon-cancel" @click="m2Close"></i>
       </div>
    </span>
      <span class="message-header">
        <span class="timeMess">({{getTime(message.time)}})</span>
        <span>{{allUsers[message.userId].user}}</span>: </span>
    <span class="message-text-style" v-html="encoded" ref="content" @contextmenu="contextmenu"></span>
  </p>
</template>
<script lang="ts">
  import {Getter, State, Mutation} from "vuex-class";
  import {Component, Prop, Vue} from "vue-property-decorator";
  import {CurrentUserInfo, EditingMessage, MessageModel, RoomModel, UserModel} from "../../types";
  import {channelsHandler, globalLogger, ws} from "../../utils/singletons";
  import {encodeHTML, encodeMessage, highlightCode, setVideoEvent, setYoutubeEvent} from "../../utils/htmlApi";


  const ONE_DAY = 24 * 60 * 60 * 1000;

  @Component
  export default class ChatMessage extends Vue {

    @State userInfo: CurrentUserInfo;
    @Prop() message: MessageModel;
    @State allUsers: { [id: number]: UserModel };
    @State editedMessage : EditingMessage;
    @Mutation setEditedMessage;


    $refs: {
      content: HTMLElement
    };

    getTime(timeMillis: number) {
      let date = new Date(timeMillis);
      return [this.sliceZero(date.getHours()), this.sliceZero(date.getMinutes()), this.sliceZero(date.getSeconds())].join(":");
    }

    get encoded() {
      return this.message.content ? encodeMessage(this.message) : encodeHTML("This message has been removed");
    }

    m2Close() {
      this.setEditedMessage(null);
    }

    m2DeleteMessage() {
      ws.sendDeleteMessage(this.message.id);
      this.setEditedMessage(null);
    }

    m2EditMessage() {
      this.setEditedMessage({messageId: this.message.id, isEditingNow: true});
    }

    contextmenu(event) {
      if (!this.message.deleted && this.isSelf && this.message.time + ONE_DAY > Date.now()) {
        this.setEditedMessage(null);
        event.preventDefault();
        event.stopPropagation();
        this.setEditedMessage({messageId: this.message.id, isEditingNow: false});
      }
      globalLogger.debug("Context menu for {}", event.target)();
    }

    updated() {
      this.setEvents();
    }

    created() {
      this.setEvents();

    }

    private setEvents() {
      this.$nextTick(function () {
        if (this.userInfo.highlightCode) {
          highlightCode(this.$refs.content);
        }
        if (this.userInfo.embeddedYoutube) {
          setYoutubeEvent(this.$refs.content)
        }
        setVideoEvent(this.$refs.content);
      })
    }

    encodeMessage(message: MessageModel) {
      return encodeMessage(message);
    }

    getClass(message: MessageModel) {
      let strings = [this.isSelf ? "message-self" : "message-others"];
      if (message.deleted) {
        strings.push('removed-message');
      }
      if (this.isEditing) {
        strings.push('highLightMessage');
      }
      return strings;
    }

    get isSelf() {
      return this.message.userId === this.userInfo.userId;
    }

    get isEditing() {
      return this.editedMessage && this.editedMessage.messageId === this.message.id;
    }

    sliceZero(number: number, count: number = -2) {
      return String("00" + number).slice(count);
    }
  }
</script>
<style lang="sass" scoped>

  .icons
    position: absolute
    right: 0
    top: 6px
    font-size: 25px
    > *
      padding: 0 5px


  $img-path: "../../assets/img"
  @import "partials/mixins"
  @import "partials/abstract_classes"

  @mixin margin-img
    margin: 5px 0 0 15px

  @mixin margin-img-def
    max-width: calc(100% - 25px)
    max-height: 400px
    display: block

  .highLightMessage
    border: 1px solid grey
    border-radius: 3px
    margin-right: 6px
    padding: 10px 150px 10px 10px


  .removed-message .message-text-style
    color: #5d5d5d
    text-decoration: line-through

  %img-play-chat
    @extend %user-select-none
    display: block
    @include margin-img
    > div
      position: relative
      display: inline-block
      zoom: 1
      &:not(:hover)
        -webkit-filter: brightness(90%)

      img
        @include margin-img-def
      .icon-youtube-play
        position: absolute
        z-index: 13
        top: 50%
        left: 50%
        margin-top: -50px
        margin-left: -55px
        font-size: 50px
        color: black
        height: 100px
        width: 100px
        @media screen and (max-width: $collapse-width)
          margin-top: -35px
          margin-left: -45px
          height: 70px
          width: 70px

  .message-text-style

    /deep/ .youtube-player
      @extend %img-play-chat
      @extend %img-play
    /deep/ .video-player
      @extend %img-play-chat
      @extend %img-play

    /deep/ :visited
      color: #7572CF
    /deep/ :link
      color: #729fcf
    /deep/ a
      &:hover
        text-decoration: underline

    /deep/ img[code]
      @extend %img-code

    /deep/ .quote
      border-left: 5px solid #4d4d4d
      padding-left: 5px
      margin: 5px
      span
        font-weight: bold
    /deep/ pre
      margin: 10px
      max-width: calc(100% - 15px)
      overflow-x: auto

    /deep/ .video-player-ready
      border: none
      @include margin-img-def
      width: 500px
      height: 350px
      @include margin-img

    /deep/ .giphy
      position: relative
      img
        @include margin-img-def
        @include margin-img
      &:not(:hover) .giphy_hover
        display: none
      .giphy_hover
        bottom: 5px
        position: absolute
        left: 20px
        width: 100px
        height: 36px

    .B4j2ContentEditableImg
      @include margin-img-def
      @include margin-img
  p
    margin-top: 0.8em
    margin-bottom: 0.8em

  .message-header
    font-weight: bold

  .message-self, .message-others
    position: relative

  .color-lor p /deep/, .color-reg p /deep/
    @import "~highlightjs/styles/railscasts"
  .color-white p /deep/
    @import "~highlightjs/styles/default"

  .color-lor
    .icons
      color: grey
    .message-others .message-header
      color: #729fcf
    .message-self .message-header
      color: #e29722
    .message-system .message-header
      color: #9DD3DD

  .color-reg
    .icons > *
      cursor: pointer
      @include hover-click(#bdbdce)
    .message-others .message-header
      color: #729fcf
    .message-self .message-header
      color: #e29722
    .message-system .message-header
      color: #84B7C0

  .color-white
    .icons
      color: black
    .highLightMessage
      border: 1px solid #3f3f3f
      box-shadow: 0 4px 8px 0 rgba(0,0,0,0.5), 0 3px 10px 0 rgba(0,0,0,0.5)
    .message-others
      background-color: white
</style>