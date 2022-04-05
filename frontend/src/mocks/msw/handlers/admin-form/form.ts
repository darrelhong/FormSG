import cuid from 'cuid'
import { merge } from 'lodash'
import { rest } from 'msw'

import { AgencyId } from '~shared/types/agency'
import {
  BasicField,
  FieldCreateDto,
  FormFieldDto,
  TableFieldDto,
} from '~shared/types/field'
import {
  AdminFormDto,
  AdminFormViewDto,
  FormAuthType,
  FormColorTheme,
  FormId,
  FormResponseMode,
  FormStatus,
} from '~shared/types/form/form'
import { FormLogoState } from '~shared/types/form/form_logo'
import { DateString } from '~shared/types/generic'
import { StorageModeSubmissionMetadataList } from '~shared/types/submission'
import { UserDto } from '~shared/types/user'
import { insertAt, reorder } from '~shared/utils/immutable-array-fns'

let formFields: FormFieldDto[] = []

export const createMockForm = (
  props: Partial<AdminFormDto> = {},
): AdminFormViewDto => {
  return {
    form: merge(
      {
        _id: 'random-id' as FormId,
        isListed: true,
        startPage: {
          colorTheme: FormColorTheme.Blue,
          logo: { state: FormLogoState.Default },
        },
        endPage: {
          title: 'Thank you for filling out the form.',
          buttonText: 'Submit another form',
        },
        webhook: { url: '', isRetryEnabled: false },
        responseMode: FormResponseMode.Email,
        emails: ['test@example.com'],
        hasCaptcha: false,
        authType: FormAuthType.NIL,
        status: FormStatus.Public,
        inactiveMessage:
          'If you think this is a mistake, please contact the agency that gave you the form link!',
        submissionLimit: null,
        form_fields: formFields,
        form_logics: [],
        permissionList: [],
        title: 'Test form title',
        admin: {
          _id: 'fake-admin-id' as UserDto['_id'],
          email: 'admin@example.com',
          agency: {
            emailDomain: ['example.com'],
            _id: 'fake-agency-id' as AgencyId,
            shortName: 'eg',
            fullName: 'Example Agency',
            logo: '/path/to/logo',
            created: '2021-08-31T04:00:28.284Z' as DateString,
            lastModified: '2021-08-31T04:00:28.284Z' as DateString,
          },
          created: '2021-08-31T04:00:28.284Z' as DateString,
          lastAccessed: '2021-09-14T13:36:49.849Z' as DateString,
          updatedAt: '2021-08-31T04:00:28.287Z' as DateString,
        },
        created: '2021-08-31T04:05:18.241Z' as DateString,
        lastModified: '2021-09-14T07:23:56.581Z' as DateString,
      },
      props,
    ) as AdminFormDto,
  }
}

export const getAdminFormResponse = (
  props: Partial<AdminFormDto> = {},
  delay: number | 'infinite' | 'real' = 0,
): ReturnType<typeof rest['get']> => {
  return rest.get<AdminFormViewDto>(
    '/api/v3/admin/forms/:formId',
    (req, res, ctx) => {
      return res(
        ctx.delay(delay),
        ctx.status(200),
        ctx.json(
          createMockForm({ _id: req.params.formId as FormId, ...props }),
        ),
      )
    },
  )
}

export const getStorageSubmissionMetadataResponse = (
  props: Partial<StorageModeSubmissionMetadataList> = {},
  delay = 0,
) => {
  return rest.get<StorageModeSubmissionMetadataList>(
    '/api/v3/admin/forms/:formId/submissions/metadata',
    (req, res, ctx) => {
      return res(
        ctx.delay(delay),
        ctx.status(200),
        ctx.json<StorageModeSubmissionMetadataList>(
          merge(
            {
              count: 30,
              metadata: [],
            },
            props,
          ),
        ),
      )
    },
  )
}

export const createSingleField = (delay = 500) => {
  return rest.post<FieldCreateDto, { formId: string }, FormFieldDto>(
    '/api/v3/admin/forms/:formId/fields',
    (req, res, ctx) => {
      const newField = {
        ...req.body,
        _id: `random-id-${formFields.length}`,
      } as FormFieldDto
      if (req.body.fieldType === BasicField.Table) {
        // eslint-disable-next-line @typescript-eslint/no-extra-semi
        ;(newField as TableFieldDto).columns = req.body.columns.map((col) => ({
          ...col,
          _id: cuid(),
        }))
      }
      const newIndex = parseInt(
        req.url.searchParams.get('to') ?? `${formFields.length}`,
      )
      formFields = insertAt(formFields, newIndex, newField)
      return res(ctx.delay(delay), ctx.status(200), ctx.json(newField))
    },
  )
}

export const updateSingleField = (delay = 500) => {
  return rest.put<
    FormFieldDto,
    { formId: string; fieldId: string },
    FormFieldDto
  >('/api/v3/admin/forms/:formId/fields/:fieldId', (req, res, ctx) => {
    const index = formFields.findIndex(
      (field) => field._id === req.params.fieldId,
    )
    formFields.splice(index, 1, req.body)
    return res(ctx.delay(delay), ctx.status(200), ctx.json(req.body))
  })
}

export const reorderField = (delay = 500) => {
  return rest.post<
    Record<string, never>,
    { formId: string; fieldId: string },
    FormFieldDto[]
  >('/api/v3/admin/forms/:formId/fields/:fieldId/reorder', (req, res, ctx) => {
    const fromIndex = formFields.findIndex(
      (field) => field._id === req.params.fieldId,
    )
    formFields = reorder(
      formFields,
      fromIndex,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      parseInt(req.url.searchParams.get('to')!),
    )
    return res(ctx.delay(delay), ctx.status(200), ctx.json(formFields))
  })
}

export const duplicateField = (delay = 500) => {
  return rest.post<
    Record<string, never>,
    { formId: string; fieldId: string },
    FormFieldDto
  >(
    '/api/v3/admin/forms/:formId/fields/:fieldId/duplicate',
    (req, res, ctx) => {
      const fieldToCopyIndex = formFields.findIndex(
        (field) => field._id === req.params.fieldId,
      )
      const newField = {
        ...formFields[fieldToCopyIndex],
        _id: `random-id-${formFields.length}`,
      }
      formFields.push(newField)
      return res(ctx.delay(delay), ctx.status(200), ctx.json(newField))
    },
  )
}

export const deleteField = (delay = 500) => {
  return rest.delete<
    Record<string, never>,
    { formId: string; fieldId: string },
    FormFieldDto
  >('/api/v3/admin/forms/:formId/fields/:fieldId', (req, res, ctx) => {
    const fieldToDeleteIndex = formFields.findIndex(
      (field) => field._id === req.params.fieldId,
    )
    formFields.splice(fieldToDeleteIndex, 1)
    return res(ctx.delay(delay), ctx.status(200))
  })
}

export const deleteLogic = (delay?: number) => {
  return rest.delete(
    '/api/v3/admin/forms/:formId/logic/:logicId',
    (_req, res, ctx) => {
      return res(ctx.delay(delay), ctx.status(200))
    },
  )
}