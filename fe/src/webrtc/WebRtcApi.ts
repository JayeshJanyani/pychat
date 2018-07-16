import loggerFactory from '../utils/loggerFactory';
import {Logger} from 'lines-logger';
import {SetReceivingFileStatus} from '../types/types';
import {DefaultMessage, OfferFile, WebRtcSetConnectionIdMessage} from '../types/messages';
import WsHandler from '../utils/WsHandler';
import {ReceivingFile, FileTransferStatus, RootState, SendingFile} from '../types/model';
import {Store} from 'vuex';
import FileSender from './FileSender';
import NotifierHandler from '../utils/NotificationHandler';
import {browserVersion, webrtcApi} from '../utils/singletons';
import MessageHandler from '../utils/MesageHandler';
import {sub} from '../utils/sub';
import {MAX_ACCEPT_FILE_SIZE_WO_FS_API} from '../utils/consts';
import {faviconUrl, requestFileSystem} from '../utils/htmlApi';
import {bytesToSize} from '../utils/utils';
import FileReceiverPeerConnection from './FileReceiveerPeerConnection';
import Subscription from '../utils/Subscription';

export default class WebRtcApi extends MessageHandler {

  protected logger: Logger;

  private wsHandler: WsHandler;
  private store: Store<RootState>;
  private notifier: NotifierHandler;

  constructor(ws: WsHandler, store: Store<RootState>, notifier: NotifierHandler) {
    super();
    sub.subscribe('webrtc', this);
    this.wsHandler = ws;
    this.notifier = notifier;
    this.logger = loggerFactory.getLogger('WEBRTC', 'color: #960055');
    this.store = store;
  }

  protected readonly handlers: { [p: string]: SingleParamCB<DefaultMessage> }  = {
    offerFile: this.onofferFile
  };

  private onofferFile(message: OfferFile) {
    let limitExceeded = message.content.size > MAX_ACCEPT_FILE_SIZE_WO_FS_API && !requestFileSystem;
    let payload: ReceivingFile = {
      roomId: message.roomId,
      opponentWsId: message.opponentWsId,
      anchor: null,
      status: limitExceeded ? FileTransferStatus.ERROR : FileTransferStatus.NOT_DECIDED_YET,
      userId: message.userId,
      error: limitExceeded ? `Your browser doesn't support receiving files over ${bytesToSize(MAX_ACCEPT_FILE_SIZE_WO_FS_API)}` : null,
      connId: message.connId,
      fileName: message.content.name,
      time: message.time,
      upload: {
        uploaded: 0,
        total: message.content.size
      }
    };
    this.notifier.showNotification(this.store.state.allUsersDict[message.userId].user, {
      body: `Sends file ${message.content.name}`,
      requireInteraction: true,
      icon: faviconUrl
    });
    this.store.commit('addReceivingFile', payload);
    this.wsHandler.replyFile(message.connId, browserVersion);
    if (!limitExceeded) {
      new FileReceiverPeerConnection(message.roomId, message.connId, message.opponentWsId, this.wsHandler, this.store, message.content.size);
    }
  }


  acceptFile(connId: string, webRtcOpponentId: string) {
    sub.notify({action: 'acceptFileReply', handler: Subscription.getPeerConnectionId(connId, webRtcOpponentId)});

  }

  declineSending(connId: string, webRtcOpponentId: string) {
    sub.notify({action: 'declineSending', handler: Subscription.getPeerConnectionId(connId, webRtcOpponentId)});
  }

  declineFile(connId: string, webRtcOpponentId: string) {
    sub.notify({action: 'declineFileReply', handler: Subscription.getPeerConnectionId(connId, webRtcOpponentId)});
  }

  offerFile(file, channel) {
    if (file.size > 0) {
      this.wsHandler.offerFile(channel, browserVersion, file.name, file.size, (e: WebRtcSetConnectionIdMessage) => {
        if (e.connId) {
          new FileSender(channel, e.connId, this.wsHandler, this.notifier, this.store, file, e.time);
        }
      });
    } else {
      this.store.dispatch('growlError', `File ${file.name} size is 0. Skipping sending it...`);
    }
  }

  public retryFile(connId: string, webRtcOpponentId: string) {
    sub.notify({action: 'retryFileReply', handler: Subscription.getPeerConnectionId(connId, webRtcOpponentId)});

  }
}