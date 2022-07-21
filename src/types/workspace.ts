import { Document, Model } from 'mongoose'
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
  deleteWorkspace(
    workspaceId: IWorkspaceSchema['_id'],
    admin: IUserSchema['_id'],
    shouldDeleteForms: boolean,
  ): Promise<number>
}