import { AclDocProxy } from './AclDocProxy';

type AclDoc = import('solid-acl-parser/types/AclDoc').default

export interface AclDocProxyOptions {
  autoSave?: boolean
}

class AclDocProxyHandler {
  private readonly saveDoc: (doc: AclDoc) => Promise<void>
  private readonly options: AclDocProxyOptions
  private _proxyDoc: AclDocProxy

  constructor ({ saveDoc }, options) {
    this.saveDoc = saveDoc
    this.options = options
    this._proxyDoc = null
  }

  /**
   * @description Define which proxyDoc should be returned instead of the doc itself
   */
  setProxyDoc (proxyDoc: AclDocProxy) {
    this._proxyDoc = proxyDoc
  }

  /**
   * @description proxy a get request to the AclDoc
   */
  get (doc: AclDoc, key: string) {
    if (key === AclDocProxyHandler._SAVE_DOC_KEY) {
      return () => this.saveDoc(doc).then(() => this.proxyDoc)
    }

    if (!AclDocProxyHandler._proxyMethods.includes(key) ||
        !this.options.autoSave) {
      return this._proxyReturnValue(doc, key)
    }

    return this._proxyWrap(doc, key)
  }
  _proxyWrap (doc: AclDoc, key: string) {
    return (...args: any) => {
      // @ts-ignore
      const returnValue = doc[key](...args)

      // Auto save and return with the return value from the original method
      return this.saveDoc(doc)
        .then(() => returnValue === doc ? this.proxyDoc : returnValue)
    }
  }

  _proxyReturnValue (doc: AclDoc, key: string) {
    if (typeof doc[key] !== 'function') {
      return doc[key]
    }

    return (...args) => {
      const returnValue = doc[key](...args)

      // Return proxy instead of doc
      return returnValue === doc ? this.proxyDoc : returnValue
    }
  }

  get proxyDoc () {
    if (!this._proxyDoc) {
      throw new Error('The AclDocProxyHandler did not receive a _proxyDoc doc')
    }
    return this._proxyDoc
  }

  static get _proxyMethods () {
    return [
      'addRule',
      'deleteRule',
      'deleteBySubjectId',
      'deleteAgents',
      'deletePermissions',
      'addOther',
      AclDocProxyHandler._SAVE_DOC_KEY
    ]
  }

  static get _SAVE_DOC_KEY () { return 'saveToPod' }
}

export default AclDocProxyHandler
