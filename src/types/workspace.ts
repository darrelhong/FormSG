import { ClientSession, Document, Model } from 'mongoose'
import { WorkspaceDto } from 'shared/types/workspace'

import { IFormSchema } from './form'
import { IUserSchema } from './user'

type IWorkspace = {
  title: string
  admin: IUserSchema['_id']
  formIds: IFormSchema['_id'][]
}

export interface IWorkspaceSchema extends IWorkspace, Document {}

export interface IWorkspaceModel extends Model<IWorkspaceSchema> {
  getWorkspaces(admin: IUserSchema['_id']): Promise<WorkspaceDto[]>

  getWorkspace(
    workspaceId: IWorkspaceSchema['_id'],
    admin: IUserSchema['_id'],
  ): Promise<WorkspaceDto | null>

  createWorkspace(
    title: string,
    admin: IUserSchema['_id'],
  ): Promise<WorkspaceDto>

  updateWorkspaceTitle({
    title,
    workspaceId,
    admin,
  }: {
    title: string
    workspaceId: IWorkspaceSchema['_id']
    admin: IUserSchema['_id']
  }): Promise<WorkspaceDto | null>

  deleteWorkspace({
    workspaceId,
    admin,
    session,
  }: {
    workspaceId: IWorkspaceSchema['_id']
    admin: IUserSchema['_id']
    session?: ClientSession
  }): Promise<boolean>

  removeFormIdsFromAllWorkspaces({
    admin,
    formIds,
    session,
  }: {
    admin: IUserSchema['_id']
    formIds: IFormSchema['_id'][]
    session?: ClientSession
  }): Promise<void>

  removeFormIdsFromWorkspace({
    admin,
    workspaceId,
    formIds,
    session,
  }: {
    admin: IUserSchema['_id']
    workspaceId: IWorkspaceSchema['_id']
    formIds: IFormSchema['_id'][]
    session?: ClientSession
  }): Promise<void>

  addFormIdsToWorkspace({
    admin,
    workspaceId,
    formIds,
    session,
  }: {
    admin: IUserSchema['_id']
    workspaceId: IWorkspaceSchema['_id']
    formIds: IFormSchema['_id'][]
    session?: ClientSession
  }): Promise<void>
}
