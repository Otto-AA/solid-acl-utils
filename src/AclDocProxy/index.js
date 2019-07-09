import AclDocProxyHandler from './AclDocProxyHandler'

/**
 * @typedef {object} AclDocProxyOptions
 * @property {boolean} [autoSave=true]
 */

/**
 * @param {AclDoc} doc
 * @param {function(doc: AclDoc): Promise<void>} saveDoc
 * @param {AclDocProxyOptions} options
 * @returns {any} proxyDoc
 */
export const createAclDocProxy = (doc, saveDoc, { autoSave = true } = {}) => {
  const proxyHandler = new AclDocProxyHandler({ saveDoc }, { autoSave })
  const proxyDoc = new Proxy(doc, proxyHandler)
  proxyHandler.setProxyDoc(proxyDoc)

  return proxyDoc
}
