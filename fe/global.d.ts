interface RootState {
  isOnline: boolean;
  growls: string[];
}

interface MessageDb {
  id: number;
  time: number;
  content: string;
  symbol: string;
  deleted: number;
  giphy: string;
  edited: number;
  roomId: number;
  userId: number;
}

interface FileModel {
  id: number;
  url: string;
  type: string;
  preview: string;
}

interface MessageModel {
  id: number;
  time: number;
  files: Map<number, FileModel>;
  content: string;
  symbol: string;
  deleted: boolean;
  giphy: string;
  edited: number;
  roomId: number;
  userId: number;
}


interface IStorage {
  getIds(cb: ObjectCb);
  saveMessages(messages: MessageModel[]);
  deleteMessage(id: number);
  clearStorage();
  connect(cb: Function);
  getRoomHeaderId(roomId: number, cb: NumberCb);
  setRoomHeaderId(roomId: number, value: number);
}

interface ObjectCb {
  (t: object): void;
}

interface NumberCb {
  (t: number): void;
}
