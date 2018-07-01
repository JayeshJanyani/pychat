import Xhr from './Xhr';
import {WsHandler} from './WsHandler';
import ChannelsHandler from './ChannelsHandler';
import DatabaseWrapper from './DatabaseWrapper';
import mobile from 'is-mobile';
import LocalStorage from './LocalStorage';
import store from '../store';
import router from '../router';
import Api from './api';
import {IStorage} from '../types/types';
import loggerFactory from './loggerFactory';
import sessionHolder from './sessionHolder';
import {Logger} from 'lines-logger';
import {WS_API_URL, XHR_API_URL} from './consts';

export const xhr: Xhr = new Xhr(XHR_API_URL, sessionHolder);
export const api: Api = new Api(xhr);
export const channelsHandler = new ChannelsHandler(store, api);
export const isMobile = mobile.isMobile();
export const browserVersion = (function() {
  let ua = navigator.userAgent, tem,
      M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
  if (/trident/i.test(M[1])) {
    tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
    return 'IE ' + (tem[1] || '');
  }
  if (M[1] === 'Chrome') {
    tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
    if (tem != null) return tem.slice(1).join(' ').replace('OPR', 'Opera');
  }
  M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
  if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
  return M.join(' ');
})() + (isMobile ? ' mobile' : '');
export const isFirefox = browserVersion.indexOf('Firefox') >= 0;
export const isChrome = browserVersion.indexOf('Chrome') >= 0;
export const storage: IStorage = window.openDatabase ? new DatabaseWrapper('v123x') : new LocalStorage();
export  const globalLogger: Logger = loggerFactory.getLoggerColor('global', '#007a70');
export const ws = new WsHandler(WS_API_URL, sessionHolder, channelsHandler, null, storage, store, router);
channelsHandler.seWsHandler(ws);

