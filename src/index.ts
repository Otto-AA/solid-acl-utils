import SolidAclParser from 'solid-acl-parser'
import AclApi from './AclApi'

const exports = {
  AclApi,
  ...SolidAclParser
}

export default exports
