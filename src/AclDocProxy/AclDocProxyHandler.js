class AclDocProxyHandler {
  constructor ({ saveDoc }, options) {
    this.saveDoc = saveDoc
    this.options = options
    this._proxyDoc = null
  }

  /**
   * @description Define which proxyDoc should be returned instead of the doc itself
   * @param {any} proxyDoc
   */
  setProxyDoc (proxyDoc) {
    this._proxyDoc = proxyDoc
  }

  /**
   * @description proxy a get request to the AclDoc
   * @param {AclDoc} doc
   * @param {string} key
   * @returns {any|Promise<any>}
   */
  get (doc, key) {
    if (!AclDocProxyHandler._proxyMethods.includes(key) ||
        !this.options.autoSave) {
      return this._proxyReturnValue(doc, key)
    }

    if (key === AclDocProxyHandler._SAVE_DOC_KEY) {
      return () => this.saveDoc(doc)
    }

    return this._proxyWrap(doc, key)
  }

  /**
   * @param {AclDoc} doc
   * @param {string} key
   * @returns {Promise<any>}
   */
  _proxyWrap (doc, key) {
    return (...args) => {
      const returnValue = doc[key](...args)

      // Auto save and return with the return value from the original method
      return this.saveDoc(doc)
        .then(() => returnValue === doc ? this.proxyDoc : returnValue)
    }
  }

  /**
   * @param {AclDoc} doc
   * @param {string} key
   * @returns {any}
   */
  _proxyReturnValue (doc, key) {
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
