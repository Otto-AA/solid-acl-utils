import AclDocProxyHandler, { AclDocProxyOptions } from './AclDocProxyHandler'
import { AclDocProxy } from './AclDocProxy';

type AclDoc = import('solid-acl-parser/types/AclDoc').default

export const createAclDocProxy = (doc: AclDoc, saveDoc: (doc: AclDoc) => Promise<void>, { autoSave = true }: AclDocProxyOptions = {}) => {
  const proxyHandler = new AclDocProxyHandler({ saveDoc }, { autoSave })
  const proxyDoc = new Proxy<AclDoc>(doc, proxyHandler) as AclDocProxy
  proxyHandler.setProxyDoc(proxyDoc)

  return proxyDoc
}
