const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  emails: {
    listInbox: (filter) => ipcRenderer.invoke('emails:listInbox', filter),
    listStarred: () => ipcRenderer.invoke('emails:listStarred'),
    listArchived: () => ipcRenderer.invoke('emails:listArchived'),
    listSent: () => ipcRenderer.invoke('emails:listSent'),
    search: (query) => ipcRenderer.invoke('emails:search', query),
    open: (id) => ipcRenderer.invoke('emails:open', id),
    archive: (ids) => ipcRenderer.invoke('emails:archive', ids),
    delete: (ids) => ipcRenderer.invoke('emails:delete', ids),
    markRead: (ids, read) => ipcRenderer.invoke('emails:markRead', ids, read),
    snooze: (ids, until) => ipcRenderer.invoke('emails:snooze', ids, until),
    unsubscribe: (id) => ipcRenderer.invoke('emails:unsubscribe', id),
    blockSender: (id) => ipcRenderer.invoke('emails:blockSender', id),
    keep: (id) => ipcRenderer.invoke('emails:keep', id),
    star: (id, starred) => ipcRenderer.invoke('emails:star', id, starred),
    quickCleanCandidates: () => ipcRenderer.invoke('emails:quickCleanCandidates'),
    deleteAllFromSender: (senderEmail) => ipcRenderer.invoke('emails:deleteAllFromSender', senderEmail),
  },
  compose: {
    send: (payload) => ipcRenderer.invoke('compose:send', payload),
    reply: (emailId, payload) => ipcRenderer.invoke('compose:reply', emailId, payload),
    forward: (emailId, payload) => ipcRenderer.invoke('compose:forward', emailId, payload),
    polish: (text) => ipcRenderer.invoke('compose:polish', text),
  },
  accounts: {
    list: () => ipcRenderer.invoke('accounts:list'),
    addGmail: () => ipcRenderer.invoke('accounts:addGmail'),
    addOutlook: () => ipcRenderer.invoke('accounts:addOutlook'),
    remove: (id) => ipcRenderer.invoke('accounts:remove', id),
    reconnect: (id) => ipcRenderer.invoke('accounts:reconnect', id),
    getSyncErrors: () => ipcRenderer.invoke('accounts:getSyncErrors'),
  },
  rules: {
    list: () => ipcRenderer.invoke('rules:list'),
    add: (pattern, category) => ipcRenderer.invoke('rules:add', pattern, category),
    remove: (id) => ipcRenderer.invoke('rules:remove', id),
    reorder: (ids) => ipcRenderer.invoke('rules:reorder', ids),
  },
  templates: {
    list: () => ipcRenderer.invoke('templates:list'),
    add: (name, body) => ipcRenderer.invoke('templates:add', name, body),
    remove: (id) => ipcRenderer.invoke('templates:remove', id),
  },
  deepl: {
    rephrase: (text, opts) => ipcRenderer.invoke('deepl:rephrase', { text, opts }),
  },
  settings: {
    getSyncFreq: () => ipcRenderer.invoke('settings:getSyncFreq'),
    setSyncFreq: (v) => ipcRenderer.invoke('settings:setSyncFreq', v),
    getDeeplKey: () => ipcRenderer.invoke('settings:getDeeplKey'),
    setDeeplKey: (key) => ipcRenderer.invoke('settings:setDeeplKey', key),
    getDbInfo: () => ipcRenderer.invoke('settings:getDbInfo'),
  },
  events: {
    onSyncTick: (cb) => {
      const handler = (_, status) => cb(status);
      ipcRenderer.on('sync:tick', handler);
      return () => ipcRenderer.removeListener('sync:tick', handler);
    },
    onNewImportant: (cb) => {
      const handler = (_, email) => cb(email);
      ipcRenderer.on('email:newImportant', handler);
      return () => ipcRenderer.removeListener('email:newImportant', handler);
    },
    onOpenEmail: (cb) => {
      const handler = (_, id) => cb(id);
      ipcRenderer.on('open-email', handler);
      return () => ipcRenderer.removeListener('open-email', handler);
    },
  },
});
