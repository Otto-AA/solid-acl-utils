import AclDoc from 'solid-acl-parser/types/AclDoc';
import AclRule from 'solid-acl-parser/types/AclRule';
import { PermissionsCastable, permissionString } from 'solid-acl-parser/types/Permissions';
import Agents from 'solid-acl-parser/types/Agents';
import { Quad } from 'n3';

type AclDoc = import('solid-acl-parser/types/AclDoc').default
interface AddRuleOptions {
    subjectId?: string;
}

export interface AclDocProxy {
  readonly strict: boolean;
  readonly accessTo: string;
  readonly rules: Record<string, AclRule>;
  readonly otherQuads: Quad[];
  saveToPod(): Promise<void>
  addRule(firstVal: AclRule | PermissionsCastable, agents?: Agents, { subjectId }?: AddRuleOptions): Promise<this>
  addDefaultRule(firstVal: AclRule | PermissionsCastable, agents?: Agents, { subjectId }?: AddRuleOptions): Promise<this>
  hasRule(firstVal: AclRule | PermissionsCastable, agents?: Agents): boolean;
  hasDefaultRule(firstVal: AclRule | PermissionsCastable, agents?: Agents): boolean;
  getRuleBySubjectId(subjectId: string): AclRule | undefined;
  deleteRule(firstVal: AclRule | PermissionsCastable, agents?: Agents): Promise<this>;
  deleteBySubjectId(subjectId: string, firstVal?: AclRule | PermissionsCastable, agents?: Agents): Promise<this>;

  deleteAgents(agents: Agents): Promise<this>;
  deletePermissions(firstVal: PermissionsCastable, ...restPermissions: permissionString[]): Promise<this>;
  getPermissionsFor(agents: Agents): Permissions;
  getAgentsWith(firstVal: PermissionsCastable, ...restPermissions: permissionString[]): Agents;
  minimizeRules(): this;

  addOther(...other: Quad[]): Promise<this>;
  equals(other: AclDoc): boolean;
}