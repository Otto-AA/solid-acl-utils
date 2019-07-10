import AclDocProxyHandler, { AclDocProxyOptions } from './AclDocProxyHandler'
import { AclDocProxy } from './AclDocProxy';

type AclDoc = import('solid-acl-parser/types/AclDoc').default

export const createAclDocProxy = (doc: AclDoc, saveDoc: (doc: AclDoc) => Promise<Response>, { autoSave = true }: AclDocProxyOptions = {}) => {
  if (typeof saveDoc !== 'function') {
    throw new Error('cannot create a proxy without a saveDoc function')
  }
  const proxyHandler = new AclDocProxyHandler(saveDoc, { autoSave })
  const proxyDoc: AclDocProxy = new Proxy<AclDoc>(doc, proxyHandler) as any
  proxyHandler.setProxyDoc(proxyDoc)

  return proxyDoc
}
