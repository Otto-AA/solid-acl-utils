type AclDoc = import('solid-acl-parser/types/AclDoc')


export interface AclDocProxy extends AclDoc {
  saveToPod: (doc: AclDoc) => Promise<void>
  // TODO
}