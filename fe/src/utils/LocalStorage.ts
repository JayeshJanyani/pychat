import {Logger} from './Logger';

export default class LocalStorage implements IStorage {

  private logger: Logger;
  private STORAGE_NAME = 'wsHeaderIds';
  private cache = {};


  constructor(logger: Logger) {
    this.logger = logger;
    let ms = localStorage.getItem(this.STORAGE_NAME);
    if (ms) {
      let loaded = JSON.parse(ms);
      for (let k in loaded) {
        this.cache[k] = {
          h: loaded[k],
          f: loaded[k]
        };
      }
    } else {
      localStorage.setItem(this.STORAGE_NAME, `{}`);
    }
  }

  public getIds(cb: ObjectCb) {
    cb(this.cache);
  }

  public saveMessage(message: MessageModel) {
    this.setRoomHeaderId(message.roomId, message.id);
  }

  saveMessages(messages: MessageModel[]) {
    messages.forEach((message) => {
      this.applyCache(message.roomId, message.id);
    });
    let lm = JSON.parse(localStorage.getItem(this.STORAGE_NAME));
    for (let k in this.cache) {
      if (!lm[k] || this.cache[k].h < lm[k]) {
        lm[k] = this.cache[k].h;
      }
    }
    localStorage.setItem(this.STORAGE_NAME, JSON.stringify(lm));
  }

  public deleteMessage(id: number) {

  }

  public clearStorage() {
    localStorage.setItem(this.STORAGE_NAME, '{}');
    this.cache = {};
  }

  public getRoomHeaderId(roomId: number, cb: NumberCb) {
    cb(this.cache[roomId] ? this.cache[roomId].h : null);
  }

  private applyCache(roomId, value) {
    if (!this.cache[roomId]) {
      this.cache[roomId] = {
        h: value,
        f: value
      };
    } else if (value < this.cache[roomId].h) {
      this.cache[roomId].h = value;
    } else if (value > this.cache[roomId].f) {
      this.cache[roomId].f = value;
    } else {
      return true;
    }
  }

  public setRoomHeaderId(roomId: number, value: number) {
    if (!this.applyCache(roomId, value)) {
      this.saveJson(roomId, value);
    }
  }

  private saveJson(roomId: number, value: number) {
    let lm = JSON.parse(localStorage.getItem(this.STORAGE_NAME));
    if (!lm[roomId] || value < lm[roomId]) {
      lm[roomId] = value;
      this.logger.debug('Updating headerId {} -> {} for room {}. LS: {}', lm[roomId], value, roomId, lm)();
      localStorage.setItem(this.STORAGE_NAME, JSON.stringify(lm));
    } else {
      this.logger.debug('Loaded header ids for room {} from local storage {} . Update is not needed since stored header {} is lower than current ', roomId, lm, lm[roomId], value)();
    }
  }

  connect(cb: Function) {
    cb(true);
  }
}